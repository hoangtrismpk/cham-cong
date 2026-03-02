import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getWorkSettings } from '@/app/actions/settings'
import { sendPushToTokens } from '@/lib/firebase-admin'

const MESSAGES = [
    { title: '⏳ Sắp về rồi đồng âm ơi!', body: 'Còn 30 phút nữa là tan ca. Chốt nhanh chiếc báo cáo ngày để yên tâm xách ba lô lên và đi nào!' },
    { title: '🔋 Pin yếu, cần sạc!', body: 'Bận rộn cả ngày vất vả rồi. Dành 2 phút review chiến tích hôm nay trước khi sập nguồn nhé!' },
    { title: '📝 Khai báo y... ý lộn!', body: 'Khai báo công việc hôm nay đã xong chưa idol? Cập nhật lẹ để sếp còn thấy sự chăm chỉ này!' },
    { title: '🚨 Bíp bíp bíp!', body: 'Hệ thống phát hiện một người có nhan sắc chưa nộp báo cáo. Hãy hoàn thành ngay kẻo sếp réo tên!' },
    { title: '🏃 Lên đồ chuẩn bị zề!', body: 'Nhưng khoan... dừng khoảng chừng là 2s để gửi cái báo cáo chốt hạ ngày hôm nay đã nghen!' },
    { title: '🌟 30 phút cuối cùng!', body: 'Khoảng thời gian êm đềm còn lại của ngày, hãy lấp đầy nó bằng một chiếc báo cáo xinh xẻo.' },
    { title: '🏆 Finish line!', body: 'Đích đến ngay trước mắt rồi. Nộp báo cáo chốt hạ một ngày làm việc hiệu quả thôi nào!' }
]

export async function GET(request: Request) {
    try {
        // 1. Verify Authorization Header (cron secret)
        const authHeader = request.headers.get('authorization')
        const CRON_SECRET = process.env.CRON_SECRET

        if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createAdminClient()

        // 2. Identify the logical "Today" based on Vietnam time
        const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
        const today = vnDateStr

        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
        const currentTimeParts = formatter.formatToParts(new Date())
        const currentHour = parseInt(currentTimeParts.find(p => p.type === 'hour')?.value || '0', 10)
        const currentMinute = parseInt(currentTimeParts.find(p => p.type === 'minute')?.value || '0', 10)
        const currentTotalMinutes = currentHour * 60 + currentMinute

        // 3. Get global work settings to get the 'work_end_time' and check time FIRST
        // This saves API calls to the database if it's not the right time
        const settings = await getWorkSettings()
        const [endHourStr, endMinStr] = (settings.work_end_time || '17:30').split(':')
        const endHour = parseInt(endHourStr, 10)
        const endMin = parseInt(endMinStr, 10)
        const workEndTotalMinutes = endHour * 60 + endMin

        // Target: Remind 30 minutes before end time.
        const targetTotalMinutes = workEndTotalMinutes - 30

        // Check if the current time coincides with the reminder time
        // We trigger cron every 5 mins. Let's allow a small window (+/- 5 mins)
        const timeDiff = Math.abs(currentTotalMinutes - targetTotalMinutes)
        const isTimeWindow = timeDiff <= 5

        if (!isTimeWindow) {
            return NextResponse.json({
                success: true,
                message: 'Not the right time for daily reminder',
                currentVNTimes: `${currentHour}:${currentMinute}`,
                targetEndTime: settings.work_end_time
            })
        }

        // 4. Get all active users with push enabled (only if it IS the right time)
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('status', 'active')
            .eq('push_enabled', true)

        if (userError) throw userError
        if (!users || users.length === 0) {
            return NextResponse.json({ success: true, message: 'No active users found for daily reminder' })
        }

        // Get tokens for these users
        const { data: fcmTokens } = await supabase
            .from('fcm_tokens')
            .select('user_id, token')
            .in('user_id', users.map(u => u.id))

        if (!fcmTokens || fcmTokens.length === 0) {
            return NextResponse.json({ success: true, message: 'No FCM tokens found for active users' })
        }

        const tokensToNotify: string[] = []
        let notifiedCount = 0

        for (const user of users) {
            // 5. Check if user is on full-day leave today
            const { data: leaves } = await supabase
                .from('leave_requests')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .eq('leave_type', 'full_day')
                .lte('start_date', today)
                .gte('end_date', today)
                .limit(1)

            if (leaves && leaves.length > 0) {
                continue // Skip: On full-day leave
            }

            // 6. Check if user has already submitted a report today
            const { data: reports } = await supabase
                .from('work_reports')
                .select('id')
                .eq('user_id', user.id)
                .eq('report_date', today)
                .in('report_type', ['daily', 'makeup'])
                .limit(1)

            if (reports && reports.length > 0) {
                continue // Skip: Already reported
            }

            // Process tokens
            const userTokens = fcmTokens.filter(ft => ft.user_id === user.id)
            if (userTokens.length > 0) {
                userTokens.forEach(ft => tokensToNotify.push(ft.token))
                notifiedCount++
            }
        }

        if (tokensToNotify.length === 0) {
            return NextResponse.json({ success: true, message: 'No eligible users to notify right now' })
        }

        // 7. Send push notification
        const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

        const pushResult = await sendPushToTokens(
            tokensToNotify,
            {
                title: randomMsg.title,
                body: randomMsg.body
            },
            {
                url: '/reports'
            }
        )

        // 8. Cleanup invalid tokens (if any)
        const invalidTokens = pushResult.results
            .filter(r => !r.success && (r.error === 'UNREGISTERED' || r.error === 'INVALID_ARGUMENT'))
            .map(r => r.token)

        if (invalidTokens.length > 0) {
            await supabase.from('fcm_tokens').delete().in('token', invalidTokens)
        }

        return NextResponse.json({
            success: true,
            message: `Sent daily reminder to ${notifiedCount} users (${tokensToNotify.length} devices)`,
            pushResult: {
                successCount: pushResult.successCount,
                failureCount: pushResult.failureCount
            }
        })

    } catch (error: any) {
        console.error('Daily reminder cron error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

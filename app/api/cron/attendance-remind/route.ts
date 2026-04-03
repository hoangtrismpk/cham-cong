import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushToTokens } from '@/lib/firebase-admin'

const IN_MESSAGES = [
    { title: '🌞 Sáng rồi đồng âm ơi!', body: 'Đừng quên chấm công vào để bắt đầu một ngày mới đầy năng lượng nhé!' },
    { title: '⏰ Tít tít tít!', body: 'Dù có bận rộn tới mấy cũng nhớ bấm vào nút chấm công nha sếp!' },
    { title: '🚀 Lên đồ đi làm thôi!', body: 'Chấm công điểm danh cho ngày làm việc rực rỡ nào!' }
]

const OUT_MESSAGES = [
    { title: '🌃 Tan ca rồi chốt hạ thôi!', body: 'Nhớ chấm công ra trước khi ròi công ty về nhà nghỉ ngơi nhé bạn ơi!' },
    { title: '👋 Bye bye văn phòng!', body: 'Chưa chấm công ra là coi như một ngày chưa hoàn hảo. Bấm ngay nhé!' },
    { title: '🛋️ Về nhà nào!', body: 'Nhớ check-out trên hệ thống trước khi ngả mộng trên chiếc giường lười biếng nha!' }
]

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        const CRON_SECRET = process.env.CRON_SECRET

        if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const url = new URL(request.url)
        const type = url.searchParams.get('type') // 'check_in' or 'check_out'

        if (type !== 'check_in' && type !== 'check_out') {
            return NextResponse.json({ success: false, error: 'Invalid type parameter. Expected check_in or check_out' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
        const today = vnDateStr

        // Get all active users with push enabled
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('status', 'active')
            .eq('push_enabled', true)

        if (userError) throw userError
        if (!users || users.length === 0) {
            return NextResponse.json({ success: true, message: 'No active users found for reminder' })
        }

        // Get FCM tokens
        const { data: fcmTokens } = await supabase
            .from('fcm_tokens')
            .select('user_id, token')
            .in('user_id', users.map(u => u.id))

        if (!fcmTokens || fcmTokens.length === 0) {
            return NextResponse.json({ success: true, message: 'No FCM tokens found' })
        }

        const tokensToNotify: string[] = []
        let notifiedCount = 0

        for (const user of users) {
            // Check if user is on full-day leave today
            const { data: leaves } = await supabase
                .from('leave_requests')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .eq('leave_type', 'full_day')
                .lte('start_date', today)
                .gte('end_date', today)
                .limit(1)

            if (leaves && leaves.length > 0) continue

            // Check attendance logs
            const { data: attLogs } = await supabase
                .from('attendance_logs')
                .select('check_in_time, check_out_time')
                .eq('user_id', user.id)
                .eq('date', today)
                .limit(1)

            const hasCheckedIn = attLogs && attLogs.length > 0 && attLogs[0].check_in_time
            const hasCheckedOut = attLogs && attLogs.length > 0 && attLogs[0].check_out_time

            if (type === 'check_in' && hasCheckedIn) continue
            // if we are warning for check-out, we shouldn't warn if they never checked in to start with maybe? Or maybe yes.
            // But if they have ALREADY checked out, skip.
            if (type === 'check_out' && hasCheckedOut) continue

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

        const msgPool = type === 'check_in' ? IN_MESSAGES : OUT_MESSAGES
        const randomMsg = msgPool[Math.floor(Math.random() * msgPool.length)]

        const pushResult = await sendPushToTokens(
            tokensToNotify,
            {
                title: randomMsg.title,
                body: randomMsg.body
            },
            {
                url: '/attendance'
            }
        )

        // Cleanup invalid tokens
        const invalidTokens = pushResult.results
            .filter(r => !r.success && (r.error === 'UNREGISTERED' || r.error === 'INVALID_ARGUMENT'))
            .map(r => r.token)

        if (invalidTokens.length > 0) {
            await supabase.from('fcm_tokens').delete().in('token', invalidTokens)
        }

        return NextResponse.json({
            success: true,
            message: `Sent ${type} reminder to ${notifiedCount} users (${tokensToNotify.length} devices)`,
            pushResult: {
                successCount: pushResult.successCount,
                failureCount: pushResult.failureCount
            }
        })

    } catch (error: any) {
        console.error('Attendance cron error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

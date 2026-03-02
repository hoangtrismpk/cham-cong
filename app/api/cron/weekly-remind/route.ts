import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushToTokens } from '@/lib/firebase-admin'

const MESSAGES = [
    { title: '🚀 Tuần mới rực rỡ!', body: 'Lên dây cót tinh thần nào! Nhớ tổng kết báo cáo tuần trước và set mục tiêu cho tuần này nhé.' },
    { title: '☕ Cafe sáng thứ 2', body: 'Nhâm nhi ly cafe và dành 5 phút làm báo cáo thôi. Chúc bạn tuần mới năng suất x200%!' },
    { title: '📅 Ác mộng mang tên Thứ 2?', body: 'Đừng lo! Nghe nói nộp báo cáo tuần sớm thì cả tuần chạy deadline bao mượt. Thử xem linh không nha!' },
    { title: '⚡ Nạp năng lượng!', body: 'Đầu tuần đầy nhiệt huyết! Khởi động nhẹ nhàng bằng một chiếc báo cáo sương sương nhé.' },
    { title: '🎯 Mục tiêu tuần này là?', body: 'Vạch lá tìm kim... à nhầm, vạch đường cho công việc tuần mới và nốt lại chiến tích tuần cũ nào!' },
    { title: '🌈 Chào tuần mới!', body: 'Thứ 2 không có gì đáng sợ nếu ta update công việc đúng hạn. Vào việc thôi người anh em!' },
    { title: '💼 Chạy số thôi!', body: 'Reset KPI, khởi động cỗ máy! Chúc bạn tuần mới thuận buồm xuôi gió và vượt mọi KPI.' }
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

        // 2. Identify the logical "Today"
        // We do *not* check for the 08:00 interval since Vercel's Cron definition
        // syntax (`0 8 * * 1`) inherently enforces that the call only happens at 08h.
        // And we don't care if they have reported today (since it's a weekly planning report)

        // 3. Get all users with FCM tokens and push enabled
        // 3. Get all active users with push enabled
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('status', 'active')
            .eq('push_enabled', true)

        if (userError) throw userError
        if (!users || users.length === 0) {
            return NextResponse.json({ success: true, message: 'No active users found for weekly reminder' })
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

        // 4. Send push notification
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

        // 5. Cleanup invalid tokens (if any)
        const invalidTokens = pushResult.results
            .filter(r => !r.success && (r.error === 'UNREGISTERED' || r.error === 'INVALID_ARGUMENT'))
            .map(r => r.token)

        if (invalidTokens.length > 0) {
            await supabase.from('fcm_tokens').delete().in('token', invalidTokens)
        }

        return NextResponse.json({
            success: true,
            message: `Sent weekly reminder to ${notifiedCount} users (${tokensToNotify.length} devices)`,
            pushResult: {
                successCount: pushResult.successCount,
                failureCount: pushResult.failureCount
            }
        })

    } catch (error: any) {
        console.error('Weekly reminder cron error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

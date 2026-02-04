
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12.0.0'

// 1. Cấu hình Service Account (Lấy từ Environment Variable hoặc Hardcode tạm thời để test)
// Tốt nhất là lưu trong Supabase Secrets: FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

Deno.serve(async (req) => {
    try {
        // 2. Kết nối Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 3. Tính toán thời gian: Tìm ca làm việc bắt đầu trong 5-10 phút tới
        // Mặc định Deno/Supabase dùng giờ UTC, ta cần chuyển sang giờ VN (UTC+7)
        const utcNow = new Date()
        const now = new Date(utcNow.getTime() + 7 * 60 * 60000) // Chuyển sang giờ VN

        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000)
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000)

        // Lấy giờ phút dạng HH:mm
        const startTimeStart = fiveMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5)
        const startTimeEnd = tenMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5)

        // Sử dụng ngày của now (giờ VN)
        const targetDateStr = now.toISOString().split('T')[0]

        console.log(`UTC Time: ${utcNow.toISOString()}`)
        console.log(`VN Time: ${now.toISOString()}`)
        console.log(`Checking shifts between ${startTimeStart} and ${startTimeEnd} on ${targetDateStr}`)

        // 4. Tìm các ca làm việc sắp đến giờ
        const { data: shifts, error: shiftError } = await supabase
            .from('work_schedules')
            .select('id, user_id, start_time, work_date')
            .eq('work_date', targetDateStr)
            .gte('start_time', startTimeStart)
            .lte('start_time', startTimeEnd)

        if (shiftError) throw shiftError

        if (!shifts || shifts.length === 0) {
            return new Response(JSON.stringify({ message: 'No shifts found soon' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        console.log(`Found ${shifts.length} shifts starting soon.`)

        const results = []

        // 5. Gửi thông báo cho từng nhân viên
        for (const shift of shifts) {
            // 5a. Lấy FCM Token của user
            const { data: tokens } = await supabase
                .from('fcm_tokens')
                .select('token')
                .eq('user_id', shift.user_id)

            if (!tokens || tokens.length === 0) continue

            const fcmTokens = tokens.map(t => t.token)

            // 5b. Gửi thông báo qua Firebase
            const message = {
                notification: {
                    title: '⏰ Sắp đến giờ làm việc!',
                    body: `Ca làm của bạn bắt đầu lúc ${shift.start_time}. Hãy mở app để chấm công ngay!`,
                },
                data: {
                    url: '/', // Mở về trang chủ
                    shiftId: shift.id
                },
                tokens: fcmTokens,
            }

            try {
                const response = await admin.messaging().sendEachForMulticast(message)
                results.push({ user_id: shift.user_id, success: response.successCount, failure: response.failureCount })
                console.log(`Sent to user ${shift.user_id}: ${response.successCount} success`)
            } catch (err) {
                console.error(`Error sending to user ${shift.user_id}:`, err)
            }
        }

        return new Response(JSON.stringify({ message: 'Check complete', results }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})

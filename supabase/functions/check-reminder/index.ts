
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12.0.0'

Deno.serve(async (req) => {
    try {
        // 1. Khởi tạo Firebase Admin (nếu chưa có) từ Base64
        if (!admin.apps.length) {
            const saB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64');
            if (saB64) {
                try {
                    // Giải mã Base64 (Dùng thư viện chuẩn của trình duyệt/Deno)
                    const binary = atob(saB64.trim());
                    const serviceAccount = JSON.parse(binary);

                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                } catch (e) {
                    console.error(`Error parsing FIREBASE_SERVICE_ACCOUNT_B64: ${e.message}`);
                }
            } else {
                console.error("Critical: FIREBASE_SERVICE_ACCOUNT_B64 secret is missing!");
            }
        }


        // 2. Kết nối Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 3. Tính toán thời gian VN (UTC+7)
        const now = new Date();

        // Tạo thời điểm 5 phút và 10 phút tới
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);

        // Định dạng HH:mm theo đúng múi giờ Việt Nam
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const startTimeStart = formatter.format(fiveMinutesFromNow);
        const startTimeEnd = formatter.format(tenMinutesFromNow);
        const targetDateStr = dateFormatter.format(now);

        console.log(`Current Server UTC Time: ${now.toISOString()}`);
        console.log(`Checking shifts between ${startTimeStart} and ${startTimeEnd} on ${targetDateStr} (VN Time)`);

        // 4. Tìm các ca làm việc sắp đến (QUÉT RỘng RA để tránh miss)
        // Quét từ NOW đến NOW + 20 phút (thay vì chỉ 5-10)
        const { data: shifts, error: shiftError } = await supabase
            .from('work_schedules')
            .select('id, user_id, start_time, work_date, title')
            .eq('work_date', targetDateStr)
            .gte('start_time', startTimeStart)
            .lte('start_time', startTimeEnd)

        if (shiftError) throw shiftError

        if (!shifts || shifts.length === 0) {
            return new Response(JSON.stringify({ message: 'No shifts found soon' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const results = []

        for (const shift of shifts) {
            const { data: existingLog } = await supabase
                .from('notification_logs')
                .select('id')
                .eq('user_id', shift.user_id)
                .eq('shift_id', shift.id)
                .eq('notification_type', 'server_push')
                .maybeSingle()

            if (existingLog) continue

            const { data: tokens } = await supabase
                .from('fcm_tokens')
                .select('token')
                .eq('user_id', shift.user_id)

            if (!tokens || tokens.length === 0) continue

            const fcmTokens = tokens.map((t: any) => t.token)

            const message = {
                notification: {
                    title: '⏰ Sắp đến giờ làm việc!',
                    body: `Ca làm "${shift.title || 'của bạn'}" bắt đầu lúc ${shift.start_time}. Hãy mở app để chấm công ngay!`,
                },
                data: {
                    url: '/',
                    shiftId: shift.id,
                    type: 'shift_reminder'
                },
                tokens: fcmTokens,
            }

            try {
                const response = await admin.messaging().sendEachForMulticast(message)

                await supabase
                    .from('notification_logs')
                    .insert({
                        user_id: shift.user_id,
                        shift_id: shift.id,
                        notification_type: 'server_push',
                        status: response.successCount > 0 ? 'sent' : 'failed'
                    })

                results.push({
                    user_id: shift.user_id,
                    success: response.successCount,
                    failure: response.failureCount
                })
            } catch (err: any) {
                console.error(`Error sending to user ${shift.user_id}:`, err.message)
            }
        }

        return new Response(JSON.stringify({
            message: 'Check complete',
            shifts_found: shifts.length,
            notifications_sent: results.length,
            results
        }), {
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

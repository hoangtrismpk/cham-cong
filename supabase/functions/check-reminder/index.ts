
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12.0.0'

// Constants
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const MAX_REMINDER_WINDOW_MINUTES = 30; // Max possible window to fetch schedules
const LOG_PREFIX = '[check-reminder]';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs: string[] = [];
    const log = (msg: string) => {
        const entry = `${LOG_PREFIX} ${msg}`;
        console.log(entry);
        logs.push(entry);
    };

    try {
        // 1. Initialize Firebase Admin
        if (!admin.apps.length) {
            const saB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64');
            if (!saB64) {
                log('❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT_B64 is missing');
                return new Response(JSON.stringify({ error: 'Missing FIREBASE_SERVICE_ACCOUNT_B64', logs }), { status: 500 });
            }

            try {
                // Robust Base64 cleaning
                let cleanedB64 = saB64.trim().replace(/\s/g, '');

                // Fix potential cutting off/padding issues
                while (cleanedB64.length % 4 !== 0) {
                    cleanedB64 += '=';
                }

                // Try to decode
                const binaryString = atob(cleanedB64);
                const serviceAccount = JSON.parse(binaryString);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                log('✅ Firebase Admin initialized');
            } catch (e) {
                log(`❌ Firebase init failed: ${e.message}`);
                return new Response(JSON.stringify({ error: `Firebase init failed: ${e.message}`, logs }), { status: 500 });
            }
        }

        // 2. Connect to Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Time Windows
        const now = new Date();
        const vnNow = new Date(now.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
        const dayOfWeek = vnNow.getDay();

        const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });
        const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

        const currentTimeVN = timeFormatter.format(now);
        const windowEnd = new Date(now.getTime() + MAX_REMINDER_WINDOW_MINUTES * 60000);
        const windowEndTimeVN = timeFormatter.format(windowEnd);
        const todayStr = dateFormatter.format(now);
        const viewDate = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);

        log(`🕒 Time: ${currentTimeVN} -> ${windowEndTimeVN} | Date: ${todayStr} (DOW: ${dayOfWeek})`);

        // 4. Fetch Core Data
        const [{ data: sysSettings }, { data: overrides }, { data: templates }, { data: tokenUsers }, { data: profileSettings }] = await Promise.all([
            supabase.from('system_settings').select('key, value').in('key', ['work_start_time', 'work_end_time', 'work_off_days']),
            supabase.from('work_schedules').select('user_id, start_time, end_time, title, id').eq('work_date', todayStr),
            supabase.from('employee_default_schedules').select('employee_id, custom_start_time, custom_end_time, shift_type').eq('day_of_week', dayOfWeek).eq('is_template', true).neq('shift_type', 'off'),
            supabase.from('fcm_tokens').select('user_id, token'),
            supabase.from('profiles').select('id, clock_in_remind_minutes, clock_out_remind_mode, clock_out_remind_minutes')
        ]);

        let globalStart = '08:30', globalEnd = '17:30', globalOff = [0, 6];
        sysSettings?.forEach(s => {
            const val = JSON.parse(s.value);
            if (s.key === 'work_start_time') globalStart = val;
            if (s.key === 'work_end_time') globalEnd = val;
            if (s.key === 'work_off_days') globalOff = val;
        });

        if (!tokenUsers?.length) return new Response(JSON.stringify({ message: 'No tokens', logs }));

        const userTokensMap = tokenUsers.reduce((acc, t) => {
            if (!acc[t.user_id]) acc[t.user_id] = [];
            acc[t.user_id].push(t.token);
            return acc;
        }, {} as Record<string, string[]>);

        // Build per-user settings map
        const userSettingsMap = (profileSettings || []).reduce((acc, p) => {
            acc[p.id] = {
                clockInMins: p.clock_in_remind_minutes ?? 5,
                clockOutMode: p.clock_out_remind_mode ?? 'before',
                clockOutMins: p.clock_out_remind_minutes ?? 5,
            };
            return acc;
        }, {} as Record<string, { clockInMins: number; clockOutMode: string; clockOutMins: number }>);

        const isOffDay = globalOff.includes(dayOfWeek);
        const targets: any[] = [];

        // 5. Evaluate Schedules
        for (const userId of Object.keys(userTokensMap)) {
            let startT: string | null = null, endT: string | null = null, title = 'Ca Làm Việc', shiftId: string | null = null;

            const override = overrides?.find(o => o.user_id === userId);
            if (override) {
                startT = override.start_time;
                endT = override.end_time;
                title = override.title || 'Ca Làm Việc';
                shiftId = override.id;
            } else {
                const template = templates?.find(t => t.employee_id === userId);
                if (template) {
                    startT = template.custom_start_time || globalStart;
                    endT = template.custom_end_time || globalEnd;
                    title = template.shift_type === 'full' ? 'Cả Ngày' : 'Ca Làm Việc';
                } else if (!isOffDay) {
                    startT = globalStart;
                    endT = globalEnd;
                }
            }

            // Get user's personal remind settings
            const settings = userSettingsMap[userId] || { clockInMins: 5, clockOutMode: 'before', clockOutMins: 5 };

            // Calculate personalized time windows for this user
            const clockInWindowEnd = new Date(now.getTime() + settings.clockInMins * 60000);
            const clockInWindowEndTime = timeFormatter.format(clockInWindowEnd);

            // Remind Clock-In: shift starts within user's remind window
            if (startT && startT >= currentTimeVN && startT <= clockInWindowEndTime) {
                targets.push({ userId, tokens: userTokensMap[userId], time: startT, title, type: 'clock_in', shiftId });
            }
            // Remind Clock-Out based on user's mode preference
            if (endT) {
                if (settings.clockOutMode === 'before') {
                    // Remind X minutes BEFORE end time
                    const clockOutWindowEnd = new Date(now.getTime() + settings.clockOutMins * 60000);
                    const clockOutWindowEndTime = timeFormatter.format(clockOutWindowEnd);
                    if (endT >= currentTimeVN && endT <= clockOutWindowEndTime) {
                        targets.push({ userId, tokens: userTokensMap[userId], time: endT, title, type: 'clock_out', shiftId });
                    }
                } else {
                    // 'after' mode: Remind X minutes AFTER end time
                    // FIX: Parse end time relative to VN timezone by using vnNow date components
                    const [endH, endM] = endT.split(':').map(Number);
                    const endTimeDate = new Date(vnNow);
                    endTimeDate.setHours(endH, endM, 0, 0);
                    const reminderAfterMs = settings.clockOutMins * 60000;
                    const reminderAfterDate = new Date(endTimeDate.getTime() + reminderAfterMs);
                    const reminderAfterTime = `${String(reminderAfterDate.getHours()).padStart(2, '0')}:${String(reminderAfterDate.getMinutes()).padStart(2, '0')}`;
                    // Trigger if current time is between end_time and reminder_after_time
                    if (currentTimeVN >= endT && currentTimeVN <= reminderAfterTime) {
                        targets.push({ userId, tokens: userTokensMap[userId], time: endT, title, type: 'clock_out', shiftId });
                    }
                }
            }
        }

        log(`🎯 Targets found: ${targets.length}`);

        // 6. Send
        for (const target of targets) {
            // Dedup - FIX: use .is() for null shift_id instead of .eq()
            let dedupQuery = supabase
                .from('notification_logs')
                .select('id')
                .eq('user_id', target.userId)
                .eq('notification_type', `server_push_${target.type}`)
                .gte('sent_at', `${todayStr}T00:00:00Z`);

            if (target.shiftId) {
                dedupQuery = dedupQuery.eq('shift_id', target.shiftId);
            } else {
                dedupQuery = dedupQuery.is('shift_id', null);
            }

            const { data: exists } = await dedupQuery.maybeSingle();

            if (exists) continue;

            const isIn = target.type === 'clock_in';
            // Determine the Supabase project URL to build an absolute image URL
            const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
            // Extract app origin from NEXT_PUBLIC_SITE_URL env or derive from Supabase URL
            const appOrigin = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://cham-cong-fhb.vercel.app';

            const message = {
                data: {
                    title: isIn ? '⏰ Sắp đến giờ làm việc!' : '🏠 Hết giờ làm việc rồi!',
                    body: isIn
                        ? `Ca "${target.title}" ngày ${viewDate} bắt đầu lúc ${target.time}. Đừng quên chấm công vào nhé!`
                        : `Ca "${target.title}" ngày ${viewDate} kết thúc lúc ${target.time}. Đừng quên chấm công ra trước khi về nhé!`,
                    url: '/',
                    // type tells the Service Worker to show rich notification (image + action buttons)
                    type: isIn ? 'clock_in_reminder' : 'clock_out_reminder',
                    shiftId: target.shiftId || '',
                    // Banner image — hosted in /public, accessible via app origin
                    image: `${appOrigin}/clockin.jpg`
                },
                tokens: target.tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            log(`📤 Sent ${target.type} to ${target.userId}: ✅${response.successCount} ❌${response.failureCount}`);

            await supabase.from('notification_logs').insert({
                user_id: target.userId,
                shift_id: target.shiftId,
                notification_type: `server_push_${target.type}`,
                status: response.successCount > 0 ? 'sent' : 'failed',
                sent_at: new Date().toISOString()
            });
        }

        return new Response(JSON.stringify({ message: 'Success', notifications: targets.length, logs }));

    } catch (e: any) {
        log(`❌ ERROR: ${e.message}`);
        return new Response(JSON.stringify({ error: e.message, logs }), { status: 500 });
    }
});

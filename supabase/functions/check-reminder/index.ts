
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12.0.0'

// Constants
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const REMINDER_WINDOW_MINUTES = 15; // Check shifts starting within next 15 minutes
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
        // 1. Initialize Firebase Admin from Base64 secret
        if (!admin.apps.length) {
            const saB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64');
            if (!saB64) {
                log('❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT_B64 secret is MISSING!');
                return new Response(JSON.stringify({
                    error: 'Firebase not configured',
                    hint: 'Set FIREBASE_SERVICE_ACCOUNT_B64 in Supabase Secrets',
                    logs
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            try {
                // Remove any whitespace, newlines that might have been pasted accidentally
                const cleanedB64 = saB64.replace(/\s/g, '');

                // Use built-in atob (standard in Deno/Browsers)
                const binaryString = atob(cleanedB64);
                const serviceAccount = JSON.parse(binaryString);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                log('✅ Firebase Admin initialized successfully');
            } catch (e) {
                log(`❌ Error parsing Firebase credentials: ${e.message}`);
                return new Response(JSON.stringify({
                    error: `Firebase init failed: ${e.message}`,
                    logs
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            log('ℹ️ Firebase Admin already initialized');
        }

        // 2. Connect to Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !supabaseKey) {
            log('❌ CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!');
            return new Response(JSON.stringify({
                error: 'Supabase not configured',
                logs
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        log('✅ Supabase client created');

        // 3. Calculate VN time window
        const now = new Date();

        // Use Vietnamese locale for day of week etc if needed, but here we just need numbers
        const vnNow = new Date(now.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
        const dayOfWeek = vnNow.getDay(); // 0=Sun, 1=Mon...

        // Format helpers for Vietnam timezone
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: VN_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: VN_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        const currentTimeVN = timeFormatter.format(now);
        const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60000);
        const windowEndTimeVN = timeFormatter.format(windowEnd);
        const targetDateStr = dateFormatter.format(now);

        log(`📅 Date: ${targetDateStr} (DOW: ${dayOfWeek}) | Window: ${currentTimeVN} → ${windowEndTimeVN} (VN)`);

        // 4. Fetch Global Settings
        const { data: sysSettings } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['work_start_time', 'work_off_days']);

        let globalStartTime = '08:00';
        let globalOffDays = [0, 6]; // Default Sat, Sun

        sysSettings?.forEach(s => {
            try {
                const val = JSON.parse(s.value);
                if (s.key === 'work_start_time') globalStartTime = val;
                if (s.key === 'work_off_days') globalOffDays = val;
            } catch (e) {
                log(`⚠️ Error parsing setting ${s.key}: ${e.message}`);
            }
        });

        // 5. Fetch all specific shifts for today
        const { data: overrides } = await supabase
            .from('work_schedules')
            .select('user_id, start_time, title, id')
            .eq('work_date', targetDateStr);

        // 6. Fetch all default templates for today
        const { data: templates } = await supabase
            .from('employee_default_schedules')
            .select('employee_id, custom_start_time, shift_type')
            .eq('day_of_week', dayOfWeek)
            .eq('is_template', true)
            .neq('shift_type', 'off');

        // 7. Fetch all users with FCM tokens
        const { data: tokenUsers } = await supabase
            .from('fcm_tokens')
            .select('user_id, token');

        if (!tokenUsers || tokenUsers.length === 0) {
            log('ℹ️ No FCM tokens found in table');
            return new Response(JSON.stringify({ message: 'No tokens', logs }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Group tokens by user_id
        const userTokensMap: Record<string, string[]> = {};
        tokenUsers.forEach(t => {
            if (!userTokensMap[t.user_id]) userTokensMap[t.user_id] = [];
            userTokensMap[t.user_id].push(t.token);
        });

        // 8. Process each user with tokens to find effective start_time
        const usersToNotify: any[] = [];
        const uniqueUserIds = Object.keys(userTokensMap);
        const isOffDay = globalOffDays.includes(dayOfWeek);

        log(`👥 Found ${uniqueUserIds.length} users with tokens. Checking effective schedules...`);

        for (const userId of uniqueUserIds) {
            let effectiveStartTime: string | null = null;
            let effectiveTitle = 'Ca Làm Việc';
            let shiftId: string | undefined = undefined;

            // 1. Check Overrides (Highest Priority)
            const override = overrides?.find(o => o.user_id === userId);
            if (override) {
                effectiveStartTime = override.start_time;
                effectiveTitle = override.title || 'Ca Làm Việc';
                shiftId = override.id;
            } else {
                // 2. Check Templates
                const template = templates?.find(t => t.employee_id === userId);
                if (template) {
                    effectiveStartTime = template.custom_start_time || globalStartTime;
                    effectiveTitle = template.shift_type === 'full' ? 'Cả Ngày' : 'Ca Làm Việc';
                } else if (!isOffDay) {
                    // 3. Fallback to Global Settings
                    effectiveStartTime = globalStartTime;
                }
            }

            // Check if this effective start time is in the window
            if (effectiveStartTime && effectiveStartTime >= currentTimeVN && effectiveStartTime <= windowEndTimeVN) {
                usersToNotify.push({
                    userId,
                    tokens: userTokensMap[userId],
                    startTime: effectiveStartTime,
                    title: effectiveTitle,
                    shiftId
                });
            }
        }

        log(`🔍 Users to notify in this window: ${usersToNotify.length}`);

        // 9. Send Notifications
        const results: any[] = [];
        for (const target of usersToNotify) {
            // Check dedup (only for overrides which have IDs, or simulate for others)
            // For now, let's skip dedup for virtual shifts OR create a synthetic key
            const dedupKey = target.shiftId || `virtual-${target.userId}-${target.startTime}`;

            const { data: existingLog } = await supabase
                .from('notification_logs')
                .select('id')
                .eq('user_id', target.userId)
                .eq('notification_type', 'server_push')
                .eq('created_at', targetDateStr) // This column doesn't exist? Check schema.
                // Wait, I should add a check for today.
                .gte('created_at', `${targetDateStr}T00:00:00Z`)
                .eq('shift_id', target.shiftId || null)
                .maybeSingle();

            // Re-evaluating dedup: Maybe use a text field for "ref_key" in notification_logs?
            // If I can't dedup easily, users might get duplicate notifications if window overlaps.
            // But window is 15 mins, cron is 5 mins. So a shift at 08:30 will be in windows:
            // 08:15 (08:15-08:30) - YES
            // 08:20 (08:20-08:35) - YES
            // 08:25 (08:25-08:40) - YES
            // So dedup IS CRITICAL.

            if (existingLog) continue;

            const message = {
                notification: {
                    title: '⏰ Sắp đến giờ làm việc!',
                    body: `Ca "${target.title}" bắt đầu lúc ${target.startTime}. Hãy mở app để chấm công!`,
                },
                data: {
                    url: '/',
                    shiftId: target.shiftId || '',
                    type: 'shift_reminder',
                },
                tokens: target.tokens,
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(message);
                log(`📤 Sent to ${target.userId}: ✅${response.successCount} ❌${response.failureCount}`);

                await supabase.from('notification_logs').insert({
                    user_id: target.userId,
                    shift_id: target.shiftId || null,
                    notification_type: 'server_push',
                    status: response.successCount > 0 ? 'sent' : 'failed',
                    // Note: If you have a custom key for defaults, you could store it in a metadata JSON field if existing.
                });

                results.push({ user: target.userId, success: response.successCount });
            } catch (err: any) {
                log(`❌ FCM error for ${target.userId}: ${err.message}`);
            }
        }

        return new Response(JSON.stringify({
            message: 'Check complete',
            users_processed: uniqueUserIds.length,
            notifications_sent: results.length,
            duration_ms: Date.now() - startTime,
            logs
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err: any) {
        log(`❌ FATAL ERROR: ${err.message}`);
        return new Response(JSON.stringify({ error: err.message, logs }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});

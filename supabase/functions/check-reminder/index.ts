
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
                const binary = atob(saB64.trim());
                const serviceAccount = JSON.parse(binary);
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

        log(`📅 Date: ${targetDateStr} | Time Window: ${currentTimeVN} → ${windowEndTimeVN} (VN)`);
        log(`🕐 Server UTC: ${now.toISOString()}`);

        // 4. Find shifts starting within the window
        const { data: shifts, error: shiftError } = await supabase
            .from('work_schedules')
            .select('id, user_id, start_time, end_time, work_date, title')
            .eq('work_date', targetDateStr)
            .gte('start_time', currentTimeVN)
            .lte('start_time', windowEndTimeVN);

        if (shiftError) {
            log(`❌ Error querying shifts: ${shiftError.message}`);
            throw shiftError;
        }

        log(`🔍 Found ${shifts?.length || 0} shifts in window`);

        if (!shifts || shifts.length === 0) {
            return new Response(JSON.stringify({
                message: 'No shifts found in reminder window',
                window: { date: targetDateStr, from: currentTimeVN, to: windowEndTimeVN },
                duration_ms: Date.now() - startTime,
                logs
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 5. Process each shift
        const results: any[] = [];
        const errors: any[] = [];
        let skippedAlreadySent = 0;
        let skippedNoToken = 0;

        for (const shift of shifts) {
            // 5a. Check if notification already sent (dedup)
            const { data: existingLog, error: logCheckError } = await supabase
                .from('notification_logs')
                .select('id')
                .eq('user_id', shift.user_id)
                .eq('shift_id', shift.id)
                .eq('notification_type', 'server_push')
                .maybeSingle();

            if (logCheckError) {
                log(`⚠️ Error checking dedup for user ${shift.user_id}: ${logCheckError.message}`);
            }

            if (existingLog) {
                skippedAlreadySent++;
                continue;
            }

            // 5b. Get FCM tokens for user
            const { data: tokens, error: tokenError } = await supabase
                .from('fcm_tokens')
                .select('token')
                .eq('user_id', shift.user_id);

            if (tokenError) {
                log(`⚠️ Error getting tokens for user ${shift.user_id}: ${tokenError.message}`);
                continue;
            }

            if (!tokens || tokens.length === 0) {
                skippedNoToken++;
                log(`⏭️ User ${shift.user_id} has no FCM tokens`);
                continue;
            }

            const fcmTokens = tokens.map((t: any) => t.token);
            log(`📱 User ${shift.user_id}: ${fcmTokens.length} token(s), Shift "${shift.title}" at ${shift.start_time}`);

            // 5c. Build and send FCM message
            const message = {
                notification: {
                    title: '⏰ Sắp đến giờ làm việc!',
                    body: `Ca "${shift.title || 'của bạn'}" bắt đầu lúc ${shift.start_time}. Hãy mở app để chấm công!`,
                },
                data: {
                    url: '/',
                    shiftId: shift.id,
                    type: 'shift_reminder',
                },
                tokens: fcmTokens,
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(message);

                log(`📤 Sent to user ${shift.user_id}: ✅${response.successCount} ❌${response.failureCount}`);

                // Log to database
                await supabase.from('notification_logs').insert({
                    user_id: shift.user_id,
                    shift_id: shift.id,
                    notification_type: 'server_push',
                    status: response.successCount > 0 ? 'sent' : 'failed',
                });

                // Clean up invalid tokens
                if (response.failureCount > 0) {
                    for (let i = 0; i < response.responses.length; i++) {
                        const resp = response.responses[i];
                        if (!resp.success) {
                            const errCode = resp.error?.code;
                            log(`  ↳ Token[${i}] error: ${errCode} - ${resp.error?.message}`);

                            // Remove stale/invalid tokens
                            if (
                                errCode === 'messaging/invalid-registration-token' ||
                                errCode === 'messaging/registration-token-not-registered'
                            ) {
                                await supabase
                                    .from('fcm_tokens')
                                    .delete()
                                    .eq('token', fcmTokens[i])
                                    .eq('user_id', shift.user_id);
                                log(`  🗑️ Removed stale token[${i}]`);
                            }
                        }
                    }
                }

                results.push({
                    user_id: shift.user_id,
                    shift_title: shift.title,
                    start_time: shift.start_time,
                    success: response.successCount,
                    failure: response.failureCount,
                });
            } catch (err: any) {
                log(`❌ FCM send error for user ${shift.user_id}: ${err.message}`);
                errors.push({
                    user_id: shift.user_id,
                    error: err.message,
                });
            }
        }

        const duration = Date.now() - startTime;
        log(`✅ Done in ${duration}ms | Sent: ${results.length} | Skipped(sent): ${skippedAlreadySent} | Skipped(no token): ${skippedNoToken} | Errors: ${errors.length}`);

        return new Response(JSON.stringify({
            message: 'Check complete',
            window: { date: targetDateStr, from: currentTimeVN, to: windowEndTimeVN },
            shifts_found: shifts.length,
            notifications_sent: results.length,
            skipped_already_sent: skippedAlreadySent,
            skipped_no_token: skippedNoToken,
            results,
            errors: errors.length > 0 ? errors : undefined,
            duration_ms: duration,
            logs,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        log(`❌ FATAL ERROR: ${err.message}`);
        console.error(err);
        return new Response(JSON.stringify({
            error: err.message,
            logs,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

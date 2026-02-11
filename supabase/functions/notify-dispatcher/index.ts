
import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12.0.0'

const LOG_PREFIX = '[notify-dispatcher]';

interface Payload {
    userIds?: string[];
    role?: string;
    departmentId?: string;
    targetType?: 'all' | 'role' | 'department' | 'specific_users'; // New field
    title: string;
    body: string;
    link?: string;
    campaignId?: string;
    saveToDb?: boolean; // Save to 'notifications' table?
    type?: 'info' | 'success' | 'warning' | 'error'; // For 'notifications' table
}

Deno.serve(async (req) => {
    // 1. Auth Check (Must be Service Role OR Admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify token (if not service role)
    // For simplicity, we assume caller has valid JWT or is triggered by server action using Service Key

    // 2. Parse Body
    let payload: Payload;
    try {
        payload = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
    }

    const { userIds, role, departmentId, targetType, title, body, link, campaignId, saveToDb = true, type = 'info' } = payload;
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(`${LOG_PREFIX} ${msg}`);
        logs.push(msg);
    };

    try {
        // 3. Initialize Firebase (Robust)
        if (!admin.apps.length) {
            const saB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64');
            if (!saB64) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64');

            let cleaned = saB64.trim().replace(/\s/g, '');
            while (cleaned.length % 4 !== 0) cleaned += '=';

            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(atob(cleaned))),
            });
            log('Firebase Init Success');
        }

        // 4. Resolve Target Users
        let targets: string[] = [];

        if (targetType === 'all') {
            const { data } = await supabase.from('profiles').select('id').eq('status', 'active');
            targets = data?.map(u => u.id) || [];
            log(`Resolved ALL active users: ${targets.length}`);
        } else if (userIds && userIds.length > 0) {
            targets = userIds;
        } else if (role) {
            // Fetch users by role
            // This requires joining profiles and roles tables, complex.
            // Simplified: Fetch all profiles with role X
            const { data } = await supabase.from('profiles').select('id').eq('role', role);
            targets = data?.map(u => u.id) || [];
        } else if (departmentId) {
            const { data } = await supabase.from('profiles').select('id').eq('department', departmentId);
            targets = data?.map(u => u.id) || [];
        }

        if (targets.length === 0) {
            log('No targets found');
            return new Response(JSON.stringify({ message: 'No targets', logs }), { status: 200 });
        }

        log(`Targeting ${targets.length} users`);

        // 5. Update Campaign (if exists)
        if (campaignId) {
            await supabase.from('notification_campaigns')
                .update({
                    status: 'processing',
                    total_recipients: targets.length
                })
                .eq('id', campaignId);
        }

        // 6. Fetch Tokens
        const { data: tokenData } = await supabase
            .from('fcm_tokens')
            .select('user_id, token')
            .in('user_id', targets);

        const tokensMap: Record<string, string[]> = {};
        tokenData?.forEach(t => {
            if (!tokensMap[t.user_id]) tokensMap[t.user_id] = [];
            tokensMap[t.user_id].push(t.token);
        });

        // 7. Send & Save
        let successCount = 0; // Count of USERS reached
        let failureCount = 0; // Count of USERS failed

        for (const userId of targets) {
            // A. Save to In-App Notifications (if requested)
            if (saveToDb) {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    title,
                    message: body,
                    content: body,
                    type: 'system_push', // Generic type
                    link,
                    is_read: false,
                    campaign_id: campaignId || null
                });
            }

            // B. Send Push
            const tokens = tokensMap[userId];
            if (tokens && tokens.length > 0) {
                const message = {
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        url: link || '/',
                        campaignId: campaignId || '',
                        type: 'campaign_msg'
                    },
                    tokens: tokens
                };

                const response = await admin.messaging().sendEachForMulticast(message);

                // If at least one device received it, we consider the user "reached"
                if (response.successCount > 0) {
                    successCount++;
                } else {
                    failureCount++;
                }

                // Log outcome
                await supabase.from('notification_logs').insert({
                    user_id: userId,
                    campaign_id: campaignId,
                    notification_type: 'campaign_push',
                    status: response.successCount > 0 ? 'sent' : 'failed',
                    sent_at: new Date().toISOString()
                });
            } else {
                failureCount++; // No token = fail to push
            }
        }

        // 8. Update Campaign Final Status
        if (campaignId) {
            await supabase.from('notification_campaigns')
                .update({
                    status: 'completed',
                    success_count: successCount,
                    failure_count: failureCount
                })
                .eq('id', campaignId);
        }

        return new Response(JSON.stringify({ success: true, targets: targets.length, sent: successCount, failed: failureCount, logs }), { status: 200 });

    } catch (e: any) {
        log(`Error: ${e.message}`);
        if (campaignId) {
            await supabase.from('notification_campaigns')
                .update({ status: 'failed', metadata: { error: e.message } })
                .eq('id', campaignId);
        }
        return new Response(JSON.stringify({ error: e.message, logs }), { status: 500 });
    }
});

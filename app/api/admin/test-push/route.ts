import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushToTokens } from '@/lib/firebase-admin'

export async function POST(req: Request) {
    try {
        // 1. Verify caller is authenticated admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check admin role
        const adminSb = createAdminClient()
        const { data: profile } = await adminSb
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single()

        const roleName = Array.isArray(profile?.roles) ? profile.roles[0]?.name : (profile?.roles as any)?.name
        if (!roleName || !['admin', 'super_admin'].includes(roleName)) {
            return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
        }

        // 2. Parse request body
        const body = await req.json()
        const { targetUserId, title, message } = body

        if (!targetUserId) {
            return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
        }

        // 3. Get FCM tokens for target user
        const { data: tokens, error: tokenError } = await adminSb
            .from('fcm_tokens')
            .select('token, device_type, updated_at')
            .eq('user_id', targetUserId)

        if (tokenError) {
            return NextResponse.json({
                error: `Failed to get tokens: ${tokenError.message}`
            }, { status: 500 })
        }

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({
                error: 'No FCM tokens found for this user. They need to log in and allow notifications first.',
                tokenCount: 0,
            }, { status: 404 })
        }

        // 4. Send push notification via FCM HTTP v1 API (no firebase-admin SDK)
        const fcmTokens = tokens.map(t => t.token)
        const { results, successCount, failureCount } = await sendPushToTokens(
            fcmTokens,
            {
                title: title || '🔔 Test Notification',
                body: message || 'Đây là thông báo test từ Admin Dashboard',
            },
            {
                url: '/',
                type: 'admin_test',
                sentAt: new Date().toISOString(),
            }
        )

        // 5. Clean up stale tokens
        const staleTokens: string[] = []
        for (let i = 0; i < results.length; i++) {
            const r = results[i]
            if (!r.success) {
                const errCode = r.error || ''
                if (
                    errCode.includes('UNREGISTERED') ||
                    errCode.includes('INVALID_ARGUMENT') ||
                    errCode.includes('NOT_FOUND')
                ) {
                    staleTokens.push(fcmTokens[i])
                    await adminSb
                        .from('fcm_tokens')
                        .delete()
                        .eq('token', fcmTokens[i])
                }
            }
        }

        // 6. Log the test
        await adminSb.from('notification_logs').insert({
            user_id: targetUserId,
            shift_id: null,
            notification_type: 'admin_test',
            status: successCount > 0 ? 'sent' : 'failed',
        })

        return NextResponse.json({
            success: true,
            total_tokens: tokens.length,
            success_count: successCount,
            failure_count: failureCount,
            stale_tokens_removed: staleTokens.length,
            token_details: tokens.map((t, i) => ({
                device_type: t.device_type,
                status: results[i]?.success ? 'delivered' : 'failed',
                error: results[i]?.error || null,
            })),
        })

    } catch (err: any) {
        console.error('Test Push Error:', err)
        return NextResponse.json({
            error: err.message || 'Internal server error',
        }, { status: 500 })
    }
}

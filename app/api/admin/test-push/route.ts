import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import * as firebaseAdmin from 'firebase-admin'

// Initialize Firebase Admin SDK (server-side, Node.js)
function getFirebaseAdmin() {
    if (firebaseAdmin.apps.length > 0) {
        return firebaseAdmin.apps[0]!
    }

    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
    if (b64) {
        try {
            const json = Buffer.from(b64, 'base64').toString('utf-8')
            const serviceAccount = JSON.parse(json)
            return firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(serviceAccount),
            })
        } catch (e) {
            console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_B64:', e)
        }
    }

    // Fallback: try JSON file path
    const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (jsonPath) {
        // Dynamic import for file-based credential
        const serviceAccount = require(jsonPath)
        return firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
        })
    }

    throw new Error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_SERVICE_ACCOUNT_JSON env var.')
}

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
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
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

        // 4. Send push notification
        const app = getFirebaseAdmin()
        const fcmTokens = tokens.map(t => t.token)

        const fcmMessage = {
            notification: {
                title: title || '🔔 Test Notification',
                body: message || 'Đây là thông báo test từ Admin Dashboard',
            },
            data: {
                url: '/',
                type: 'admin_test',
                sentAt: new Date().toISOString(),
            },
            tokens: fcmTokens,
        }

        const response = await firebaseAdmin.messaging().sendEachForMulticast(fcmMessage)

        // 5. Clean up stale tokens
        const staleTokens: string[] = []
        for (let i = 0; i < response.responses.length; i++) {
            const resp = response.responses[i]
            if (!resp.success) {
                const errCode = resp.error?.code
                if (
                    errCode === 'messaging/invalid-registration-token' ||
                    errCode === 'messaging/registration-token-not-registered'
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
            status: response.successCount > 0 ? 'sent' : 'failed',
        })

        return NextResponse.json({
            success: true,
            total_tokens: tokens.length,
            success_count: response.successCount,
            failure_count: response.failureCount,
            stale_tokens_removed: staleTokens.length,
            token_details: tokens.map((t, i) => ({
                device_type: t.device_type,
                status: response.responses[i].success ? 'delivered' : 'failed',
                error: response.responses[i].error?.code || null,
            })),
        })

    } catch (err: any) {
        console.error('Test Push Error:', err)
        return NextResponse.json({
            error: err.message || 'Internal server error',
        }, { status: 500 })
    }
}

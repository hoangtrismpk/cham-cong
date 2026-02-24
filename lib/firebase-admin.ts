// Firebase Cloud Messaging - HTTP v1 API (no firebase-admin SDK needed)
// Uses Google OAuth2 JWT to get access token, then calls FCM REST API directly
// This completely avoids the Turbopack crash with firebase-admin on Windows

import * as crypto from 'crypto'

interface ServiceAccount {
    client_email: string
    private_key: string
    project_id: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

function getServiceAccount(): ServiceAccount {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
    if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 env var is not set')
    const json = Buffer.from(b64, 'base64').toString('utf-8')
    return JSON.parse(json)
}

function createJWT(sa: ServiceAccount): string {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }

    const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
    const unsigned = `${encode(header)}.${encode(payload)}`

    const sign = crypto.createSign('RSA-SHA256')
    sign.update(unsigned)
    const signature = sign.sign(sa.private_key, 'base64url')

    return `${unsigned}.${signature}`
}

async function getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5-min buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
        return cachedToken.token
    }

    const sa = getServiceAccount()
    const jwt = createJWT(sa)

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to get access token: ${res.status} ${text}`)
    }

    const data = await res.json()
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    }
    return data.access_token
}

export interface FCMSendResult {
    token: string
    success: boolean
    error?: string
    messageId?: string
}

export async function sendPushToTokens(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>
): Promise<{ results: FCMSendResult[]; successCount: number; failureCount: number }> {
    const sa = getServiceAccount()
    const accessToken = await getAccessToken()
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    const results: FCMSendResult[] = []
    let successCount = 0
    let failureCount = 0

    // Send to each token individually (FCM HTTP v1 doesn't support multicast)
    for (const token of tokens) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        token,
                        notification,
                        data: data || {},
                    },
                }),
            })

            if (res.ok) {
                const resData = await res.json()
                results.push({ token, success: true, messageId: resData.name })
                successCount++
            } else {
                const errData = await res.json().catch(() => ({}))
                const errorCode = errData?.error?.details?.[0]?.errorCode || errData?.error?.status || `HTTP_${res.status}`
                results.push({ token, success: false, error: errorCode })
                failureCount++
            }
        } catch (err: any) {
            results.push({ token, success: false, error: err.message })
            failureCount++
        }
    }

    return { results, successCount, failureCount }
}

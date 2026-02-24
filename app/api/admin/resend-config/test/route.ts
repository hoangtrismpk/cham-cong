import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { error: 'Unauthorized', status: 401 }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role_id, roles(name)')
        .eq('id', user.id)
        .single()

    const roleName = (profile as any)?.roles?.name
    if (roleName !== 'admin') return { error: 'Forbidden', status: 403 }

    return { user, ok: true }
}

/**
 * POST /api/admin/resend-config/test
 * Verify Resend API key by sending a test email
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        // Allow passing a temporary api_key for testing before saving
        const body = await req.json().catch(() => ({}))
        const tempApiKey: string | undefined = body.api_key
        const testTo: string = body.to || auth.user!.email!

        // Get stored config
        const { data: cfg } = await supabase
            .from('resend_config')
            .select('*')
            .limit(1)
            .single()

        const apiKey = (tempApiKey?.startsWith('re_') ? tempApiKey : cfg?.api_key) || ''
        const fromEmail = body.from_email || cfg?.from_email || ''
        const fromName = body.from_name || cfg?.from_name || 'TimeTracker'
        const replyTo = body.reply_to || cfg?.reply_to || ''

        if (!apiKey || !apiKey.startsWith('re_')) {
            return NextResponse.json(
                { error: 'No valid Resend API key found. Please save configuration first.' },
                { status: 422 }
            )
        }

        if (!fromEmail) {
            return NextResponse.json(
                { error: 'From email is required to send test' },
                { status: 422 }
            )
        }

        // Send a simple test email
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [testTo],
                reply_to: replyTo || undefined,
                subject: '✅ Resend API Test - TimeTracker',
                html: `
                    <div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                        <h2 style="color:#0f172a;margin:0 0 16px;">✅ Kết nối Resend thành công!</h2>
                        <p style="color:#475569;line-height:1.7;">Email này xác nhận rằng Resend API đã được cấu hình đúng trên hệ thống <strong>TimeTracker</strong>.</p>
                        <p style="color:#475569;">Bạn có thể bắt đầu gửi email thông báo tự động cho nhân viên.</p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
                        <p style="color:#94a3b8;font-size:12px;">Gửi từ: ${fromEmail}<br/>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
                    </div>
                `,
            }),
        })

        const isOk = resendRes.ok
        const resendBody = await resendRes.json().catch(() => ({}))

        // Update test_status in DB
        if (cfg) {
            await supabase
                .from('resend_config')
                .update({
                    test_status: isOk ? 'success' : 'failed',
                    last_tested_at: new Date().toISOString(),
                })
                .eq('id', cfg.id)
        }

        if (!isOk) {
            return NextResponse.json(
                { error: `Resend API error: ${resendBody.message || resendRes.statusText}` },
                { status: resendRes.status }
            )
        }

        return NextResponse.json({
            success: true,
            messageId: resendBody.id,
            sentTo: testTo,
        })
    } catch (err: any) {
        console.error('[resend-config/test POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

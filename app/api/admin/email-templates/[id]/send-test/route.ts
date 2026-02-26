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
 * POST /api/admin/email-templates/[id]/send-test
 * Send a test email to a given address using Resend API
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { email } = await req.json()
        if (!email) {
            return NextResponse.json({ error: 'Missing test email address' }, { status: 400 })
        }

        // Get template
        const { data: template, error: tErr } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .single()

        if (tErr || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        // Get Resend config
        const { data: resendCfg } = await supabase
            .from('resend_config')
            .select('*')
            .limit(1)
            .single()

        if (!resendCfg?.is_configured || !resendCfg?.api_key) {
            return NextResponse.json(
                { error: 'Resend API is not configured. Please set it up in Settings → Email (Resend) first.' },
                { status: 422 }
            )
        }

        // Replace placeholders with sample values for the test
        const SAMPLE: Record<string, string> = {
            user_name: 'Sarah Johnson',
            user_email: email,
            company_name: resendCfg.from_name || 'TimeTracker',
            temp_password: 'Temp@1234',
            login_url: 'https://app.example.com/login',
            reset_link: 'https://app.example.com/reset',
            expiry_time: '24 hours',
            support_email: resendCfg.from_email,
            approver_name: 'Admin',
            leave_dates: '25/12 - 28/12/2023',
            leave_type: 'Annual Leave',
            start_date: '25/12/2023 08:00',
            end_date: '28/12/2023 17:00',
            total_days: '4',
            changed_at: new Date().toLocaleString('vi-VN'),
            login_time: new Date().toLocaleString('vi-VN'),
            location: 'Hồ Chí Minh, VN',
            device: 'Chrome on Windows',
            ip_address: '192.168.1.1',
            action_url: '#',
            report_date: new Date().toLocaleDateString('vi-VN'),
            on_time_count: '15',
            late_count: '3',
            absent_count: '2',
            on_leave_count: '1',
        }

        let htmlContent = template.content
        let subjectText = template.subject

        Object.entries(SAMPLE).forEach(([key, value]) => {
            htmlContent = htmlContent.replaceAll(`{{${key}}}`, value)
            subjectText = subjectText.replaceAll(`{{${key}}}`, value)
        })

        // Call Resend API
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendCfg.api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${resendCfg.from_name} <${resendCfg.from_email}>`,
                to: [email],
                reply_to: resendCfg.reply_to || undefined,
                subject: `[TEST] ${subjectText}`,
                html: htmlContent,
            }),
        })

        if (!resendRes.ok) {
            const errBody = await resendRes.json().catch(() => ({}))
            console.error('[send-test] Resend error:', errBody)
            return NextResponse.json(
                { error: `Resend API error: ${errBody.message || resendRes.statusText}` },
                { status: resendRes.status }
            )
        }

        const resendData = await resendRes.json()

        return NextResponse.json({
            success: true,
            messageId: resendData.id,
            to: email,
        })
    } catch (err: any) {
        console.error('[send-test POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

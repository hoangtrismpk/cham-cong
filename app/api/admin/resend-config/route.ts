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
 * GET /api/admin/resend-config
 * Return current Resend configuration (api_key is masked)
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { data, error } = await supabase
            .from('resend_config')
            .select('id, from_email, from_name, reply_to, is_configured, test_status, last_tested_at, updated_at')
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') throw error

        // Also tell whether API key is set (masked)
        if (data) {
            const { data: withKey } = await supabase
                .from('resend_config')
                .select('api_key')
                .limit(1)
                .single()

            return NextResponse.json({
                ...data,
                has_api_key: !!(withKey?.api_key && withKey.api_key.length > 0),
                api_key_preview: withKey?.api_key
                    ? `re_${'•'.repeat(16)}${withKey.api_key.slice(-4)}`
                    : '',
            })
        }

        return NextResponse.json(null)
    } catch (err: any) {
        console.error('[resend-config GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/resend-config
 * Save Resend configuration
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { api_key, from_email, from_name, reply_to } = await req.json()

        if (!from_email || !from_name) {
            return NextResponse.json(
                { error: 'Missing required fields: from_email, from_name' },
                { status: 400 }
            )
        }

        if (api_key && !api_key.startsWith('re_')) {
            return NextResponse.json(
                { error: 'Invalid API key format. Must start with "re_"' },
                { status: 400 }
            )
        }

        // Get existing row
        const { data: existing } = await supabase
            .from('resend_config')
            .select('id, api_key')
            .limit(1)
            .single()

        const updatePayload: Record<string, unknown> = {
            from_email,
            from_name,
            reply_to: reply_to || '',
            is_configured: true,
            updated_at: new Date().toISOString(),
        }

        // Only update api_key if a new one was provided
        if (api_key && api_key.startsWith('re_')) {
            updatePayload.api_key = api_key
        }

        let data, error

        if (existing) {
            ; ({ data, error } = await supabase
                .from('resend_config')
                .update(updatePayload)
                .eq('id', existing.id)
                .select('id, from_email, from_name, reply_to, is_configured, test_status, last_tested_at')
                .single())
        } else {
            ; ({ data, error } = await supabase
                .from('resend_config')
                .insert({ ...updatePayload, api_key: api_key || '' })
                .select('id, from_email, from_name, reply_to, is_configured, test_status, last_tested_at')
                .single())
        }

        if (error) throw error

        return NextResponse.json({ success: true, config: data })
    } catch (err: any) {
        console.error('[resend-config POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

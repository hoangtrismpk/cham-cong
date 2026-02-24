import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/** Helper: check admin auth */
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
 * GET /api/admin/email-templates
 * Return all email templates
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[email-templates GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/email-templates
 * Create a new email template
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const body = await req.json()
        const { slug, name, description, subject, content, category, variables } = body

        if (!slug || !name || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: slug, name, subject' },
                { status: 400 }
            )
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', auth.user!.id)
            .single()

        const { data, error } = await supabase
            .from('email_templates')
            .insert({
                slug,
                name,
                description: description || '',
                subject,
                content: content || '',
                category: category || 'system',
                variables: variables || [],
                is_active: true,
                updated_by: (profile as any)?.full_name || auth.user!.email || 'Admin',
                updated_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (err: any) {
        console.error('[email-templates POST]', err)
        if (err.code === '23505') {
            return NextResponse.json({ error: 'A template with this slug already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

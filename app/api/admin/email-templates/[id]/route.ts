import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/** Helper: check admin auth */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { error: 'Unauthorized', status: 401 }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role_id, roles(name), full_name')
        .eq('id', user.id)
        .single()

    const roleName = (profile as any)?.roles?.name
    if (roleName !== 'admin') return { error: 'Forbidden', status: 403 }

    return { user, profile, ok: true }
}

/**
 * GET /api/admin/email-templates/[id]
 * Return a single template by ID or slug
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .single()

        if (error?.code === 'PGRST116') {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }
        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[email-templates/[id] GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PUT /api/admin/email-templates/[id]
 * Update full template content (name, subject, content, category, variables)
 */
export async function PUT(
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

        const body = await req.json()
        const { name, subject, content, category, variables, description } = body

        if (!name || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: name, subject' },
                { status: 400 }
            )
        }

        const updaterName = (auth.profile as any)?.full_name || auth.user!.email || 'Admin'

        const { data, error } = await supabase
            .from('email_templates')
            .update({
                name,
                subject,
                content: content || '',
                category: category || 'system',
                variables: variables || [],
                description: description || '',
                updated_by: updaterName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error?.code === 'PGRST116') {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }
        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[email-templates/[id] PUT]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/admin/email-templates/[id]
 * Toggle is_active status
 */
export async function PATCH(
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

        const body = await req.json()

        // Only allow patching is_active (and optionally other safe fields)
        const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }
        if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

        const { data, error } = await supabase
            .from('email_templates')
            .update(patch)
            .eq('id', id)
            .select()
            .single()

        if (error?.code === 'PGRST116') {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }
        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[email-templates/[id] PATCH]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/email-templates/[id]
 * Delete a template (only non-system templates)
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const auth = await requireAdmin(supabase)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[email-templates/[id] DELETE]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

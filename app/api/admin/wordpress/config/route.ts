import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/admin/wordpress/config
 * Get active WordPress configuration
 * Only accessible by Admin users
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            )
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single()

        const roleName = (profile as any)?.roles?.name
        if (roleName !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            )
        }

        // Get active config
        const { data, error } = await supabase
            .from('wordpress_config')
            .select('id, site_url, username, is_active, last_tested_at, test_status, created_at')
            .eq('is_active', true)
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error
        }

        return NextResponse.json(data || null)
    } catch (error: any) {
        console.error('Error fetching WordPress config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/wordpress/config
 * Save WordPress configuration
 * Only accessible by Admin users
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            )
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single()

        const roleName = (profile as any)?.roles?.name
        if (roleName !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            )
        }

        const { site_url, username, app_password } = await req.json()

        // Validation
        if (!site_url || !username || !app_password) {
            return NextResponse.json(
                { error: 'Missing required fields: site_url, username, app_password' },
                { status: 400 }
            )
        }

        // Validate URL format
        try {
            new URL(site_url)
        } catch {
            return NextResponse.json(
                { error: 'Invalid site_url format' },
                { status: 400 }
            )
        }

        // Remove trailing slash from URL
        const cleanUrl = site_url.replace(/\/$/, '')

        // Deactivate all existing configs
        await supabase
            .from('wordpress_config')
            .update({ is_active: false })
            .eq('is_active', true)

        // Insert new config
        const { data, error } = await supabase
            .from('wordpress_config')
            .insert({
                site_url: cleanUrl,
                username,
                app_password,
                is_active: true,
                test_status: 'pending'
            })
            .select('id, site_url, username, is_active, test_status, created_at')
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            config: data
        })
    } catch (error: any) {
        console.error('Error saving WordPress config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/wordpress/config
 * Delete (deactivate) WordPress configuration
 * Only accessible by Admin users
 */
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            )
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single()

        const roleName = (profile as any)?.roles?.name
        if (roleName !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            )
        }

        // Deactivate all configs (soft delete)
        await supabase
            .from('wordpress_config')
            .update({ is_active: false })
            .eq('is_active', true)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting WordPress config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

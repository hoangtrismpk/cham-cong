import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/admin/wordpress/test
 * Test WordPress connection
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

        if (!site_url || !username || !app_password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Remove trailing slash
        const cleanUrl = site_url.replace(/\/$/, '')

        try {
            // Test WordPress REST API connection
            const authHeader = Buffer.from(`${username}:${app_password}`).toString('base64')

            const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Authentication failed: ${response.status} ${errorText}`)
            }

            const userData = await response.json()

            // Update test status in database if config exists
            await supabase
                .from('wordpress_config')
                .update({
                    last_tested_at: new Date().toISOString(),
                    test_status: 'success'
                })
                .eq('is_active', true)

            return NextResponse.json({
                success: true,
                message: 'Kết nối thành công!',
                user: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email
                }
            })
        } catch (error: any) {
            console.error('WordPress connection test failed:', error)

            // Update test status in database
            await supabase
                .from('wordpress_config')
                .update({
                    last_tested_at: new Date().toISOString(),
                    test_status: 'failed'
                })
                .eq('is_active', true)

            return NextResponse.json({
                success: false,
                error: error.message || 'Không thể kết nối với WordPress'
            }, { status: 400 })
        }
    } catch (error: any) {
        console.error('Error testing WordPress connection:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

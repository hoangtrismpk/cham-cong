import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/wordpress/upload
 * Upload file to WordPress Media Library
 * Requires active WordPress configuration
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

        // Get active WordPress config
        const { data: config, error: configError } = await supabase
            .from('wordpress_config')
            .select('site_url, username, app_password')
            .eq('is_active', true)
            .limit(1)
            .single()

        if (configError || !config) {
            return NextResponse.json({
                error: 'WordPress chưa được cấu hình. Vui lòng liên hệ Admin để thiết lập.',
                code: 'NO_CONFIG'
            }, { status: 400 })
        }

        // Get file from request
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File quá lớn. Tối đa 10MB (file hiện tại: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
                { status: 400 }
            )
        }

        try {
            // Prepare WordPress upload
            const wpFormData = new FormData()
            wpFormData.append('file', file)

            const authHeader = Buffer.from(`${config.username}:${config.app_password}`).toString('base64')

            // Upload to WordPress
            const response = await fetch(`${config.site_url}/wp-json/wp/v2/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeader}`
                },
                body: wpFormData
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`WordPress upload failed: ${response.status} ${errorText}`)
            }

            const media = await response.json()

            return NextResponse.json({
                success: true,
                url: media.source_url,
                id: media.id,
                title: media.title?.rendered || file.name,
                type: media.mime_type,
                size: file.size
            })
        } catch (error: any) {
            console.error('WordPress upload error:', error)
            return NextResponse.json({
                success: false,
                error: error.message || 'Upload thất bại'
            }, { status: 500 })
        }
    } catch (error: any) {
        console.error('Error in WordPress upload:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

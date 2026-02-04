'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitLeaveRequest(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const leave_date = formData.get('leave_date') as string
    const reason = formData.get('reason') as string
    const image_url = formData.get('image_url') as string
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string
    const total_hours = formData.get('total_hours')

    if (!leave_date || !reason || !start_time || !end_time) {
        return { error: 'Missing required fields' }
    }

    const { data, error } = await supabase
        .from('leave_requests')
        .insert({
            user_id: user.id,
            leave_date,
            start_time,
            end_time,
            total_hours: total_hours ? parseFloat(total_hours.toString()) : null,
            reason,
            image_url,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('Error submitting leave request:', error)
        return { error: error.message }
    }

    return { data }
}

// Mock upload function (since we can't really upload to WP without credentials)
// In a real app, this would perform a multipart/form-data POST to the WP API
export async function uploadImageToHost(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) return { error: 'No file provided' }

    const wpUrl = process.env.WORDPRESS_API_URL
    const wpUser = process.env.WORDPRESS_USERNAME
    const wpAppPass = process.env.WORDPRESS_APP_PASSWORD

    if (!wpUrl || !wpUser || !wpAppPass) {
        console.error('Missing WordPress credentials in .env.local')
        return { error: 'Server configuration error: Missing WP credentials' }
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const cleanPass = wpAppPass.replace(/\s+/g, '') // Remove spaces from App Password
        const auth = Buffer.from(`${wpUser}:${cleanPass}`).toString('base64')

        const res = await fetch(`${wpUrl}/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Disposition': `attachment; filename="${file.name}"`,
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: buffer,
        })

        if (!res.ok) {
            const errorBody = await res.text()
            console.error('WP Upload Error:', res.status, res.statusText, errorBody)
            return { error: `Upload failed: ${res.statusText}` }
        }

        const data = await res.json()
        return { url: data.source_url }

    } catch (err: any) {
        console.error('Upload exception:', err)
        return { error: `Upload exception: ${err.message}` }
    }
}

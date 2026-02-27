'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Campaign {
    id: string
    title: string
    message: string
    link?: string
    target_type: string
    target_value?: any
    status: string
    total_recipients: number
    success_count: number
    failure_count: number
    created_at: string
    created_by: string
}

export async function getCampaigns(page = 1, limit = 10) {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await supabase
        .from('notification_campaigns')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw new Error(error.message)

    return { data: data as Campaign[], count: count || 0 }
}

export async function getCampaignOptions() {
    const supabase = await createClient()

    // 1. Fetch Roles
    const { data: roles } = await supabase.from('roles').select('name, display_name')

    // 2. Fetch Departments
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, employee_code')
        .eq('status', 'active')
        .order('full_name')

    // Extract unique departments
    const departments = Array.from(new Set(profiles?.map(p => p.department).filter(Boolean) || []))

    return {
        roles: roles || [],
        departments: departments.sort(), // string array
        employees: profiles || [] // { id, full_name, department, role }
    }
}

export async function createReviewCampaign(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const title = formData.get('title') as string
    const message = formData.get('message') as string
    const link = formData.get('link') as string
    const targetType = formData.get('target_type') as string
    const targetValue = formData.get('target_value') as string

    const scheduledAt = formData.get('scheduled_at') as string

    // Parse target_value to JSONB
    let targetValueJson: any = null
    if (targetType === 'specific_users' && targetValue) {
        // Assume comma separated IDs if sent as string
        targetValueJson = targetValue.split(',').map(s => s.trim())
    } else if ((targetType === 'role' || targetType === 'department') && targetValue) {
        targetValueJson = targetValue
    }

    // If scheduled_at is provided, status is 'scheduled'; otherwise 'draft' (will be sent immediately)
    const status = scheduledAt ? 'scheduled' : 'draft'

    const { data, error } = await supabase.from('notification_campaigns').insert({
        title,
        message,
        link,
        target_type: targetType,
        target_value: targetValueJson,
        created_by: user.id,
        status: status,
        scheduled_at: scheduledAt || null
    }).select().single()

    if (error) return { error: error.message }

    return { success: true, id: data.id, status }
}

export async function sendCampaign(campaignId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get Campaign
    const { data: campaign } = await supabaseAdmin
        .from('notification_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

    if (!campaign) return { error: 'Campaign not found' }

    // 2. Update status to processing immediately
    await supabaseAdmin.from('notification_campaigns')
        .update({ status: 'processing' })
        .eq('id', campaignId)

    const payload: any = {
        title: campaign.title,
        body: campaign.message,
        link: campaign.link,
        campaignId: campaign.id,
        saveToDb: true,
        targetType: campaign.target_type
    }

    // 3. Configure Payload based on Type
    if (campaign.target_type === 'all') {
        // payload.targetType = 'all' is sufficient
    } else if (campaign.target_type === 'role') {
        payload.role = campaign.target_value
    } else if (campaign.target_type === 'department') {
        payload.departmentId = campaign.target_value
    } else if (campaign.target_type === 'specific_users') {
        payload.userIds = campaign.target_value
    }

    // 4. Call Edge Function using Supabase client (handles auth properly)
    try {
        const { data, error } = await supabaseAdmin.functions.invoke('notify-dispatcher', {
            body: payload,
            headers: {
                // Pass Service key directly as custom header to ensure Edge Function verifies it easily
                'x-notify-secret': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            }
        })

        if (error) {
            console.error('[sendCampaign] Dispatcher error:', error)
            await supabaseAdmin.from('notification_campaigns')
                .update({ status: 'failed', metadata: { error: error.message } })
                .eq('id', campaignId)
            return { error: error.message }
        }

        return { success: true }
    } catch (e: any) {
        // Mark campaign as failed on network error
        await supabaseAdmin.from('notification_campaigns')
            .update({ status: 'failed', metadata: { error: e.message } })
            .eq('id', campaignId)
        return { error: e.message }
    }
}

export async function trackNotificationClick(notificationId: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('notifications')
        .update({
            is_read: true,
            clicked_at: new Date().toISOString()
        })
        .eq('id', notificationId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function trackPushClick(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Update the notification for this user and campaign
    const { error } = await supabase.from('notifications')
        .update({
            is_read: true,
            clicked_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

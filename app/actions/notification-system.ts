'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export type NotificationType =
    | 'report_approved'
    | 'report_changes_requested'
    | 'report_feedback'
    | 'report_updated'
    | 'leave_approved'
    | 'leave_rejected'
    | 'attendance_approved'
    | 'attendance_rejected'
    | 'schedule_approved'
    | 'schedule_rejected'
    | 'system_info'
    | 'campaign_push'
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'request_correction'

export interface CreateNotificationParams {
    userId?: string
    userIds?: string[]
    type: NotificationType
    title: string
    message: string
    link?: string
    reportId?: string
    priority?: 'high' | 'normal'
}

/**
 * Unified Notification System
 * Handles both In-App database storage and Push Notifications via Edge Function
 */
export async function sendNotification({
    userId,
    userIds,
    type,
    title,
    message,
    link,
    reportId,
    priority = 'normal'
}: CreateNotificationParams) {
    const targets = userIds || (userId ? [userId] : [])
    if (targets.length === 0) return { success: false, error: 'No recipients provided' }

    console.log(`🔔 [NotificationSystem] Sending ${type} to ${targets.length} users`)

    // 1. Use Admin Client to bypass RLS
    const supabase = createAdminClient()

    try {
        // 2. Save to 'notifications' table for in-app bell (Parallel Insert)
        const entries = targets.map(uid => ({
            user_id: uid,
            type,
            title,
            message,
            content: message,
            link,
            report_id: reportId || null,
            is_read: false
        }))

        const { data: dbNotis, error: dbError } = await supabase
            .from('notifications')
            .insert(entries)
            .select()

        if (dbError) throw dbError

        // 3. Trigger Push Notification via Edge Function
        const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-dispatcher`
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (functionUrl && serviceKey) {
            const finalPriority = (priority === 'high' ||
                type.includes('approved') ||
                type.includes('rejected') ||
                type === 'error' ||
                type === 'report_changes_requested'
            ) ? 'high' : 'normal';

            fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userIds: targets,
                    title,
                    body: message,
                    link,
                    priority: finalPriority,
                    targetType: 'specific_users',
                    saveToDb: false
                })
            }).catch(e => console.error('❌ [NotificationSystem] Push Error:', e))
        }

        return { success: true, count: dbNotis?.length }
    } catch (e: any) {
        console.error('❌ [NotificationSystem] Failed:', e.message)
        return { success: false, error: e.message }
    }
}

export async function getMyNotifications(limit = 20) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], unreadCount: 0 }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    return { data: data || [], unreadCount: count || 0, error }
}

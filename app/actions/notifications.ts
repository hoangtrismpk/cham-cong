'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export interface Notification {
    id: string
    user_id: string
    type: 'report_approved' | 'report_changes_requested' | 'report_feedback' | 'report_updated'
    title: string
    message?: string
    content?: string // Legacy or alternative column
    report_id?: string
    is_read: boolean
    created_at: string
}

export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message?: string,
    reportId?: string
) {
    console.log('🔔 [createNotification] Starting (Admin Role)...', { userId, type, title, message, reportId })

    // Use Admin Client to bypass RLS when creating notifications for other users
    // Admin Client uses Service Role Key -> Can INSERT & SELECT ANY ROW
    const supabase = createAdminClient()

    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message: message || '', // Use message column
                content: message || '', // ALSO use content column (legacy support & NOT NULL fix)
                report_id: reportId
            })
            .select()
            .single()

        if (error) {
            console.error('❌ [createNotification] Error:', error)
            return { success: false, message: `Không thể tạo thông báo: ${error.message}` }
        }

        console.log('✅ [createNotification] Success!', data?.id)
        return { success: true, data }
    } catch (e: any) {
        console.error('❌ [createNotification] Exception:', e)
        return { success: false, message: e.message }
    }
}

export async function getNotifications(limit = 20, onlyUnread = false) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { notifications: [], unreadCount: 0 }

    let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (onlyUnread) {
        query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
        console.error('Get notifications error:', error)
        return { notifications: [], unreadCount: 0 }
    }

    // Get unread count
    const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    return {
        notifications: data as Notification[],
        unreadCount: count || 0
    }
}

export async function markAsRead(notificationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

    if (error) {
        console.error('Mark as read error:', error)
        return { success: false }
    }

    return { success: true }
}

export async function markAllAsRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    if (error) {
        console.error('Mark all as read error:', error)
        return { success: false }
    }

    return { success: true }
}

export async function deleteNotification(notificationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

    if (error) {
        console.error('Delete notification error:', error)
        return { success: false }
    }

    return { success: true }
}

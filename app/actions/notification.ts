'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface NotificationItem {
    id: string
    user_id: string
    title: string
    content: string
    type: 'info' | 'success' | 'warning' | 'error'
    is_read: boolean
    created_at: string
    link?: string
}

export async function getNotifications(limit = 20): Promise<{ data: NotificationItem[], error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { data: [], error: 'Unauthorized' }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Fetch notifications error:', error)
        return { data: [], error: error.message }
    }

    return { data: data || [] }
}

export async function markAsRead(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

    if (error) console.error('Mark read error:', error)
    revalidatePath('/')
}

export async function markAllAsRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    if (error) console.error('Mark all read error:', error)
    revalidatePath('/')
}

// Internal function to create notification (for other server actions)
export async function createNotification(userId: string, title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string) {
    const supabase = await createClient()
    await supabase.from('notifications').insert({
        user_id: userId,
        title,
        content,
        type,
        link
    })
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    const fetchNotifications = async () => {
        console.log('🔔 [useNotifications] Fetching notifications...')
        const result = await getNotifications()
        console.log('🔔 [useNotifications] Result:', result)

        if (result.notifications) {
            console.log('🔔 [useNotifications] Found', result.notifications.length, 'notifications')
            setNotifications(result.notifications)
            setUnreadCount(result.unreadCount)
        } else {
            console.warn('⚠️ [useNotifications] No notifications in result')
        }
        setLoading(false)
    }

    useEffect(() => {
        let channel: any
        let intervalId: any

        const setupSubscription = async () => {
            await fetchNotifications()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // 1. Realtime Subscription
            channel = supabase
                .channel(`notifications-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}` // Server-side filtering is better
                    },
                    (payload) => {
                        console.log('🔔 [Realtime] New notification:', payload)
                        const newNotification = payload.new as Notification

                        // Show toast
                        toast(newNotification.title, {
                            description: newNotification.message || 'Bạn có thông báo mới',
                            action: {
                                label: 'Xem',
                                onClick: () => router.push('/reports')
                            }
                        })

                        // Refresh full list to be safe
                        fetchNotifications()
                    }
                )
                .subscribe((status) => {
                    console.log('🔔 [Realtime] Status:', status)
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Subscribed to notifications channel')
                    }
                })

            // 2. Polling Fallback (every 10s)
            intervalId = setInterval(() => {
                fetchNotifications()
            }, 10000)
        }

        setupSubscription()

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (intervalId) clearInterval(intervalId)
        }
    }, [])

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await markAsRead(id)
    }

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)

        await markAllAsRead()
    }

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllRead,
        refetch: fetchNotifications
    }
}

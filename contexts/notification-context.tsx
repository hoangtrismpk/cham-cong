'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface NotificationContextType {
    notifications: Notification[]
    unreadCount: number
    loading: boolean
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    refetch: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    const fetchNotifications = async () => {
        try {
            const result = await getNotifications()
            if (result.notifications) {
                setNotifications(result.notifications)
                setUnreadCount(result.unreadCount)
            }
        } catch (err) {
            console.warn('⚠️ [NotificationContext] fetchNotifications error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let channel: any
        let intervalId: any

        const setupSubscription = async () => {
            try {
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
                            filter: `user_id=eq.${user.id}`
                        },
                        (payload) => {
                            const newNotification = payload.new as Notification
                            toast(newNotification.title, {
                                description: newNotification.message || 'Bạn có thông báo mới',
                                action: {
                                    label: 'Xem',
                                    onClick: () => router.push('/reports')
                                }
                            })
                            fetchNotifications().catch(() => { })
                        }
                    )
                    .subscribe((status) => {
                        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            console.warn('⚠️ [NotificationContext] Realtime channel status:', status)
                        }
                    })

                // 2. Polling Fallback (every 30s instead of 10s to save resources)
                intervalId = setInterval(() => {
                    fetchNotifications().catch(() => { })
                }, 30000)
            } catch (err) {
                console.warn('⚠️ [NotificationContext] Setup error:', err)
            }
        }

        setupSubscription()

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (intervalId) clearInterval(intervalId)
        }
    }, [])

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
        await markAsRead(id)
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        await markAllAsRead()
    }

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead: handleMarkAsRead,
            markAllAsRead: handleMarkAllRead,
            refetch: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}

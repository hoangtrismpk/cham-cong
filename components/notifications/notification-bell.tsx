'use client'

import { useState } from 'react'
import { Bell, Check, X, MessageSquare, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useNotifications } from '@/hooks/use-notifications'
import { Notification } from '@/app/actions/notifications'
import { trackNotificationClick } from '@/app/actions/campaigns'

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    // Use the hook which handles realtime updates
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refetch: loadNotifications
    } = useNotifications()

    const handleNotificationClick = async (notification: Notification) => {
        // 1. Mark as Read & Track Click
        if (notification.campaign_id) {
            // If it's a campaign, track the click (which also marks as read)
            await trackNotificationClick(notification.id)
            // Functionally equivalent to markAsRead but adds clicked_at
        } else if (!notification.is_read) {
            await markAsRead(notification.id)
        }

        // 2. Navigate
        if (notification.link) {
            // Check if external
            if (notification.link.startsWith('http')) {
                window.open(notification.link, '_blank')
            } else {
                router.push(notification.link)
            }
            setIsOpen(false)
        } else if (notification.report_id) {
            // Updated logic: Navigate with 'edit' param
            if (notification.type === 'report_changes_requested') {
                router.push(`/reports?report_id=${notification.report_id}&action=edit&t=${Date.now()}`)
            } else {
                // Navigate but just select
                router.push(`/reports?report_id=${notification.report_id}&t=${Date.now()}`)
                setIsOpen(false)
            }
        } else {
            // Just close
            setIsOpen(false)
        }
    }

    const handleMarkAllAsRead = async () => {
        await markAllAsRead()
        loadNotifications()
    }

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'report_approved':
                return <Check className="h-4 w-4 text-green-400" />
            case 'report_changes_requested':
                return <X className="h-4 w-4 text-yellow-400" />
            case 'report_feedback':
                return <Bell className="h-4 w-4 text-blue-400" />
            case 'report_updated':
                return <Bell className="h-4 w-4 text-purple-400" />
            default:
                return <Bell className="h-4 w-4 text-slate-400" />
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
                <Bell className="h-5 w-5 text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Thông báo</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:text-primary/80"
                                >
                                    Đánh dấu tất cả đã đọc
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    Không có thông báo
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors text-left ${!notification.is_read ? 'bg-primary/5' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white mb-1">
                                                    {notification.title}
                                                </h4>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-400 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-500 mt-2">
                                                    {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

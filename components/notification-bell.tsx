'use client'

import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        console.log('🔔 [NotificationBell] Mounted. Notifications:', notifications.length)
    }, [notifications.length])

    const handleNotificationClick = (notification: any) => {
        markAsRead(notification.id)
        setIsOpen(false)

        if (notification.report_id) {
            router.push(`/reports`)
        } else if (notification.link) {
            router.push(notification.link)
        }
    }

    // Only render the bell content after mounting to avoid hydration mismatch
    // But keep the button structure to prevent layout shift
    if (!mounted) {
        return (
            <button type="button" className="relative transition-all hover:bg-slate-800/50 rounded-xl w-10 h-10 cursor-pointer flex items-center justify-center outline-none focus:outline-none">
                <span className="material-symbols-outlined text-xl text-slate-300">notifications</span>
            </button>
        )
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button type="button" className="relative transition-all hover:bg-slate-800/50 rounded-xl w-10 h-10 cursor-pointer flex items-center justify-center outline-none focus:outline-none">
                    <span className="material-symbols-outlined text-xl text-slate-300">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-[#0d131a] animate-pulse" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-w-[calc(100vw-32px)] p-0 bg-[#161b22] border-slate-800 text-slate-200" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <h4 className="font-semibold text-sm">Thông báo</h4>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Không có thông báo mới
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {notifications.map((notification) => {
                                const getTypeStyles = (type: string) => {
                                    switch (type) {
                                        case 'success': return 'bg-emerald-500'
                                        case 'error': return 'bg-red-500'
                                        case 'warning': return 'bg-yellow-500'
                                        default: return 'bg-blue-500'
                                    }
                                }

                                const getBorderStyles = (type: string) => {
                                    switch (type) {
                                        case 'success': return 'border-l-emerald-500/50'
                                        case 'error': return 'border-l-red-500/50'
                                        case 'warning': return 'border-l-yellow-500/50'
                                        default: return 'border-l-transparent'
                                    }
                                }

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer border-l-2 ${getBorderStyles(notification.type)} ${!notification.is_read ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!notification.is_read ? getTypeStyles(notification.type) : 'bg-slate-700/50'}`} />
                                            <div className="space-y-1">
                                                <p className={`text-sm leading-tight ${!notification.is_read ? 'font-semibold text-white' : 'text-slate-400'}`}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-500 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium pt-1">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

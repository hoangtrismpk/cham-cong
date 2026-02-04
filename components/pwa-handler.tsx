'use client'

import { useEffect } from 'react'

interface PwaHandlerProps {
    todayShift: any
    todayLog: any
}

export function PwaHandler({ todayShift, todayLog }: PwaHandlerProps) {
    useEffect(() => {
        // 1. Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        // 2. Schedule Local Notification if not clocked in
        if (todayShift && !todayLog?.check_in_time) {
            const [hours, minutes] = todayShift.start_time.split(':').map(Number)
            const workStartTime = new Date()
            workStartTime.setHours(hours, minutes, 0, 0)

            const reminderTime = new Date(workStartTime.getTime() - 5 * 60 * 1000)
            const now = new Date()

            if (reminderTime > now) {
                const delay = reminderTime.getTime() - now.getTime()
                console.log(`Scheduling reminder in ${Math.round(delay / 1000 / 60)} minutes`)

                const timer = setTimeout(async () => {
                    if (Notification.permission === 'granted') {
                        if ('serviceWorker' in navigator) {
                            const registration = await navigator.serviceWorker.ready
                            registration.showNotification('Nhắc nhở Chấm công', {
                                body: `Bạn có ca làm lúc ${todayShift.start_time}. Đừng quên chấm công nhé!`,
                                icon: '/logo.png',
                                badge: '/logo.png'
                            })
                        } else {
                            new Notification('Nhắc nhở Chấm công', {
                                body: `Bạn có ca làm lúc ${todayShift.start_time}. Đừng quên chấm công nhé!`,
                                icon: '/logo.png',
                                badge: '/logo.png'
                            })
                        }
                    }
                }, delay)

                return () => clearTimeout(timer)
            }
        }
    }, [todayShift, todayLog])

    return null
}

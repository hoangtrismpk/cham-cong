'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useLocalNotifications() {
    useEffect(() => {
        const setupLocalNotifications = async () => {
            // Check if browser supports Notification API
            if (!('Notification' in window)) {
                console.log('This browser does not support notifications')
                return
            }

            // Request permission if not granted
            if (Notification.permission === 'default') {
                await Notification.requestPermission()
            }

            if (Notification.permission !== 'granted') {
                console.log('Notification permission denied')
                return
            }

            // Fetch user's work schedules
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

            const { data: schedules, error } = await supabase
                .from('work_schedules')
                .select('id, work_date, start_time, title')
                .eq('user_id', user.id)
                .in('work_date', [today, tomorrow])
                .order('work_date', { ascending: true })

            if (error || !schedules) {
                console.error('Error fetching schedules:', error)
                return
            }

            console.log(`Found ${schedules.length} upcoming shifts for local notifications`)

            // Schedule local notifications for each shift
            schedules.forEach((schedule) => {
                const shiftDateTime = new Date(`${schedule.work_date}T${schedule.start_time}`)
                const reminderTime = new Date(shiftDateTime.getTime() - 10 * 60000) // 10 mins before
                const now = new Date()

                if (reminderTime > now) {
                    const delay = reminderTime.getTime() - now.getTime()

                    console.log(`Scheduling local notification for shift ${schedule.id} at ${reminderTime.toLocaleString()}`)

                    setTimeout(async () => {
                        // Check if Service Worker is available (required for mobile)
                        if ('serviceWorker' in navigator) {
                            try {
                                const registration = await navigator.serviceWorker.ready
                                await registration.showNotification('⏰ Sắp đến giờ làm việc!', {
                                    body: `Ca làm "${schedule.title || 'của bạn'}" bắt đầu lúc ${schedule.start_time}. Hãy vào app chấm công!`,
                                    icon: '/iconapp.png',
                                    badge: '/iconapp.png',
                                    tag: `shift-${schedule.id}`,
                                    requireInteraction: true,
                                    data: {
                                        shiftId: schedule.id,
                                        type: 'shift_reminder',
                                        url: '/'
                                    }
                                })

                                console.log(`Local notification shown via Service Worker for shift ${schedule.id}`)
                            } catch (err) {
                                console.error('Error showing SW notification:', err)
                            }
                        } else {
                            // Fallback for desktop browsers without SW
                            try {
                                new Notification('⏰ Sắp đến giờ làm việc!', {
                                    body: `Ca làm "${schedule.title || 'của bạn'}" bắt đầu lúc ${schedule.start_time}. Hãy vào app chấm công!`,
                                    icon: '/iconapp.png',
                                    badge: '/iconapp.png',
                                    tag: `shift-${schedule.id}`,
                                    requireInteraction: true,
                                    data: {
                                        shiftId: schedule.id,
                                        type: 'shift_reminder'
                                    }
                                })

                                console.log(`Local notification shown via Notification API for shift ${schedule.id}`)
                            } catch (err) {
                                console.error('Error showing notification:', err)
                            }
                        }

                        // Log to database that local notification was shown
                        supabase
                            .from('notification_logs')
                            .insert({
                                user_id: user.id,
                                shift_id: schedule.id,
                                notification_type: 'local',
                                status: 'sent'
                            })
                            .then(() => console.log(`Logged local notification for shift ${schedule.id}`))

                    }, delay)
                }
            })
        }

        setupLocalNotifications()
    }, [])
}

'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useLocalNotifications() {
    useEffect(() => {
        const setupLocalNotifications = async () => {
            try {
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

                // Fetch schedules and user preferences
                const [schedulesRes, profileRes] = await Promise.all([
                    supabase
                        .from('work_schedules')
                        .select('id, work_date, start_time, end_time, title')
                        .eq('user_id', user.id)
                        .in('work_date', [today, tomorrow])
                        .order('work_date', { ascending: true }),
                    supabase
                        .from('profiles')
                        .select('clock_in_remind_minutes, clock_out_remind_mode, clock_out_remind_minutes')
                        .eq('id', user.id)
                        .single()
                ])

                const schedules = schedulesRes.data
                const profile = profileRes.data

                if (!schedules) {
                    return
                }

                console.log(`Found ${schedules.length} upcoming shifts for local notifications`)

                const clockInMins = profile?.clock_in_remind_minutes ?? 10
                const clockOutMode = profile?.clock_out_remind_mode ?? 'after'
                const clockOutMins = profile?.clock_out_remind_minutes ?? 10

                // Schedule local notifications for each shift
                schedules.forEach((schedule) => {
                    const [y, m, d] = schedule.work_date.split('-');
                    const dateDisplay = `${d}/${m}/${y}`;
                    const now = new Date()

                    // --- CLOCK IN REMINDER ---
                    if (schedule.start_time) {
                        const shiftStartDateTime = new Date(`${schedule.work_date}T${schedule.start_time}`)
                        const clockInReminderTime = new Date(shiftStartDateTime.getTime() - clockInMins * 60000)

                        if (clockInReminderTime > now) {
                            const delay = clockInReminderTime.getTime() - now.getTime()

                            setTimeout(async () => {
                                try {
                                    if ('serviceWorker' in navigator) {
                                        try {
                                            const registration = await navigator.serviceWorker.ready
                                            await registration.showNotification('⏰ Sắp đến giờ làm việc!', {
                                                body: `Ca làm "${schedule.title || 'của bạn'}" ngày ${dateDisplay} bắt đầu lúc ${schedule.start_time}. Đừng quên chấm công vào nhé!`,
                                                icon: '/iconapp.png',
                                                badge: '/iconapp.png',
                                                tag: `shift-in-${schedule.id}`,
                                                image: '/clockin.jpg',
                                                actions: [
                                                    { action: 'checkin', title: '✅ Chấm Công' },
                                                    { action: 'dismiss', title: '❌ Bỏ qua' }
                                                ],
                                                requireInteraction: true,
                                                data: { shiftId: schedule.id, type: 'clock_in_reminder', url: '/' }
                                            })
                                        } catch (err) { }
                                    } else {
                                        try {
                                            const n = new Notification('⏰ Sắp đến giờ làm việc!', {
                                                body: `Ca làm "${schedule.title || 'của bạn'}" ngày ${dateDisplay} bắt đầu lúc ${schedule.start_time}. Hãy vào app chấm công!`,
                                                icon: '/iconapp.png',
                                                tag: `shift-in-${schedule.id}`,
                                                requireInteraction: true,
                                                data: { shiftId: schedule.id, type: 'clock_in_reminder', url: '/' }
                                            })
                                            n.onclick = function () {
                                                window.focus()
                                                window.location.href = '/'
                                                this.close()
                                            }
                                        } catch (err) { }
                                    }

                                    supabase.from('notification_logs').insert({
                                        user_id: user.id, shift_id: schedule.id, notification_type: 'local_clock_in', status: 'sent'
                                    }).then()
                                } catch (e) { }
                            }, delay)
                        }
                    }

                    // --- CLOCK OUT REMINDER ---
                    if (schedule.end_time) {
                        const shiftEndDateTime = new Date(`${schedule.work_date}T${schedule.end_time}`)
                        let clockOutReminderTime = new Date(shiftEndDateTime)

                        if (clockOutMode === 'before') {
                            clockOutReminderTime = new Date(shiftEndDateTime.getTime() - clockOutMins * 60000)
                        } else {
                            clockOutReminderTime = new Date(shiftEndDateTime.getTime() + clockOutMins * 60000)
                        }

                        if (clockOutReminderTime > now) {
                            const delayOut = clockOutReminderTime.getTime() - now.getTime()

                            setTimeout(async () => {
                                try {
                                    if ('serviceWorker' in navigator) {
                                        try {
                                            const registration = await navigator.serviceWorker.ready
                                            await registration.showNotification('🏠 Hết giờ làm việc rồi!', {
                                                body: `Ca làm "${schedule.title || 'của bạn'}" đã kết thúc lúc ${schedule.end_time}. Cảm ơn bạn đã cống hiến, đừng quên chấm công ra trước khi về nhé!`,
                                                icon: '/iconapp.png',
                                                badge: '/iconapp.png',
                                                tag: `shift-out-${schedule.id}`,
                                                image: '/clockin.jpg',
                                                actions: [
                                                    { action: 'checkin', title: '✅ Chấm Công Ra' },
                                                    { action: 'dismiss', title: '❌ Bỏ qua' }
                                                ],
                                                requireInteraction: true,
                                                data: { shiftId: schedule.id, type: 'clock_out_reminder', url: '/' }
                                            })
                                        } catch (err) { }
                                    } else {
                                        try {
                                            const n = new Notification('🏠 Hết giờ làm việc rồi!', {
                                                body: `Ca làm "${schedule.title || 'của bạn'}" đã kết thúc lúc ${schedule.end_time}. Chấm công ra ngay nhé!`,
                                                icon: '/iconapp.png',
                                                tag: `shift-out-${schedule.id}`,
                                                requireInteraction: true,
                                                data: { shiftId: schedule.id, type: 'clock_out_reminder', url: '/' }
                                            })
                                            n.onclick = function () {
                                                window.focus()
                                                window.location.href = '/'
                                                this.close()
                                            }
                                        } catch (err) { }
                                    }

                                    supabase.from('notification_logs').insert({
                                        user_id: user.id, shift_id: schedule.id, notification_type: 'local_clock_out', status: 'sent'
                                    }).then()
                                } catch (e) { }
                            }, delayOut)
                        }
                    }
                })
            } catch (err) {
                console.warn('⚠️ [useLocalNotifications] Setup error:', err)
            }
        }

        setupLocalNotifications()
    }, [])
}

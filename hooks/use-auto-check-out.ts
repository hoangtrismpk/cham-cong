'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut } from '@/app/actions/attendance'
import { createClient } from '@/utils/supabase/client'
import { calculateDistance } from '@/utils/geo'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export function useAutoCheckOut(workSettings: any) {
    const processedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        async function attemptAutoCheckOut() {
            // Prevent double firing in React Strict Mode
            if (processedRef.current) return
            processedRef.current = true

            try {
                const supabase = createClient()

                // 1. Check Login & Profile Settings
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('auto_checkout_enabled, clock_out_remind_mode, clock_out_remind_minutes')
                    .eq('id', user.id)
                    .single()

                if (!profile || !profile.auto_checkout_enabled) {
                    console.log('🤖 Auto-CheckOut: Disabled by user.')
                    return
                }

                const remindMode = profile.clock_out_remind_mode ?? 'before'
                const remindMinutes = profile.clock_out_remind_minutes ?? 5

                // Get Today in VN Time (YYYY-MM-DD)
                const today = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(new Date())

                // 2. Check for ANY active session (Checked in but not checked out)
                const { data: activeLogs } = await supabase
                    .from('attendance_logs')
                    .select('*')
                    .eq('user_id', user.id)
                    .is('check_out_time', null)
                    .order('created_at', { ascending: false })
                    .limit(1)

                if (!activeLogs || activeLogs.length === 0) {
                    console.log('🤖 Auto-CheckOut: No active session found.')
                    return
                }

                const activeLog = activeLogs[0]

                // 3. Get Today's Schedules to find end time
                const { data: schedules } = await supabase
                    .from('work_schedules')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('work_date', today)

                if (!schedules || schedules.length === 0) return

                console.log(`🤖 Auto-CheckOut: Found ${schedules.length} shifts today. Looking for match...`)

                // 4. Find the matching schedule and validate time window
                let shouldCheckOut = false

                for (const schedule of schedules) {
                    if (!schedule.end_time) continue

                    const endTimeParts = schedule.end_time.split(':')
                    const shiftEnd = new Date()
                    shiftEnd.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0)

                    const now = new Date()
                    const diffMs = now.getTime() - shiftEnd.getTime()
                    const diffMins = diffMs / 60000

                    console.log(`🤖 Shift ${schedule.start_time}-${schedule.end_time}: diff from end = ${diffMins.toFixed(1)} mins (mode: ${remindMode}, window: ${remindMinutes} mins)`)

                    // Time window check based on user's preference
                    // diffMins > 0 means we're PAST the end time
                    // diffMins < 0 means we're BEFORE the end time
                    if (remindMode === 'before') {
                        // Allow from X minutes before end time to 8 hours after
                        if (diffMins >= -remindMinutes && diffMins <= 480) {
                            shouldCheckOut = true
                            console.log(`🤖 Match (before mode): ${remindMinutes}min before shift end`, schedule.title)
                            break
                        }
                    } else {
                        // 'after' mode: Allow from shift end to X minutes after, or anytime up to 8 hours late
                        if (diffMins >= 0 && diffMins <= Math.max(remindMinutes, 480)) {
                            shouldCheckOut = true
                            console.log(`🤖 Match (after mode): ${remindMinutes}min after shift end`, schedule.title)
                            break
                        }
                    }
                }

                if (!shouldCheckOut) {
                    console.log('🤖 Auto-CheckOut: Outside window. Not time to checkout yet.')
                    return
                }

                // 5. Attempt 1: IP-based Verification
                console.log('🤖 Auto-CheckOut: Attempting IP-based verification...')
                const ipResult = await checkOut()

                if (!ipResult.error) {
                    // Confetti celebration!
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#fb923c', '#f97316', '#fdba74']
                    })
                    toast.success('🎉 Tự động Check-out thành công! (Wifi Công ty)', {
                        duration: 4000,
                        description: 'Hẹn gặp lại bạn ngày mai!'
                    })
                    router.refresh()
                    return
                } else {
                    // If already checked out, stop
                    if (ipResult.error.includes('Không tìm thấy') || ipResult.error.includes('No active')) {
                        console.log('🤖 Auto-CheckOut: Already checked out or no session.')
                        return
                    }
                    console.log('🤖 Auto-CheckOut: IP check failed, falling back to GPS.', ipResult.error)
                }

                // 6. Attempt 2: GPS Check & Action
                if (!navigator.geolocation) {
                    console.log('🤖 Auto-CheckOut: GPS not supported')
                    return
                }

                console.log('🤖 Auto-CheckOut: Checking location (Timeout: 20s)...')

                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords
                        console.log('🤖 GPS Locked:', latitude, longitude)

                        const distance = calculateDistance(
                            latitude,
                            longitude,
                            parseFloat(workSettings.office_latitude),
                            parseFloat(workSettings.office_longitude)
                        )

                        console.log(`🤖 Distance: ${distance.toFixed(0)}m (Max: ${workSettings.max_distance_meters}m)`)

                        if (distance <= workSettings.max_distance_meters) {
                            toast.info('📍 Đang tự động chấm ra (GPS)...')

                            const result = await checkOut(latitude, longitude)

                            if (!result.error) {
                                // Confetti celebration!
                                confetti({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ['#fb923c', '#f97316', '#fdba74']
                                })
                                toast.success('🎉 Tự động Check-out thành công! (GPS)', {
                                    duration: 4000,
                                    description: 'Chúc bạn buổi tối vui vẻ!'
                                })
                                router.refresh()
                            } else {
                                if (result.error.includes('Không tìm thấy') || result.error.includes('No active')) {
                                    console.log('🤖 Auto-CheckOut: Already done.')
                                } else {
                                    console.error('🤖 Auto-CheckOut Failed:', result.error)
                                }
                            }
                        } else {
                            console.log(`🤖 Auto-CheckOut: Too far.`)
                        }
                    },
                    (err) => {
                        console.error('🤖 Auto-CheckOut: GPS Error Code:', err.code, err.message)
                        if (err.code === 3) {
                            console.log('🤖 GPS Timeout')
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 10000
                    }
                )

            } catch (e) {
                console.error('🤖 Auto-CheckOut Exception:', e)
            }
        }

        attemptAutoCheckOut()
    }, [router])
}

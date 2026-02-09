'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkIn } from '@/app/actions/attendance'
import { createClient } from '@/utils/supabase/client'
import { calculateDistance } from '@/utils/geo'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export function useAutoCheckIn(workSettings: any) {
    const processedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        async function attemptAutoCheckIn() {
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
                    .select('auto_checkin_enabled')
                    .eq('id', user.id)
                    .single()

                if (!profile || !profile.auto_checkin_enabled) {
                    console.log('🤖 Auto-CheckIn: Disabled by user.')
                    return
                }

                const today = new Date().toISOString().split('T')[0]

                // 2. Check for ANY active session (Checked in but not checked out)
                const { data: activeLogs } = await supabase
                    .from('attendance_logs')
                    .select('id')
                    .eq('user_id', user.id)
                    .is('check_out_time', null)

                if (activeLogs && activeLogs.length > 0) {
                    console.log('🤖 Auto-CheckIn: User already has an active session.')
                    return
                }

                // 3. Get ALL Today's Schedules
                const { data: schedules } = await supabase
                    .from('work_schedules')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('work_date', today)

                if (!schedules || schedules.length === 0) return

                console.log(`🤖 Auto-CheckIn: Found ${schedules.length} shifts today. Looking for match...`)

                // 4. Find the matching schedule (Time Window Check)
                let targetSchedule = null

                for (const schedule of schedules) {
                    if (!schedule.start_time) continue

                    const startTimeParts = schedule.start_time.split(':')
                    const shiftStart = new Date()
                    shiftStart.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0)

                    const now = new Date()
                    const diffMs = shiftStart.getTime() - now.getTime()
                    const diffMins = diffMs / 60000

                    // Log for debugging
                    console.log(`🤖 Shift ${schedule.start_time}: diff = ${diffMins.toFixed(1)} mins`)

                    // Window: [Start - 15m] to [Start + 30m]
                    // diffMins > 0 means Future. diffMins < 0 means Past.
                    // Validation: diffMins <= 15 (Not too early) AND diffMins > -60 (Not too late - extended to 60m for ease)
                    if (diffMins <= 15 && diffMins > -60) {
                        targetSchedule = schedule
                        console.log('🤖 Match found:', schedule.title, 'at', schedule.start_time)
                        break // Found the relevant shift, stop looking
                    }
                }

                if (!targetSchedule) {
                    console.log('🤖 Auto-CheckIn: No matching shift in current time window.')
                    return
                }

                // 5. Attempt 1: IP-based Verification
                console.log('🤖 Auto-CheckIn: Attempting IP-based verification...')
                const ipResult = await checkIn() // Call without GPS first

                if (!ipResult.error) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#10b981', '#34d399', '#6ee7b7']
                    })
                    toast.success('🎉 Tự động Check-in thành công! (Wifi Công ty)', {
                        duration: 4000,
                        description: 'Chào mừng bạn đến văn phòng!'
                    })
                    router.refresh()
                    return
                } else {
                    // If error is "Already checked in", consider it success
                    if (ipResult.error.includes('đang trong ca') || ipResult.error.includes('Checked in')) {
                        console.log('🤖 Auto-CheckIn: Server confirmed done (IP check).')
                        return
                    }
                    console.log('🤖 Auto-CheckIn: IP check failed, falling back to GPS.', ipResult.error)
                    // Continue to GPS logic...
                }

                // 6. Attempt 2: GPS Check & Action
                if (!navigator.geolocation) {
                    console.log('🤖 Auto-CheckIn: GPS not supported')
                    return
                }

                console.log('🤖 Auto-CheckIn: Checking location (Timeout: 15s)...')

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
                            toast.info('📍 Đang tự động chấm công (GPS)...')

                            const result = await checkIn(latitude, longitude)

                            if (!result.error) {
                                confetti({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ['#10b981', '#34d399', '#6ee7b7']
                                })
                                toast.success('🎉 Tự động Check-in thành công! (GPS)', {
                                    duration: 4000,
                                    description: 'Chúc bạn một ngày làm việc hiệu quả!'
                                })
                                router.refresh()
                            } else {
                                if (result.error.includes('đang trong ca') || result.error.includes('Checked in')) {
                                    console.log('🤖 Auto-CheckIn: Server confirmed done.')
                                } else {
                                    console.error('🤖 Auto-CheckIn Failed:', result.error)
                                }
                            }
                        } else {
                            console.log(`🤖 Auto-CheckIn: Too far.`)
                        }
                    },
                    (err) => {
                        console.error('🤖 Auto-CheckIn: GPS Error Code:', err.code, err.message)
                        if (err.code === 3) {
                            console.log('🤖 GPS Timeout - retrying might help?')
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 20000, // Increased to 20s
                        maximumAge: 10000
                    }
                )

            } catch (e) {
                console.error('🤖 Auto-CheckIn Exception:', e)
            }
        }

        attemptAutoCheckIn()
    }, [router])
}

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { attemptAutoCheckIn } from '@/app/actions/auto-attendance'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

/**
 * useAutoCheckIn - Optimized v2
 * 
 * Performance: ~0.5-0.8s (IP) / ~2-5s (GPS fallback)
 * vs Old: ~2-3s (IP) / ~10-25s (GPS)
 * 
 * Strategy:
 * 1. Pre-warm GPS immediately (non-blocking)
 * 2. Call single server action (IP verification first)
 * 3. If server says "need_gps" → use pre-warmed GPS data
 */
export function useAutoCheckIn(workSettings: any) {
    const processedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        // ─── GPS Pre-warm (starts immediately, non-blocking) ───
        let gpsData: { lat: number; lng: number } | null = null

        const gpsReady = new Promise<void>(resolve => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
                resolve()
                return
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    gpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    console.log('🤖 GPS Pre-warmed:', gpsData.lat, gpsData.lng)
                    resolve()
                },
                (err) => {
                    console.log('🤖 GPS Pre-warm failed:', err.code, err.message)
                    resolve()
                },
                {
                    enableHighAccuracy: false, // Fast first lock
                    timeout: 10000,            // 10s (was 20s)
                    maximumAge: 30000          // Accept 30s old position
                }
            )
        })

        // ─── Main flow ───
        async function run() {
            try {
                console.log('🤖 Auto-CheckIn v2: Starting (single server call)...')

                // Step 1: Try IP-first (no GPS)
                const result = await attemptAutoCheckIn()

                if (result.status === 'success') {
                    celebrate('check-in', result.reason || 'wifi')
                    router.refresh()
                    return
                }

                if (result.status === 'skipped') {
                    console.log('🤖 Auto-CheckIn: Skipped -', result.reason)
                    return
                }

                if (result.status === 'error') {
                    console.error('🤖 Auto-CheckIn: Error -', result.error)
                    return
                }

                // Step 2: Server says "need_gps" → wait for pre-warmed data
                if (result.status === 'need_gps') {
                    console.log('🤖 Auto-CheckIn: IP failed, waiting for GPS pre-warm...')

                    // Wait for GPS (already started earlier, should be ready or nearly ready)
                    await gpsReady

                    if (!gpsData) {
                        console.log('🤖 Auto-CheckIn: GPS unavailable, stopping.')
                        return
                    }

                    console.log(`🤖 Auto-CheckIn: GPS ready, retrying with (${gpsData.lat}, ${gpsData.lng})...`)
                    toast.info('📍 Đang xác thực vị trí (GPS)...', { id: 'auto-checkin-gps' })

                    const gpsResult = await attemptAutoCheckIn(gpsData.lat, gpsData.lng)

                    if (gpsResult.status === 'success') {
                        toast.dismiss('auto-checkin-gps')
                        celebrate('check-in', 'gps')
                        router.refresh()
                    } else if (gpsResult.status === 'skipped' && gpsResult.reason?.startsWith('too_far')) {
                        console.log('🤖 Auto-CheckIn: GPS location too far from office.')
                        const dist = gpsResult.reason.split('|')[1] || 'không xác định'
                        toast.warning(`Không thể tự động vào ca do vị trí lệch ${dist} so với Công ty`, {
                            id: 'auto-checkin-gps',
                            duration: 5000
                        })
                    } else {
                        toast.dismiss('auto-checkin-gps')
                        console.log('🤖 Auto-CheckIn: GPS attempt result -', gpsResult.status, gpsResult.reason)
                    }
                }

            } catch (e) {
                console.error('🤖 Auto-CheckIn Exception:', e)
            }
        }

        run()
    }, [router])
}

/**
 * Celebratory animation + toast
 */
function celebrate(type: 'check-in' | 'check-out', method: string) {
    const isCheckIn = type === 'check-in'
    const colors = isCheckIn
        ? ['#10b981', '#34d399', '#6ee7b7']
        : ['#fb923c', '#f97316', '#fdba74']

    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors
    })

    const methodLabel = method.includes('wifi') ? 'Wifi Công ty'
        : method.includes('gps') ? 'GPS'
            : method

    toast.success(
        `🎉 Tự động ${isCheckIn ? 'Check-in' : 'Check-out'} thành công! (${methodLabel})`,
        {
            duration: 4000,
            description: isCheckIn
                ? 'Chào mừng bạn đến văn phòng!'
                : 'Hẹn gặp lại bạn ngày mai!'
        }
    )
}

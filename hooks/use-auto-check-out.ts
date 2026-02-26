'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { attemptAutoCheckOut } from '@/app/actions/auto-attendance'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

/**
 * useAutoCheckOut - Optimized v2
 * 
 * Same strategy as useAutoCheckIn:
 * 1. Pre-warm GPS immediately
 * 2. Single server action (IP first)
 * 3. GPS fallback with pre-warmed data
 */
export function useAutoCheckOut(workSettings: any) {
    const processedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        // ─── GPS Pre-warm ───
        let gpsData: { lat: number; lng: number } | null = null

        const gpsReady = new Promise<void>(resolve => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
                resolve()
                return
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    gpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    console.log('🤖 GPS Pre-warmed (checkout):', gpsData.lat, gpsData.lng)
                    resolve()
                },
                (err) => {
                    console.log('🤖 GPS Pre-warm failed (checkout):', err.code, err.message)
                    resolve()
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 30000
                }
            )
        })

        // ─── Main flow ───
        async function run() {
            try {
                console.log('🤖 Auto-CheckOut v2: Starting (single server call)...')

                // Step 1: Try IP-first
                const result = await attemptAutoCheckOut()

                if (result.status === 'success') {
                    celebrate()
                    router.refresh()
                    return
                }

                if (result.status === 'skipped') {
                    console.log('🤖 Auto-CheckOut: Skipped -', result.reason)
                    return
                }

                if (result.status === 'error') {
                    console.error('🤖 Auto-CheckOut: Error -', result.error)
                    return
                }

                // Step 2: GPS fallback
                if (result.status === 'need_gps') {
                    console.log('🤖 Auto-CheckOut: IP failed, waiting for GPS pre-warm...')
                    await gpsReady

                    if (!gpsData) {
                        console.log('🤖 Auto-CheckOut: GPS unavailable, stopping.')
                        return
                    }

                    console.log(`🤖 Auto-CheckOut: GPS ready, retrying...`)
                    toast.info('📍 Đang xác thực vị trí ra (GPS)...')

                    const gpsResult = await attemptAutoCheckOut(gpsData.lat, gpsData.lng)

                    if (gpsResult.status === 'success') {
                        celebrate()
                        router.refresh()
                    } else {
                        console.log('🤖 Auto-CheckOut: GPS result -', gpsResult.status, gpsResult.reason)
                    }
                }

            } catch (e) {
                console.error('🤖 Auto-CheckOut Exception:', e)
            }
        }

        run()
    }, [router])
}

function celebrate() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fb923c', '#f97316', '#fdba74']
    })

    toast.success('🎉 Tự động Check-out thành công!', {
        duration: 4000,
        description: 'Hẹn gặp lại bạn ngày mai!'
    })
}

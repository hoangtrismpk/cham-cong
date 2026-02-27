'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { attemptAutoCheckIn, attemptAutoCheckOut } from '@/app/actions/auto-attendance'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface SSRAutoResult {
    action: 'none' | 'checked_in' | 'checked_out' | 'need_gps_checkin' | 'need_gps_checkout'
    reason?: string
    method?: string
}

/**
 * AutoAttendanceHandler v3 - Unified component
 * 
 * Handles 2 scenarios:
 * 1. SSR already checked in/out via IP → Just show celebration animation
 * 2. SSR says "need_gps" → Use GPS to complete the check-in/out
 * 
 * This replaces both AutoCheckInSetup and AutoCheckOutSetup.
 */
export function AutoAttendanceHandler({ ssrResult }: { ssrResult: SSRAutoResult }) {
    const processedRef = useRef(false)
    const router = useRouter()

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        // ─── Case 1: SSR already handled it (instant!) ───
        if (ssrResult.action === 'checked_in') {
            console.log('🚀 SSR Auto Check-in: SUCCESS (0ms client delay)')
            celebrate('check-in', ssrResult.method || 'wifi')
            return
        }

        if (ssrResult.action === 'checked_out') {
            console.log('🚀 SSR Auto Check-out: SUCCESS (0ms client delay)')
            celebrate('check-out', ssrResult.method || 'wifi')
            return
        }

        // ─── Case 2: Need GPS fallback ───
        if (ssrResult.action === 'need_gps_checkin' || ssrResult.action === 'need_gps_checkout') {
            handleGpsFallback(ssrResult.action)
        }

        // Case 'none': Nothing to do
        if (ssrResult.action === 'none') {
            console.log('🤖 SSR Auto Attendance: No action needed -', ssrResult.reason)
        }

        async function handleGpsFallback(action: 'need_gps_checkin' | 'need_gps_checkout') {
            const isCheckIn = action === 'need_gps_checkin'
            const label = isCheckIn ? 'Check-in' : 'Check-out'
            const toastId = isCheckIn ? 'auto-checkin-gps' : 'auto-checkout-gps'

            console.log(`🤖 SSR ${label}: IP failed, starting GPS fallback...`)

            // Get GPS position
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
                console.log(`🤖 ${label}: GPS not available`)
                return
            }

            toast.info(`📍 Đang xác thực vị trí (GPS) để tự động ${isCheckIn ? 'vào ca' : 'ra ca'}...`, { id: toastId })

            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 30000
                    })
                })

                const lat = position.coords.latitude
                const lng = position.coords.longitude
                console.log(`🤖 ${label}: GPS acquired (${lat}, ${lng}), calling server...`)

                const result = isCheckIn
                    ? await attemptAutoCheckIn(lat, lng)
                    : await attemptAutoCheckOut(lat, lng)

                if (result.status === 'success') {
                    toast.dismiss(toastId)
                    celebrate(isCheckIn ? 'check-in' : 'check-out', 'gps')
                    router.refresh()
                } else if (result.status === 'skipped' && result.reason?.startsWith('too_far')) {
                    const dist = result.reason.split('|')[1] || 'không xác định'
                    toast.warning(
                        `Không thể tự động ${isCheckIn ? 'vào ca' : 'ra ca'} do vị trí lệch ${dist} so với Công ty`,
                        { id: toastId, duration: 5000 }
                    )
                } else {
                    toast.dismiss(toastId)
                    console.log(`🤖 ${label}: GPS result -`, result.status, result.reason)
                }

            } catch (gpsError: any) {
                toast.dismiss(toastId)
                console.log(`🤖 ${label}: GPS error -`, gpsError.message || gpsError.code)
            }
        }

    }, [ssrResult, router])

    return null
}

// ──────────────────────────────────────────────
// Shared celebration animation
// ──────────────────────────────────────────────
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

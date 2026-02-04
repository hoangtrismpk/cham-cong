'use client'

import { useState, useEffect, useRef } from 'react'
import { OFFICE_COORDINATES, MAX_DISTANCE_METERS, calculateDistance } from '@/utils/geo'
import { checkIn, checkOut } from '@/app/actions/attendance'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/contexts/i18n-context'

interface CheckInButtonProps {
    isCheckedIn: boolean
    isCheckedOut: boolean
    userName: string
}

export function CheckInButton({ isCheckedIn, isCheckedOut, userName }: CheckInButtonProps) {
    const { t } = useI18n()
    const [loading, setLoading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()
    const autoCheckedRef = useRef(false)

    const isComplete = isCheckedIn && isCheckedOut

    const handleAction = () => {
        // Multi-session mode: Never disable button based on isComplete


        setLoading(true)
        setError(null)
        setSuccess(null)

        if (!navigator.geolocation) {
            setError(t.messages.positionUnavailable)
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords

                try {
                    let result
                    if (isCheckedIn) {
                        result = await checkOut(latitude, longitude)
                    } else {
                        result = await checkIn(latitude, longitude)
                    }

                    if (result.error) {
                        setError(result.error)
                        setLoading(false)
                    } else {
                        setSuccess(isCheckedIn ? t.messages.checkOutSuccess : t.messages.checkInSuccess)
                        setIsProcessing(true)
                        setTimeout(() => {
                            router.refresh()
                        }, 1500)
                    }
                } catch (e) {
                    setError(t.common.error)
                    setLoading(false)
                }
            },
            async (err) => {
                console.log('GPS failed, trying IP verification...', err.message)
                try {
                    let result
                    if (isCheckedIn) {
                        result = await checkOut()
                    } else {
                        result = await checkIn()
                    }

                    if (result.error) {
                        setError(result.error)
                        setLoading(false)
                    } else {
                        setSuccess(isCheckedIn ? t.messages.checkOutSuccess : t.messages.checkInSuccess)
                        setIsProcessing(true)
                        setTimeout(() => {
                            router.refresh()
                        }, 1500)
                    }
                } catch (e) {
                    setError(t.common.error)
                    setLoading(false)
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        )
    }

    // Auto Clock-in Logic (Keep simple, mostly for GPS area)
    useEffect(() => {
        if (isCheckedIn || isCheckedOut || autoCheckedRef.current) return

        // Also try an immediate IP-based auto check-in if GPS is slow
        const tryIpCheckIn = async () => {
            // We can't easily "check" IP on client, so we just try calling the action
            // If we want to avoid double calls or noise, we can wait.
            // For now, let's keep the GPS auto-check as it's more specific.
        }

        const triggerAutoCheckIn = () => {
            if (!navigator.geolocation) return

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    const distance = calculateDistance(
                        latitude,
                        longitude,
                        OFFICE_COORDINATES.latitude,
                        OFFICE_COORDINATES.longitude
                    )

                    if (distance <= MAX_DISTANCE_METERS) {
                        console.log('Auto clock-in triggered: User in range')
                        autoCheckedRef.current = true
                        handleAction()
                    }
                },
                (err) => console.log('Auto check-in location error:', err),
                { enableHighAccuracy: true, timeout: 5000 }
            )
        }

        // Delay slightly for better UX/stability
        const timer = setTimeout(triggerAutoCheckIn, 2000)
        return () => clearTimeout(timer)
    }, [isCheckedIn, isCheckedOut])

    // Reset state when props change (Server data updated)
    useEffect(() => {
        setLoading(false)
        setIsProcessing(false)
        setSuccess(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCheckedIn, isCheckedOut])

    // Neon Circular Button Design
    return (
        <div className="flex flex-col items-center space-y-6">
            <button
                onClick={handleAction}
                disabled={loading || isProcessing}
                className={`group relative flex items-center justify-center w-56 h-56 rounded-full border-4 transition-all duration-500 neon-border
                             ${(loading || isProcessing) ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-90'}
             ${isCheckedIn
                        ? 'bg-slate-900 border-orange-400/60 hover:border-orange-300 animate-pulse-amber'
                        : 'bg-slate-900 border-primary/50 hover:border-primary animate-pulse-primary'
                    }
        `}
            >
                {/* Animated Dashed Ring */}
                {!loading && (
                    <div className={`absolute inset-4 rounded-full border-2 border-dashed border-slate-700 transition-transform duration-[4000ms] group-hover:rotate-180`}></div>
                )}
                {loading && (
                    <div className="absolute inset-4 rounded-full border-2 border-dashed border-primary animate-spin-slow"></div>
                )}

                <div className="flex flex-col items-center gap-2 relative z-10">
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined text-5xl text-slate-400 mb-2 animate-pulse">location_searching</span>
                            <span className="text-white text-lg font-bold tracking-wider">{t.dashboard.locating}</span>
                        </>
                    ) : isCheckedIn ? (
                        <>
                            <span className="material-symbols-outlined text-5xl text-amber-500 mb-2">logout</span>
                            <span className="text-white text-xl font-bold tracking-widest">{t.dashboard.checkOut}</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-5xl text-primary mb-2">fingerprint</span>
                            <span className="text-white text-xl font-bold tracking-widest">{t.dashboard.checkIn}</span>
                        </>
                    )}
                </div>
            </button>

            {/* Helper Text */}
            <p className={`text-sm italic font-medium ${isCheckedIn ? 'text-green-400' : 'text-slate-500'}`}>
                {isCheckedIn ? t.dashboard.checkedInMessage : t.dashboard.readyToStart.replace('{{name}}', userName)}
            </p>

            {/* Errors / Success Messages */}
            {error && (
                <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg text-center max-w-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-900/50 rounded-lg text-center max-w-sm">
                    {success}
                </div>
            )}
        </div>
    )
}

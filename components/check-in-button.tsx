'use client'

import { useState, useEffect, useRef } from 'react'
import { calculateDistance } from '@/utils/geo'
import { checkIn, checkOut } from '@/app/actions/attendance'
import { createOvertimeRequest } from '@/app/actions/overtime'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/contexts/i18n-context'
import { toast } from 'sonner'
import { Fingerprint, Loader2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CheckInButtonProps {
    isCheckedIn: boolean
    isCheckedOut: boolean
    userName: string
    workSettings: any
    todayShift: any
}

export function CheckInButton({ isCheckedIn, isCheckedOut, userName, workSettings, todayShift }: CheckInButtonProps) {
    const { t } = useI18n()
    const [loading, setLoading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showOTDialog, setShowOTDialog] = useState(false)
    const [suggestedOTMinutes, setSuggestedOTMinutes] = useState(0)
    const [isSubmittingOT, setIsSubmittingOT] = useState(false)

    const router = useRouter()
    const autoCheckedRef = useRef(false)

    const isComplete = isCheckedIn && isCheckedOut

    const handleAction = () => {
        // Prevent double actions
        if (loading || isProcessing) return

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
                try {
                    const { latitude, longitude } = position.coords

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
                        // After successful checkout, check for late clock-out (> 30 mins)
                        if (isCheckedIn) {
                            checkLateClockOut()
                        }

                        // Add date time to success message
                        const now = new Date()
                        const dateStr = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)
                        const baseMsg = isCheckedIn ? t.messages.checkOutSuccess : t.messages.checkInSuccess
                        setSuccess(`${baseMsg} (${dateStr})`)
                        setIsProcessing(true)
                        router.refresh()
                        setTimeout(() => {
                            setSuccess(null)
                            setIsProcessing(false)
                        }, 5000)
                    }
                } catch (e) {

                    console.error('❌ [CheckInButton] Action error:', e)
                    setError(t.common.error)
                    setLoading(false)
                }
            },
            async (err) => {
                try {
                    console.log('GPS failed, trying IP verification...', err.message)
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
                        // After successful checkout, check for late clock-out (> 30 mins)
                        if (isCheckedIn) {
                            checkLateClockOut()
                        }

                        // Add date time to success message
                        const now = new Date()
                        const dateStr = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)
                        const baseMsg = isCheckedIn ? t.messages.checkOutSuccess : t.messages.checkInSuccess
                        setSuccess(`${baseMsg} (${dateStr})`)
                        setIsProcessing(true)
                        router.refresh()
                        setTimeout(() => {
                            setSuccess(null)
                            setIsProcessing(false)
                        }, 5000)
                    }
                } catch (e) {

                    console.error('❌ [CheckInButton] IP Fallback error:', e)
                    setError(t.common.error)
                    setLoading(false)
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000, // Increased to 10s for better stability on Windows
                maximumAge: 0
            }
        )
    }

    // Logic to detect if user clocks out late (> 30 mins)
    const checkLateClockOut = () => {
        if (!todayShift || !todayShift[0]) return

        const shift = todayShift[0]
        const [h, m] = shift.end_time.split(':').map(Number)

        const now = new Date()
        const scheduledEnd = new Date()
        scheduledEnd.setHours(h, m, 0, 0)

        // If current time is more than 30 mins past scheduled end
        const diffMs = now.getTime() - scheduledEnd.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins >= 30) {
            setSuggestedOTMinutes(diffMins)
            setShowOTDialog(true)
        }
    }

    const handleConfirmOvertime = async () => {
        setIsSubmittingOT(true)
        try {
            const hours = Math.round((suggestedOTMinutes / 60) * 10) / 10
            const res = await createOvertimeRequest({
                requestDate: new Date().toISOString().split('T')[0],
                plannedHours: hours,
                reason: `Tăng ca tự động xác nhận sau khi clock-out trễ ${suggestedOTMinutes} phút.`
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Đã tự động gửi yêu cầu tăng ca!')
            }
        } catch (e) {
            console.error('OT Suggestion Error:', e)
        } finally {
            setIsSubmittingOT(false)
            setShowOTDialog(false)
        }
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
                        parseFloat(workSettings.office_latitude),
                        parseFloat(workSettings.office_longitude)
                    )

                    if (distance <= workSettings.max_distance_meters) {
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

    }, [isCheckedIn, isCheckedOut])

    // Neon Circular Button Design
    return (
        <div className="flex flex-col items-center space-y-6 w-full md:w-[500px] mx-auto md:mr-0">
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
                            <div className="relative overflow-hidden inline-flex mb-1 p-2">
                                <Fingerprint strokeWidth={1.2} className={`w-[72px] h-[72px] ${isCheckedIn ? 'text-amber-500/50' : 'text-primary/50'}`} />
                                <div className={`absolute left-0 right-0 h-[3px] animate-scan ${isCheckedIn ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : 'bg-[#00f2ff] shadow-[0_0_12px_#00f2ff]'}`}></div>
                            </div>
                            <span className="text-white text-base font-bold tracking-wider uppercase">{t.dashboard.locating}</span>
                        </>
                    ) : isCheckedIn ? (
                        <>
                            <Fingerprint strokeWidth={1.2} className="w-[72px] h-[72px] text-amber-500 mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-white text-lg font-bold tracking-widest">{t.dashboard.checkOut}</span>
                        </>
                    ) : (
                        <>
                            <Fingerprint strokeWidth={1.2} className="w-[72px] h-[72px] text-primary mb-1 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                            <span className="text-white text-lg font-bold tracking-widest">{t.dashboard.checkIn}</span>

                        </>
                    )}
                </div>
            </button>

            {/* Helper Text */}
            <p className={`text-sm italic font-medium text-center ${isCheckedIn ? 'text-green-400' : 'text-slate-500'}`}>
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

            {/* OT Suggestion Dialog */}
            <AlertDialog open={showOTDialog} onOpenChange={setShowOTDialog}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400">bolt</span>
                            Xác nhận Tăng ca (OT)
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Bạn vừa kết thúc ca làm việc trễ {suggestedOTMinutes} phút.
                            Bạn có muốn gửi yêu cầu tăng ca (~{Math.round((suggestedOTMinutes / 60) * 10) / 10}h) cho Admin phê duyệt không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-slate-700 hover:bg-white/5 text-slate-300">Để sau</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmOvertime()
                            }}
                            className="bg-primary text-black font-bold hover:bg-primary/90"
                            disabled={isSubmittingOT}
                        >
                            {isSubmittingOT ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</>
                            ) : (
                                'Đồng ý, gửi yêu cầu'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

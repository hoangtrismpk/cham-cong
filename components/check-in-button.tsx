'use client'

import { useState, useEffect, useRef } from 'react'
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
    checkInTime?: string | null
}

export function CheckInButton({ isCheckedIn, isCheckedOut, userName, workSettings, todayShift, checkInTime }: CheckInButtonProps) {
    const { t } = useI18n()
    const [loading, setLoading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showOTDialog, setShowOTDialog] = useState(false)
    const [suggestedOTMinutes, setSuggestedOTMinutes] = useState(0)
    const [isSubmittingOT, setIsSubmittingOT] = useState(false)
    const [showEarlyOutDialog, setShowEarlyOutDialog] = useState(false)

    const router = useRouter()
    const isRunningRef = useRef(false) // Synchronous lock to prevent race condition

    const isComplete = isCheckedIn && isCheckedOut

    // Helper: Find next working day (skip off-days from admin settings)
    const getNextWorkingDay = (): Date => {
        const offDays: number[] = workSettings?.work_off_days || [6, 0] // Default: Sat, Sun
        const next = new Date()
        // Start from tomorrow
        next.setDate(next.getDate() + 1)
        // Skip off-days (max 7 iterations to avoid infinite loop)
        let safety = 0
        while (offDays.includes(next.getDay()) && safety < 7) {
            next.setDate(next.getDate() + 1)
            safety++
        }
        return next
    }

    const executeAction = async () => {
        if (isRunningRef.current || loading || isProcessing) return
        isRunningRef.current = true

        setLoading(true)
        setError(null)
        setSuccess(null)

        // Helper to show success after attendance action
        const onSuccess = () => {
            isRunningRef.current = false
            if (isCheckedIn) checkLateClockOut()
            const baseMsg = isCheckedIn ? t.messages.checkOutSuccess : t.messages.checkInSuccess
            if (isCheckedIn) {
                const nextDay = getNextWorkingDay()
                const dateStr = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(nextDay)
                setSuccess(`${baseMsg}\n(${dateStr})`)
            } else {
                const now = new Date()
                const dateStr = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)
                setSuccess(`${baseMsg} (${dateStr})`)
            }
            setIsProcessing(true)
            router.refresh()
            setTimeout(() => { setSuccess(null); setIsProcessing(false) }, 5000)
        }

        const fallbackToGPS = () => {
            if (!navigator.geolocation) {
                isRunningRef.current = false
                setError(t.common.error)
                setLoading(false)
                return
            }

            navigator.geolocation.getCurrentPosition(
                // GPS success → try with GPS coords
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords
                        const result = isCheckedIn
                            ? await checkOut(latitude, longitude)
                            : await checkIn(latitude, longitude)

                        if (!result.error) {
                            onSuccess()
                        } else {
                            // GPS location rejected by server
                            console.log('📍 GPS rejected by server:', result.error)
                            isRunningRef.current = false
                            setError(result.error)
                            setLoading(false)
                        }
                    } catch (e) {
                        console.error('❌ [CheckInButton] GPS action error:', e)
                        isRunningRef.current = false
                        setError(t.common.error)
                        setLoading(false)
                    }
                },
                // GPS failed/blocked (since IP already failed, we just show error)
                async (err) => {
                    let errMsg = err.message
                    if (err.code === err.PERMISSION_DENIED) {
                        errMsg = 'Bạn đã từ chối quyền Vị trí hoặc thiết bị đang chặn quyền này (Đặc biệt trên iPhone/iOS). Vui lòng vào Cài đặt để cấp quyền.'
                        toast.error(errMsg, { duration: 8000 })
                    } else if (err.code === err.TIMEOUT) {
                        errMsg = 'Quá thời gian lấy Vị trí (GPS yếu). Thử đứng gần cửa sổ hoặc ra ngoài trời.'
                        toast.warning(errMsg, { duration: 5000 })
                    } else {
                        toast.warning(`Không thể lấy GPS (${err.message}).`)
                    }
                    console.log('📍 GPS unavailable...', err.message)
                    
                    // Already failed IP check, so we can't fallback to IP safely. Show error to user.
                    isRunningRef.current = false
                    setError('Không có Wifi công ty & Lỗi định vị GPS. Vui lòng kết nối Wifi công ty hoặc bật GPS Điện thoại.')
                    setLoading(false)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000, // Reduced back to 10s max
                    maximumAge: 0 
                }
            )
        }

        // --- ENTRY POINT ---
        try {
            // First Priority: Try IP/Wifi Without GPS (Instantly fast)
            const result = isCheckedIn ? await checkOut() : await checkIn()

            if (!result.error) {
                onSuccess()
                return
            }

            // IP failed. Check if it's a location error that requires GPS fallback
            const errStr = result.error.toLowerCase()
            const isLocationError = errStr.includes('vị trí') || errStr.includes('wifi') || errStr.includes('gps') || errStr.includes('ip') || errStr.includes('bán kính')

            if (isLocationError) {
                // Now we explicitly ask for GPS
                fallbackToGPS()
            } else {
                // Logical errors like "Bạn đã check out rồi", "Tài khoản bị khóa"...
                isRunningRef.current = false
                setError(result.error)
                setLoading(false)
            }
        } catch (e) {
            console.error('❌ [CheckInButton] IP action error:', e)
            isRunningRef.current = false
            setError(t.common.error)
            setLoading(false)
        }
    }

    const handleAction = () => {
        // Double check early checkout scenario to avoid accidental double clicks
        if (isCheckedIn && checkInTime) {
            const checkedInAt = new Date(checkInTime)
            const now = new Date()
            const minsPassed = (now.getTime() - checkedInAt.getTime()) / (1000 * 60)
            if (minsPassed < 60) {
                setShowEarlyOutDialog(true)
                return
            }
        }
        executeAction()
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

    // NOTE: Auto Clock-in is handled by useAutoCheckIn hook (hooks/use-auto-check-in.ts)
    // The old auto check-in logic was removed to prevent race conditions where
    // the old code would show an error toast even after successful auto check-in.

    // Reset state when props change (Server data updated)
    useEffect(() => {
        setLoading(false)
        setIsProcessing(false)
        setSuccess(null)
        setError(null)
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
                <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-900/50 rounded-lg text-center max-w-sm whitespace-pre-line">
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

            {/* Early CheckOut Suggestion Dialog */}
            <AlertDialog open={showEarlyOutDialog} onOpenChange={setShowEarlyOutDialog}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-white !top-auto !bottom-4 !translate-y-0 sm:!bottom-8 w-[90vw] md:w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500">warning</span>
                            Xác nhận Clock Out sớm
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Bạn vừa mới Clock In chưa đầy 1 tiếng trước. Bạn có chắc chắn muốn thoát ca làm việc bây giờ không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="!flex-row w-full justify-between gap-4 space-x-0 sm:space-x-0 mt-6 !space-y-0">
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                setShowEarlyOutDialog(false)
                                executeAction()
                            }}
                            className="bg-amber-600 text-white font-bold hover:bg-amber-700 flex-1 m-0"
                        >
                            Xác nhận Out
                        </AlertDialogAction>
                        <AlertDialogCancel 
                            onClick={() => setShowEarlyOutDialog(false)}
                            className="bg-transparent border-slate-700 hover:bg-white/5 text-slate-300 flex-1 m-0 sm:m-0 mt-0"
                        >
                            Hủy bỏ
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

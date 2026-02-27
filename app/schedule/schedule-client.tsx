'use client'

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, format, addDays, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { getMonthlyShifts, saveShift } from '@/app/actions/schedule' // Import Actions
import { getDefaultAvatar } from '@/utils/avatar'
import { submitLeaveRequest, uploadImageToHost } from '@/app/actions/leave' // Import Leave Actions
import { useI18n } from '@/contexts/i18n-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { UploadCloud } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import { NotificationBell } from '@/components/notification-bell'
import { MobileHeader } from '@/components/mobile-header'
import { ResponsiveModal } from '@/components/ui/responsive-modal'

const formatHM = (t?: string | null) => t && t.length >= 5 ? t.slice(0, 5) : (t || '')


interface ScheduleClientProps {
    user: any
    departmentCount: number
    workSettings: {
        work_start_time: string
        work_end_time: string
        lunch_start_time: string
        lunch_end_time: string
        company_name: string
    }
}

type ViewMode = 'month' | 'week' | 'day'

export function ScheduleClient({ user, departmentCount, workSettings }: ScheduleClientProps) {
    const { t, locale } = useI18n()
    const { setIsOpen } = useSidebar()
    const [viewDate, setViewDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<ViewMode>('month')
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalDate, setModalDate] = useState<Date | null>(null)
    const [showFullCalendarMobile, setShowFullCalendarMobile] = useState(false)
    const [isSavingShift, setIsSavingShift] = useState(false)

    // Leave Request Modal State
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
    const [leaveDate, setLeaveDate] = useState<Date | undefined>(new Date())
    const [leaveStartTime, setLeaveStartTime] = useState(formatHM(workSettings.work_start_time))
    const [leaveEndTime, setLeaveEndTime] = useState(formatHM(workSettings.work_end_time))
    const [leaveHours, setLeaveHours] = useState(0)
    const [leaveType, setLeaveType] = useState('Nghỉ phép năm')
    const [timeError, setTimeError] = useState('')
    const [leaveReason, setLeaveReason] = useState('')
    const [leaveImage, setLeaveImage] = useState<string | null>(null)
    const [leaveFile, setLeaveFile] = useState<File | null>(null) // Store file for lazy upload
    const [isUploading, setIsUploading] = useState(false)

    // Form states
    const [shiftType, setShiftType] = useState('full_day')
    const [startTime, setStartTime] = useState(formatHM(workSettings.work_start_time))
    const [endTime, setEndTime] = useState(formatHM(workSettings.work_end_time))
    const [location, setLocation] = useState(workSettings.company_name)

    const dateLocale = locale === 'vi' ? vi : undefined

    // Shifts state: Record<date, Event[]>
    const [shifts, setShifts] = useState<Record<string, any[]>>({})

    // Calculate hours when times change
    useEffect(() => {
        const calculateHours = () => {
            if (!leaveStartTime || !leaveEndTime) {
                setLeaveHours(0)
                return
            }

            const [sH, sM] = leaveStartTime.split(':').map(Number)
            const [eH, eM] = leaveEndTime.split(':').map(Number)
            const startDec = sH + sM / 60
            const endDec = eH + eM / 60

            // Validation Constraints
            const [wsH, wsM] = workSettings.work_start_time.split(':').map(Number)
            const [weH, weM] = workSettings.work_end_time.split(':').map(Number)

            const startLimit = wsH + wsM / 60
            const endLimit = weH + weM / 60

            let error = ''
            if (startDec < startLimit || startDec > endLimit) error = `Giờ bắt đầu phải từ ${workSettings.work_start_time} đến ${workSettings.work_end_time}`
            else if (endDec < startLimit || endDec > endLimit) error = `Giờ kết thúc phải từ ${workSettings.work_start_time} đến ${workSettings.work_end_time}`
            else if (endDec <= startDec) error = 'Giờ kết thúc phải sau giờ bắt đầu'

            setTimeError(error)

            if (error) {
                setLeaveHours(0)
                return
            }

            let duration = endDec - startDec

            // Lunch break dynamic
            const [lsH, lsM] = workSettings.lunch_start_time.split(':').map(Number)
            const [leH, leM] = workSettings.lunch_end_time.split(':').map(Number)

            const lunchStart = lsH + lsM / 60
            const lunchEnd = leH + leM / 60

            const overlapStart = Math.max(startDec, lunchStart)
            const overlapEnd = Math.min(endDec, lunchEnd)

            if (overlapEnd > overlapStart) {
                duration -= (overlapEnd - overlapStart)
            }

            setLeaveHours(Number(Math.max(0, duration).toFixed(2)))
        }

        calculateHours()
    }, [leaveStartTime, leaveEndTime, leaveDate])

    // Cleanup object URL to avoid memory leaks
    useEffect(() => {
        return () => {
            if (leaveImage && leaveImage.startsWith('blob:')) {
                URL.revokeObjectURL(leaveImage)
            }
        }
    }, [leaveImage])

    // Handler for local file preview
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (file.size > 3 * 1024 * 1024) {
            alert('File size exceeds 3MB limit.')
            return
        }

        // Create local preview
        const previewUrl = URL.createObjectURL(file)
        setLeaveImage(previewUrl)
        setLeaveFile(file)
    }

    // Handler for submitting leave request (Uploads -> Submits -> Updates UI)
    const submitLeave = async () => {
        if (!leaveDate || !leaveReason) {
            toast.error('Vui lòng điền đầy đủ thông tin.')
            return
        }

        if (timeError || leaveHours <= 0) {
            toast.error(timeError || 'Thời gian nghỉ không hợp lệ.')
            return
        }

        setIsUploading(true)

        try {
            let finalImageUrl = ''

            // 1. Upload Image if exists
            if (leaveFile) {
                const formData = new FormData()
                formData.append('file', leaveFile)

                const uploadRes = await uploadImageToHost(formData)
                if (uploadRes.error) {
                    throw new Error(uploadRes.error)
                }
                finalImageUrl = uploadRes.url || ''
            }

            // 2. Submit Leave Request
            const formData = new FormData()
            // Fix: Check dates before format (Lint error)
            const dateStr = leaveDate ? format(leaveDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
            formData.append('leave_date', dateStr)
            formData.append('start_time', leaveStartTime)
            formData.append('end_time', leaveEndTime)
            formData.append('reason', leaveReason)
            formData.append('leave_type', leaveType)
            if (finalImageUrl) formData.append('image_url', finalImageUrl)

            const res = await submitLeaveRequest(formData)

            if (res.error) {
                throw new Error(res.error)
            }

            // 3. UI Updates (Optimistic)
            toast.success('Đã gửi đơn thành công! Đang chờ duyệt.')

            // Add "Nghỉ" shift to calendar immediately
            const newLeave = {
                id: 'temp-' + Date.now(),
                work_date: dateStr,
                title: 'Nghỉ (Chờ duyệt)',
                time: `${leaveStartTime} - ${leaveEndTime}`,
                type: 'leave',
                status: 'pending',
                source: 'leave',
                location: 'Remote/Home',
                members: 0,
                colorClass: 'bg-rose-500 border-rose-500 text-rose-500',
                is_leave: true
            }

            setShifts(prev => {
                const currentEvents = prev[dateStr] || []
                return { ...prev, [dateStr]: [...currentEvents, newLeave] }
            })

            // Reset and Close
            setIsLeaveModalOpen(false)
            setLeaveFile(null)
            setLeaveImage(null)
            setLeaveReason('')

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Submission failed')
        } finally {
            setIsUploading(false)
        }
    }


    // Fetch shifts on mount and when viewDate changes
    const viewMonthStr = format(viewDate, 'yyyy-MM')

    useEffect(() => {
        const fetchShifts = async () => {
            const data = await getMonthlyShifts(viewMonthStr)

            // Need to map server data to UI format locally to ensure colorClass exists
            const mappedShifts: Record<string, any[]> = {}
            Object.keys(data).forEach(key => {
                const dayEvents = data[key] // Array
                if (Array.isArray(dayEvents)) {
                    mappedShifts[key] = dayEvents.map(s => ({
                        ...s,
                        start_time: formatHM(s.start_time),
                        end_time: formatHM(s.end_time),
                        time: s.time ? s.time.split(' - ').map(formatHM).join(' - ') : '',
                        colorClass: s.colorClass || getShiftColor(s.type || s.shift_type),
                        members: s.members_count || departmentCount
                    }))
                }
            })
            setShifts(mappedShifts)
        }
        fetchShifts()
    }, [viewMonthStr, departmentCount])


    // ... (rest of code)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!modalDate) return

        const dateKey = format(modalDate, 'yyyy-MM-dd')

        // ... (check past date logic) ...
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkDate = new Date(modalDate)
        checkDate.setHours(0, 0, 0, 0)

        // Always 'pending' for user modifications
        const status = 'pending'

        // ... (display title logic) ...
        let displayTitle = ''
        if (shiftType === 'full_day') displayTitle = t.schedule.fullDay
        else if (shiftType === 'morning') displayTitle = t.schedule.morningShift
        else if (shiftType === 'afternoon') displayTitle = t.schedule.afternoonShift
        else displayTitle = t.schedule.custom

        // Construct payload for Server Action
        const payload = {
            work_date: dateKey,
            shift_type: shiftType,
            start_time: startTime,
            end_time: endTime,
            location: location,
            title: displayTitle,
            status: status,
            members_count: departmentCount
        }

        // Call Server Action
        setIsSavingShift(true)
        try {
            const result = await saveShift(payload)

            if (result.error) {
                toast.error(`Lỗi: ${result.error}`)
                return
            }

            // Update Local State from Server Response (Confirmed)
            const savedShift = result.data
            const baseColor = getShiftColor(savedShift.shift_type)

            const newShift = {
                ...savedShift,
                type: savedShift.shift_type,
                time: `${formatHM(savedShift.start_time)} - ${formatHM(savedShift.end_time)}`,
                start_time: formatHM(savedShift.start_time),
                end_time: formatHM(savedShift.end_time),
                colorClass: baseColor,
                members: departmentCount,
                source: 'schedule',
                status: 'pending'
            }

            setShifts(prev => {
                const currentDayEvents = prev[dateKey] || []
                // Keep leaves, replace other schedule
                const otherEvents = currentDayEvents.filter(e => e.source === 'leave')
                return {
                    ...prev,
                    [dateKey]: [...otherEvents, newShift]
                }
            })

            toast.success('Đã thêm ca làm việc thành công!')
            setIsModalOpen(false)
        } catch (error) {
            toast.error('Có lỗi xảy ra khi lưu.')
        } finally {
            setIsSavingShift(false)
        }
    }

    // Shift Color Mapping
    const getShiftColor = (type: string) => {
        switch (type) {
            case 'morning': return 'bg-sky-500 border-sky-500 text-sky-500' // Morning: Blue
            case 'afternoon': return 'bg-purple-500 border-purple-500 text-purple-500' // Afternoon: Purple
            case 'full_day': return 'bg-teal-500 border-teal-500 text-teal-500' // Full Day: Teal
            case 'custom': return 'bg-amber-500 border-amber-500 text-amber-500' // Custom: Amber
            case 'leave': return 'bg-rose-500 border-rose-500 text-rose-500' // Leave: Rose/Red
            default: return 'bg-slate-500 border-slate-500 text-slate-500'
        }
    }

    // Status Color Mapping (Priority over type color if status is specific)
    const getStatusColor = (status: string, baseColor: string) => {
        if (status === 'pending') return 'bg-orange-500/20 border-orange-500 text-orange-500 border-dashed'
        return baseColor
    }

    // Helper to filter display events (Hide work shift if Full Day Leave exists)
    const getDisplayEvents = (events: any[]) => {
        if (!events || events.length === 0) return []

        // Check if ANY leave covers the full work duration
        // We compare start_time/end_time strings loosely (e.g. 08:30 vs 08:30:00)
        // If leave starts <= work_start AND leave ends >= work_end => Full Day Leave
        const hasFullDayLeave = events.some(e =>
            e.source === 'leave' &&
            ['approved', 'pending'].includes(e.status) &&
            (e.time?.includes(workSettings.work_start_time) && e.time?.includes(workSettings.work_end_time))
            // Note: Could be more robust by parsing time, but string check is safer for now given formatting
        )

        if (hasFullDayLeave) {
            return events.filter(e => e.source === 'leave')
        }
        return events
    }

    // Calendar generation
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const calendarDays = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd
    })

    const nextMonth = () => setViewDate(addMonths(viewDate, 1))
    const prevMonth = () => setViewDate(subMonths(viewDate, 1))

    const handleShiftTypeChange = (type: string) => {
        setShiftType(type)
        if (type === 'full_day') {
            setStartTime(formatHM(workSettings.work_start_time))
            setEndTime(formatHM(workSettings.work_end_time))
        } else if (type === 'morning') {
            setStartTime(formatHM(workSettings.work_start_time))
            setEndTime(formatHM(workSettings.lunch_start_time))
        } else if (type === 'afternoon') {
            setStartTime(formatHM(workSettings.lunch_end_time))
            setEndTime(formatHM(workSettings.work_end_time))
        }
    }

    const openAddModal = (e: React.MouseEvent, day: Date) => {
        e.stopPropagation()

        // Fulltime check
        const isFulltime = user.contract_type === 'Permanent' || user.contract_type === 'Fulltime' || user?.contract_type?.toLowerCase().includes('full')
        if (isFulltime) {
            toast.info("Nhân viên Fulltime không được phép thay đổi lịch làm việc. Vui lòng đệ trình nghỉ phép nếu cần.")
            return
        }

        // Prevent past dates
        if (isBefore(day, startOfDay(new Date()))) {
            toast.error("Không thể đăng ký lịch cho ngày trong quá khứ")
            return
        }

        setModalDate(day)

        const dateKey = format(day, 'yyyy-MM-dd')
        const dayEvents = shifts[dateKey] || []
        // Find editable work shift (not leave)
        const existing = dayEvents.find(s => s.source !== 'leave')

        if (existing) {
            // Edit Mode: Pre-fill
            let type = existing.type === 'full' ? 'full_day' : (existing.type || 'custom')
            if (['full_day', 'morning', 'afternoon'].includes(type) === false) type = 'custom';

            setShiftType(type)

            if (existing.time && existing.time.includes(' - ')) {
                const [s, e] = existing.time.split(' - ')
                setStartTime(formatHM(s || workSettings.work_start_time))
                setEndTime(formatHM(e || workSettings.work_end_time))
            } else {
                setStartTime(formatHM(existing.start_time || workSettings.work_start_time))
                setEndTime(formatHM(existing.end_time || workSettings.work_end_time))
            }
            setLocation(existing.location || workSettings.company_name)
        } else {
            // New Mode
            setShiftType('full_day')
            setStartTime(formatHM(workSettings.work_start_time))
            setEndTime(formatHM(workSettings.work_end_time))
            setLocation(workSettings.company_name)
        }

        setIsModalOpen(true)
    }


    const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
    const selectedShifts = getDisplayEvents(shifts[selectedDateKey] || [])

    // Calculate Upcoming 7 Days
    const upcomingShifts: any[] = []
    const tomorrow = addDays(new Date(), 1)
    for (let i = 0; i < 7; i++) {
        const d = addDays(tomorrow, i)
        const k = format(d, 'yyyy-MM-dd')
        const dayEvents = shifts[k] || []

        dayEvents.forEach((event: any) => {
            upcomingShifts.push({ ...event, date: d })
        })
    }
    const totalUpcomingHours = upcomingShifts.reduce((acc, curr) => {
        if (curr.is_leave) return acc;
        if (curr.type === 'full_day' || curr.type === 'full') return acc + 8
        if (curr.type === 'morning' || curr.type === 'afternoon') return acc + 4
        return acc + 8
    }, 0)


    const handleOpenLeaveModal = () => {
        const now = new Date()
        const currentHours = now.getHours()
        const currentMinutes = now.getMinutes()
        const currentTotalMinutes = currentHours * 60 + currentMinutes

        const startLimit = 8 * 60 + 30 // 08:30
        const endLimit = 18 * 60 // 18:00

        let startStr = '08:30'

        if (currentTotalMinutes >= startLimit && currentTotalMinutes <= endLimit) {
            // Inside working hours: use current time
            startStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`
        } else {
            // Outside working hours (Before 08:30 or After 18:00): default to 08:30
            startStr = '08:30'
        }

        setLeaveDate(now)
        setLeaveStartTime(startStr)
        setLeaveEndTime('18:00') // Default end to max time
        setLeaveType('Nghỉ phép năm')
        setIsLeaveModalOpen(true)
    }


    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* --- MOBILE HEADER --- */}
            {/* --- MOBILE HEADER --- */}
            <MobileHeader
                title={t.schedule?.title || 'Lịch làm việc'}
                subtitle={format(selectedDate, 'MMM yyyy', { locale: vi })}
            />

            {/* --- DESKTOP HEADER (Hidden on Mobile) --- */}
            <header className="hidden md:flex px-8 py-6 border-b border-border bg-background/50 backdrop-blur-md items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white text-2xl font-bold tracking-tight">{t.schedule.title}</h2>
                    <p className="text-slate-500 text-sm">{t.schedule.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenLeaveModal}
                        className="px-5 py-2.5 bg-primary text-black hover:opacity-90 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/10 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">event_busy</span>
                        {t.schedule.requestLeave}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
                {/* --- MOBILE CALENDAR STRIP (Only Mobile) --- */}
                <div className="flex md:hidden flex-col bg-background-dark/30 border-b border-white/5 shrink-0 px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        {showFullCalendarMobile ? (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        if (!isSameMonth(viewDate, new Date())) {
                                            setViewDate(subMonths(viewDate, 1))
                                        }
                                    }}
                                    disabled={isSameMonth(viewDate, new Date())}
                                    className={`size-8 flex items-center justify-center rounded-full transition-colors ${isSameMonth(viewDate, new Date()) ? 'text-slate-800 cursor-not-allowed' : 'hover:bg-white/10 text-slate-400'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <h2 className="text-lg font-bold text-white capitalize tabular-nums" suppressHydrationWarning>
                                    {format(viewDate, 'MM/yyyy', { locale: dateLocale })}
                                </h2>
                                <button
                                    onClick={() => {
                                        if (viewDate.getMonth() < 11) {
                                            setViewDate(addMonths(viewDate, 1))
                                        }
                                    }}
                                    disabled={viewDate.getMonth() === 11}
                                    className={`size-8 flex items-center justify-center rounded-full transition-colors ${viewDate.getMonth() === 11 ? 'text-slate-800 cursor-not-allowed' : 'hover:bg-white/10 text-slate-400'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        ) : (
                            <h2 className="text-lg font-bold text-white capitalize" suppressHydrationWarning>
                                {format(selectedDate, 'MMMM yyyy', { locale: dateLocale })}
                            </h2>
                        )}

                        <button
                            onClick={() => setShowFullCalendarMobile(!showFullCalendarMobile)}
                            className="px-5 py-2 rounded-full border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-transparent hover:bg-primary/10 transition-colors shadow-[0_0_10px_rgba(45,212,191,0.2)]"
                        >
                            {showFullCalendarMobile ? 'THÁNG' : 'TUẦN'}
                            <span className="material-symbols-outlined text-sm font-bold">{showFullCalendarMobile ? 'expand_less' : 'expand_more'}</span>
                        </button>
                    </div>

                    {showFullCalendarMobile ? (
                        <div className="bg-card/40 rounded-2xl border border-white/5 p-2 animate-in fade-in zoom-in duration-200">
                            <div className="grid grid-cols-7 mb-2">
                                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                                    <div key={i} className="text-center text-[10px] font-bold text-slate-600 py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const shift = shifts[dateKey]
                                    const isSelected = isSameDay(day, selectedDate)
                                    const isTodayDate = isToday(day)
                                    const isCurrentMonth = isSameMonth(day, viewDate)

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedDate(day)
                                                if (!isSameMonth(day, viewDate)) setViewDate(startOfMonth(day))
                                            }}
                                            className={`aspect-square flex flex-col items-center justify-center rounded-lg relative transition-all ${isSelected ? 'bg-primary text-black' : isTodayDate ? 'bg-primary/10 text-primary border border-primary/20' : isCurrentMonth ? 'text-white' : 'text-slate-700'
                                                }`}
                                        >
                                            <span className="text-xs font-bold">{format(day, 'd')}</span>
                                            {shift && !isSelected && <div className="size-1 rounded-full bg-primary mt-0.5 animate-pulse"></div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2 px-2 pt-4 pb-4">
                            {eachDayOfInterval({
                                start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
                                end: endOfWeek(selectedDate, { weekStartsOn: 0 })
                            }).map((day, idx) => {
                                const isSelected = isSameDay(day, selectedDate)
                                const dateKey = format(day, 'yyyy-MM-dd')
                                const shiftData = shifts[dateKey]
                                const rawDayShifts = Array.isArray(shiftData) ? shiftData : (shiftData ? [shiftData] : []);
                                const dayShifts = getDisplayEvents(rawDayShifts)

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDate(day)}
                                        className={`flex flex-col items-center justify-center h-[80px] rounded-lg cursor-pointer transition-all duration-200 border relative ${isSelected
                                            ? 'bg-cyan-400 border-cyan-400 text-black z-10 shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-105'
                                            : 'bg-[#121417] border-white/5 text-slate-500 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-black/60' : 'text-slate-600'}`}>
                                            {format(day, 'EEE', { locale: dateLocale })}
                                        </span>
                                        <span className={`text-xl font-black leading-none ${isSelected ? 'text-black' : 'text-white'}`}>
                                            {format(day, 'd')}
                                        </span>

                                        {/* Shift Dots Indicator - Ensure array handling */}
                                        <div className="flex gap-1 mt-1.5 absolute bottom-2">
                                            {dayShifts.map((s: any, i: number) => {
                                                // Determine Dot Color Logic
                                                let dotColor = 'bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.8)]';

                                                if (s.status === 'pending') {
                                                    dotColor = 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]';
                                                } else if (s.colorClass) {
                                                    // If colorClass includes 'bg-', use it directly
                                                    dotColor = `${s.colorClass} shadow-[0_0_5px] shadow-current`;
                                                } else if (s.type === 'morning') {
                                                    dotColor = 'bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.8)]';
                                                } else if (s.type === 'afternoon') {
                                                    dotColor = 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]';
                                                }

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`size-1.5 rounded-full ${isSelected ? 'bg-black' : dotColor}`}
                                                    ></div>
                                                )
                                            })}
                                            {isSelected && dayShifts.length === 0 && (
                                                <div className="size-1 rounded-full bg-black/50"></div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* --- MOBILE SHIFT LIST (Only Mobile) --- */}
                <div className="flex flex-col md:hidden flex-1 overflow-y-auto bg-background-dark p-6 space-y-6 custom-scrollbar">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 mb-4">
                            Lịch trực ngày {format(selectedDate, 'dd/MM')}
                        </h3>

                        {selectedShifts.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 mb-2">
                                    LỊCH TRỰC NGÀY {format(selectedDate, 'dd/MM')}
                                </h3>

                                {selectedShifts.map((selectedShift: any, idx: number) => {
                                    const isLeave = selectedShift.source === 'leave'
                                    return (
                                        <div
                                            key={idx}
                                            className={`${isLeave ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[#16181b] border-white/5'} rounded-[1.5rem] p-5 border relative overflow-hidden group active:bg-[#1c1f23] transition-colors`}
                                            onClick={(e) => !isLeave && openAddModal(e, selectedDate)}
                                        >
                                            <div className="flex gap-5">
                                                {/* TIME BOX */}
                                                <div className={`flex flex-col items-center justify-center rounded-2xl border w-[5.5rem] h-[5.5rem] shrink-0 shadow-inner ${isLeave ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[#0d0e10] border-white/5'}`}>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isLeave ? 'text-rose-500/50' : 'text-cyan-500/50'}`}>{isLeave ? 'NGHỈ' : 'BẮT ĐẦU'}</span>
                                                    <span className={`text-2xl font-black tracking-tighter ${isLeave ? 'text-rose-400' : 'text-cyan-400'}`}>
                                                        {formatHM(selectedShift.start_time || workSettings.work_start_time)}
                                                    </span>
                                                </div>

                                                {/* INFO COL */}
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {(() => {
                                                            // Dynamic Status Logic
                                                            const getStatusConfig = () => {
                                                                if (selectedShift.status === 'pending')
                                                                    return { text: 'CHỜ DUYỆT', style: 'bg-amber-500/10 border-amber-500/20 text-amber-500' };

                                                                if (selectedShift.is_leave)
                                                                    return { text: 'NGHỈ PHÉP', style: 'bg-rose-500 text-black border-rose-500' }

                                                                const now = new Date();
                                                                const [sH, sM] = (selectedShift.start_time || workSettings.work_start_time).split(':').map(Number);
                                                                const startDt = new Date(selectedDate);
                                                                startDt.setHours(sH, sM, 0, 0);

                                                                const [eH, eM] = (selectedShift.end_time || workSettings.work_end_time).split(':').map(Number);
                                                                const endDt = new Date(selectedDate);
                                                                endDt.setHours(eH, eM, 0, 0);

                                                                if (now < startDt) return { text: 'SẮP DIỄN RA', style: 'bg-orange-500 text-black border-orange-500' };
                                                                if (now > endDt) return { text: 'KẾT THÚC CA', style: 'bg-purple-500/20 text-purple-300 border-purple-500/50' };

                                                                return { text: 'ĐANG TRỰC', style: 'bg-cyan-500 text-black border-cyan-500' };
                                                            };

                                                            const config = getStatusConfig();

                                                            return (
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${config.style}`}>
                                                                    {config.text}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                    <h4 className="text-xl font-bold text-white truncate mb-2">{selectedShift.title}</h4>

                                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-500">location_on</span>
                                                        <span className="truncate">{selectedShift.location}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FOOTER */}
                                            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                    <span className="material-symbols-outlined text-[16px]">timer_off</span>
                                                    <span className="italic">KẾT THÚC: <span className="text-slate-300">{formatHM(selectedShift.end_time || workSettings.work_end_time)}</span></span>
                                                </div>
                                                {!isLeave && (
                                                    <div className="flex items-center gap-2 text-xs font-black text-cyan-400 uppercase tracking-widest">
                                                        <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></span>
                                                        TEAM: {selectedShift.members}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                <div className="space-y-3">
                                    <button
                                        onClick={(e) => openAddModal(e, selectedDate)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 font-bold hover:bg-cyan-400 hover:text-black transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit_calendar</span>
                                        Xin đổi ca
                                    </button>

                                    <button
                                        onClick={handleOpenLeaveModal}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#16181b] border border-white/5 text-slate-400 font-bold hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-lg">event_busy</span>
                                        Gửi đơn xin nghỉ phép
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#16181b] border border-white/5 rounded-[1.5rem] p-10 flex flex-col items-center justify-center text-center">
                                <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-3xl text-slate-600">
                                        {isBefore(selectedDate, startOfDay(new Date())) ? 'history' : 'calendar_add_on'}
                                    </span>
                                </div>

                                {isBefore(selectedDate, startOfDay(new Date())) ? (
                                    <p className="text-sm font-bold text-slate-500 max-w-[250px]">
                                        Đã qua thời gian đăng ký cho ngày này.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold text-slate-400 mb-6 max-w-[200px]">Ngày này chưa có lịch trực cho ngày này. Đăng ký ngay?</p>
                                        <button
                                            onClick={(e) => openAddModal(e, selectedDate)}
                                            className="px-6 py-3 bg-cyan-400 text-black font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-95 transition-all"
                                        >
                                            Đăng ký ca trực
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-white/5 pb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-white font-bold">{t.schedule.upcoming7Days}</h4>
                            <span className="text-[10px] font-bold text-primary italic bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-mono">{totalUpcomingHours}H</span>
                        </div>
                        <div className="space-y-4">
                            {upcomingShifts.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 active:bg-white/5 transition-colors"
                                    onClick={() => setSelectedDate(item.date)}
                                >
                                    <div className="size-12 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{format(item.date, 'EEE')}</span>
                                        <span className={`text-lg font-black leading-none ${isToday(item.date) ? 'text-primary' : 'text-white'}`}>{format(item.date, 'd')}</span>
                                    </div>
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-widest truncate text-white">{item.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold italic truncate">{item.time}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-700 text-sm">chevron_right</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- DESKTOP CALENDAR VIEW (Only Desktop) --- */}
                <div className="hidden md:flex flex-1 overflow-y-auto p-8 border-r border-border bg-background custom-scrollbar">
                    <div className="max-w-6xl mx-auto space-y-6 w-full">
                        {/* Calendar Controls */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-bold text-white capitalize">
                                    {format(viewDate, 'MMMM yyyy', { locale: dateLocale })}
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={prevMonth} className="p-1.5 rounded-lg bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-xl">chevron_left</span>
                                    </button>
                                    <button onClick={nextMonth} className="p-1.5 rounded-lg bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-xl">chevron_right</span>
                                    </button>
                                </div>
                            </div>


                        </div>

                        {/* Calendar Grid Container */}
                        <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-2xl neon-border">
                            {/* Days of Week */}
                            <div className="grid grid-cols-7 border-b border-border bg-white/[0.02]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <div key={day} className={`py-4 text-center text-[11px] font-bold uppercase tracking-widest border-r last:border-r-0 border-border ${idx === 0 ? 'text-red-500/70' : 'text-slate-500'}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7">
                                {calendarDays.map((day, idx) => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const dayEvents = getDisplayEvents(shifts[dateKey] || [])
                                    const isSelected = isSameDay(day, selectedDate)
                                    const isCurrentMonth = isSameMonth(day, viewDate)
                                    const isTodayDate = isSameDay(day, new Date())

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`min-h-[9rem] p-2 border-r border-b border-border transition-all cursor-pointer group relative flex flex-col gap-1
                                                ${!isCurrentMonth ? 'bg-slate-900/40 text-slate-700' : 'hover:bg-white/[0.02]'}
                                                ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/30 z-10' : ''}
                                                ${idx % 7 === 6 ? 'border-r-0' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-sm font-medium ${isTodayDate ? 'text-primary font-bold' : isCurrentMonth ? 'text-slate-400' : 'text-slate-600'
                                                    }`}>
                                                    {format(day, 'd')}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => openAddModal(e, day)}
                                                        className="size-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20"
                                                    >
                                                        <span className="material-symbols-outlined text-primary text-[10px]">add</span>
                                                    </button>
                                                    {isTodayDate && <span className="size-1.5 rounded-full bg-primary neon-glow"></span>}
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                                {dayEvents.map((shift: any, sIdx: number) => {
                                                    let shiftStyle = 'bg-slate-800/40 border-white/10 text-slate-400'
                                                    if (shift.status === 'pending') {
                                                        shiftStyle = `bg-amber-500/10 border-amber-500/50 text-amber-500 border-dashed`
                                                    } else if (shift.colorClass) {
                                                        const colorName = shift.colorClass.split(' ')[0].replace('bg-', '')
                                                        shiftStyle = `bg-${colorName}/10 border-${colorName}/20 text-${colorName}`
                                                    }

                                                    return (
                                                        <div key={sIdx} className={`p-1.5 rounded-lg border transition-all ${shiftStyle} text-[9px]`}>
                                                            <p className="font-black leading-tight truncate">{shift.title}</p>
                                                            <p className="font-bold opacity-80 mt-0.5">{shift.time}</p>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {isSelected && (
                                                <div className="absolute bottom-1 left-2 pointer-events-none">
                                                    <span className="text-[6px] font-black text-primary/40 uppercase tracking-[0.2em]">{t.schedule.selected}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-8 justify-center py-4 bg-card/30 rounded-3xl border border-border w-full">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.fullDay}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.morningShift}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.afternoonShift}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.schedule.pendingCustom}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- DESKTOP SIDEBAR (Only Desktop) --- */}
                <aside className="hidden md:flex w-80 flex-col bg-card/10 backdrop-blur-3xl border-l border-border flex-shrink-0">
                    <div className="p-8 border-b border-border">
                        <h4 className="text-white font-bold mb-6 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">info</span>
                                {t.schedule.shiftDetails}
                            </span>
                        </h4>

                        <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] relative overflow-hidden group shadow-lg">
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <span className="text-[11px] font-black text-primary uppercase tracking-widest" suppressHydrationWarning>
                                    {format(selectedDate, 'MMM dd, yyyy')}
                                </span>
                                {isSameDay(selectedDate, new Date()) && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="size-1 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                                            {t.schedule.inProgress}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {selectedShifts.length > 0 ? (
                                <div className="space-y-4 relative z-10  max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {selectedShifts.map((shift: any, idx: number) => (
                                        <div key={idx} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                            <p className="text-white font-black text-lg mb-2">{shift.title}</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                                    <div className="size-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5 text-primary/60">
                                                        <span className="material-symbols-outlined text-lg">schedule</span>
                                                    </div>
                                                    <span className="font-bold">{shift.time}</span>
                                                </div>
                                                {!shift.is_leave && (
                                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                                        <div className="size-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5 text-primary/60">
                                                            <span className="material-symbols-outlined text-lg">location_on</span>
                                                        </div>
                                                        <span className="font-bold">{shift.location}</span>
                                                    </div>
                                                )}
                                                {!shift.is_leave && (
                                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                                        <div className="size-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5 text-primary/60">
                                                            <span className="material-symbols-outlined text-lg">group</span>
                                                        </div>
                                                        <span className="font-bold">{shift.members} {t.schedule.teamMembers}</span>
                                                    </div>
                                                )}
                                                {shift.is_leave && (
                                                    <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 w-fit border border-rose-500/30">
                                                        <span className="material-symbols-outlined text-sm">event_busy</span>
                                                        <span className="text-[10px] font-bold uppercase">Nghỉ Phép</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 opacity-50 relative z-10">
                                    <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                                    <p className="text-sm font-bold">{t.schedule.unscheduled}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-white font-bold">{t.schedule.upcoming7Days}</h4>
                        </div>
                        <div className="space-y-4">
                            {upcomingShifts.map((item, idx) => (
                                <div key={idx} className="p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-all cursor-pointer group flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{format(item.date, 'EEE')}</span>
                                        <span className={`text-lg font-black leading-none ${isSameDay(item.date, new Date()) ? 'text-primary' : 'text-white'}`}>{format(item.date, 'd')}</span>
                                    </div>
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-widest truncate text-white">{item.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold italic truncate">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* --- MOBILE FLOATING ACTION BUTTON --- */}
            <div className="fixed md:hidden bottom-24 right-6 z-30">
                <button
                    onClick={(e) => openAddModal(e, selectedDate)}
                    className="bg-primary text-slate-950 size-14 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform"
                >
                    <span className="material-symbols-outlined text-[28px] font-bold">add</span>
                </button>
            </div>

            {/* Work Info Popup */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-card w-full max-w-lg rounded-[2.5rem] border border-border shadow-2xl relative z-10 overflow-hidden neon-border animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-white">{t.schedule.addWorkInfo}</h3>
                                    <p className="text-primary font-bold uppercase tracking-widest text-xs" suppressHydrationWarning>
                                        {modalDate && format(modalDate, 'EEEE, dd MMMM yyyy', { locale: dateLocale })}
                                    </p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form className="space-y-6" onSubmit={handleSave}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.shiftName}</label>
                                    <div className="relative">
                                        <select
                                            value={shiftType}
                                            onChange={(e) => handleShiftTypeChange(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="full_day" className="bg-slate-900">{t.schedule.fullDay}</option>
                                            <option value="morning" className="bg-slate-900">{t.schedule.morningShift}</option>
                                            <option value="afternoon" className="bg-slate-900">{t.schedule.afternoonShift}</option>
                                            <option value="custom" className="bg-slate-900">{t.schedule.custom}</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.startTime}</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            disabled={shiftType !== 'custom'}
                                            className={`w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-4 text-white text-sm md:text-base focus:outline-none focus:border-primary/50 transition-all font-bold [&::-webkit-calendar-picker-indicator]:hidden ${shiftType !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.endTime}</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            disabled={shiftType !== 'custom'}
                                            className={`w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-4 text-white text-sm md:text-base focus:outline-none focus:border-primary/50 transition-all font-bold [&::-webkit-calendar-picker-indicator]:hidden ${shiftType !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.location}</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary/60">location_on</span>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold placeholder:text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                                    >
                                        {t.schedule.cancel}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingShift}
                                        className="flex-[2] px-8 py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSavingShift ? (
                                            <>
                                                <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                                ĐANG XỬ LÝ...
                                            </>
                                        ) : (
                                            'LƯU'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Request Popup - Bottom Sheet on Mobile, Modal on Desktop */}
            <ResponsiveModal open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-white">{t.schedule.requestLeaveTitle}</h3>
                    </div>
                    <button onClick={() => setIsLeaveModalOpen(false)} className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-5 md:space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Loại nghỉ phép</label>
                        <div className="relative">
                            <select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 md:py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                            >
                                <option value="Nghỉ phép năm" className="bg-slate-900">Nghỉ phép năm</option>
                                <option value="Nghỉ ốm" className="bg-slate-900">Nghỉ ốm</option>
                                <option value="Nghỉ việc riêng" className="bg-slate-900">Nghỉ việc riêng</option>
                                <option value="Nghỉ không lương" className="bg-slate-900">Nghỉ không lương</option>
                                <option value="Khác" className="bg-slate-900">Khác</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.selectDate}</label>
                        <DatePicker
                            date={leaveDate}
                            setDate={setLeaveDate}
                            placeholder="Chọn ngày nghỉ"
                            className="rounded-2xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bắt đầu</label>
                            <input
                                type="time"
                                value={leaveStartTime}
                                onChange={(e) => setLeaveStartTime(e.target.value)}
                                className={`w-full bg-white/5 border rounded-2xl px-4 md:px-5 py-3.5 md:py-4 text-white focus:outline-none transition-all font-bold ${timeError && (leaveStartTime < '08:30' || leaveStartTime > '18:00')
                                    ? 'border-red-500/50 bg-red-500/10'
                                    : 'border-white/10 focus:border-primary/50'
                                    }`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kết thúc</label>
                            <input
                                type="time"
                                value={leaveEndTime}
                                onChange={(e) => setLeaveEndTime(e.target.value)}
                                className={`w-full bg-white/5 border rounded-2xl px-4 md:px-5 py-3.5 md:py-4 text-white focus:outline-none transition-all font-bold ${timeError && (leaveEndTime < '08:30' || leaveEndTime > '18:00')
                                    ? 'border-red-500/50 bg-red-500/10'
                                    : 'border-white/10 focus:border-primary/50'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Error Validation Message */}
                    {timeError && (
                        <div className="flex items-center gap-2 text-red-400 px-2 animate-pulse">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            <span className="text-[10px] font-bold uppercase">{timeError}</span>
                        </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex justify-between items-center">
                        <span className="text-xs text-primary/80 font-bold uppercase tracking-wider">Số giờ nghỉ dự kiến:</span>
                        <span className="text-xl font-black text-primary">{leaveHours}h</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.reason}</label>
                        <textarea
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 md:py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold placeholder:text-slate-700 min-h-[80px] md:min-h-[100px]"
                            placeholder="Enter reason..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.schedule.uploadImage}</label>
                        <div className="relative">
                            <input
                                type="file"
                                id="leave-image"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="leave-image"
                                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 border-dashed rounded-2xl px-5 py-4 md:py-6 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-bold"
                            >
                                <UploadCloud className="w-5 h-5" />
                                <span>{isUploading ? t.schedule.uploading : t.schedule.uploadImage}</span>
                            </label>
                        </div>
                        {leaveImage && (
                            <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 group">
                                <img
                                    src={leaveImage}
                                    alt="Evidence"
                                    className="w-full h-36 md:h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLeaveImage(null)
                                            setLeaveFile(null)
                                        }}
                                        className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition-all transform translate-y-2 group-hover:translate-y-0"
                                    >
                                        Remove Image
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                    <p className="text-[10px] text-white/80 truncate px-2 font-mono">{leaveImage.split('/').pop()}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2 md:pt-4">
                        <button
                            onClick={() => setIsLeaveModalOpen(false)}
                            className="flex-1 px-6 md:px-8 py-3.5 md:py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                        >
                            {t.schedule.cancel}
                        </button>
                        <button
                            onClick={submitLeave}
                            disabled={isUploading}
                            className="flex-[2] px-6 md:px-8 py-3.5 md:py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                            {t.schedule.submitRequest}
                        </button>
                    </div>
                </div>
            </ResponsiveModal>
        </div>
    )
}



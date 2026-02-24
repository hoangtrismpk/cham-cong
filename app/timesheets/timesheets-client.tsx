'use client'

import { useI18n } from '@/contexts/i18n-context'
import { useState, useEffect, useRef } from 'react'
import { format, parseISO, subMonths, addMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, parse } from 'date-fns'
import { vi } from 'date-fns/locale'
import { getAttendanceLogsRange, getAllAttendanceLogs, submitAttendanceChange } from '@/app/actions/attendance'
import { exportAttendanceToExcel } from '@/lib/export-utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useSidebar } from '@/contexts/sidebar-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MobileHeader } from '@/components/mobile-header'
import { NotificationBell } from '@/components/notification-bell'
import { OvertimeRequestModal } from '@/components/overtime-request-modal'

interface TimesheetsClientProps {
    user: any
    initialData: any
    workSettings: any
}

type FilterRange = 'today' | 'month' | '3days' | '7days' | '30days' | 'custom'

export function TimesheetsClient({ user, initialData, workSettings }: TimesheetsClientProps) {
    const { t, locale } = useI18n()
    const { setIsOpen } = useSidebar()
    const [viewDate, setViewDate] = useState(new Date())
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    // Filter State
    const [filterRange, setFilterRange] = useState<FilterRange>('month')
    const [customRange, setCustomRange] = useState({ start: '', end: '' })
    const [showFilterDropdown, setShowFilterDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [isOTModalOpen, setIsOTModalOpen] = useState(false)

    // Report Issue State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [reportData, setReportData] = useState({
        log_id: '',
        work_date: new Date(),
        check_in_time: '',
        check_out_time: '',
        reason: '',
        type: 'normal' // 'normal' | 'overtime'
    })
    const [isSubmittingReport, setIsSubmittingReport] = useState(false)



    // Handle clicks outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])



    const handleFilterSelect = (range: FilterRange) => {
        setFilterRange(range)
        setShowFilterDropdown(false)
        setCurrentPage(1)
        setPageInput('1')
    }

    const handleCustomFilter = () => {
        if (customRange.start && customRange.end) {
            setFilterRange('custom')
            setShowFilterDropdown(false)
            setCurrentPage(1)
            setPageInput('1')
        }
    }

    const handleOpenReport = (log: any) => {
        setReportData({
            log_id: log.id,
            work_date: new Date(log.work_date),
            check_in_time: log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm') : '',
            check_out_time: log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm') : '',
            reason: '',
            type: 'normal'
        })
        setIsReportModalOpen(true)
    }

    const handleSubmitReport = async () => {
        if (!reportData.reason || !reportData.check_in_time) {
            toast.error('Vui lòng điền đầy đủ thông tin (Giờ vào, Lý do)')
            return
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
        if (!timeRegex.test(reportData.check_in_time)) {
            toast.error('Giờ vào không hợp lệ! Định dạng: HH:mm (VD: 08:30)')
            return
        }
        if (reportData.check_out_time && !timeRegex.test(reportData.check_out_time)) {
            toast.error('Giờ ra không hợp lệ! Định dạng: HH:mm (VD: 17:30)')
            return
        }

        // VALIDATION LOGIC
        if (workSettings) {
            const timeToMin = (t: string) => {
                const [h, m] = t.split(':').map(Number)
                return h * 60 + m
            }

            const inTime = timeToMin(reportData.check_in_time)
            const outTime = reportData.check_out_time ? timeToMin(reportData.check_out_time) : null
            const workStart = timeToMin(workSettings.work_start_time)
            const workEnd = timeToMin(workSettings.work_end_time)

            if (reportData.type === 'normal') {
                if (inTime < workStart || inTime > workEnd) {
                    toast.error(`Ca thường: Giờ vào phải trong khoảng ${workSettings.work_start_time} - ${workSettings.work_end_time}`)
                    return
                }
                if (outTime && (outTime < workStart || outTime > workEnd)) {
                    toast.error(`Ca thường: Giờ ra phải trong khoảng ${workSettings.work_start_time} - ${workSettings.work_end_time}`)
                    return
                }
            } else { // Overtime
                // Logic: Overtime must be OUTSIDE normal working hours.
                // Usually Overtime is AFTER workEnd or BEFORE workStart.
                // We check if the INTERVAL overlaps with main work hours.
                // Simplest check: Start >= WorkEnd OR End <= WorkStart.

                const isAfterHours = inTime >= workEnd
                const isBeforeHours = (outTime || inTime) <= workStart
                const isLunchOvertime = false // Add lunch logic if needed, but user said "ngoài h làm việc" generally.

                // If user enters range that overlaps with work hours -> ERROR

                // Let's define "Overtime" strictly as: ENTIRELY outside work hours.
                // Start >= End is handled by DB restriction usually, but let's assume valid range.
                // If Start < WorkEnd AND (End > WorkStart), then it overlaps.

                // Correction: User might just enter CheckIn/CheckOut. 
                // If it's pure overtime shift, it shouldn't touch normal hours? 
                // "nếu là tăng ca thì chỉ nhập được thời gian ngoài h làm việc"
                if (outTime) {
                    // Check for overlap
                    if (Math.max(inTime, workStart) < Math.min(outTime, workEnd)) {
                        toast.error(`Tăng ca: Thời gian phải nằm ngoài giờ làm việc chính (${workSettings.work_start_time} - ${workSettings.work_end_time})`)
                        return
                    }
                } else {
                    // Just check-in? Hard to validate overlap without end.
                    // But we can check if it's INSIDE.
                    if (inTime > workStart && inTime < workEnd) {
                        toast.error(`Tăng ca: Giờ vào không được nằm trong giờ hành chính`)
                        return
                    }
                }
            }
        }

        setIsSubmittingReport(true)
        try {
            const res = await submitAttendanceChange({
                log_id: reportData.log_id,
                work_date: format(reportData.work_date, 'yyyy-MM-dd'),
                check_in_time: reportData.check_in_time,
                check_out_time: reportData.check_out_time,
                reason: `[${reportData.type === 'normal' ? 'CA THƯỜNG' : 'TĂNG CA'}] ${reportData.reason}` // Tag reason for Admin visibility
            })

            if (res.success) {
                toast.success('Gửi yêu cầu thành công')
                setIsReportModalOpen(false)
            } else {
                toast.error('Lỗi: ' + res.error)
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra')
        } finally {
            setIsSubmittingReport(false)
        }
    }

    const handlePrevMonth = () => {
        setViewDate(subMonths(viewDate, 1))
        setCurrentPage(1)
        setPageInput('1')
    }
    const handleNextMonth = () => {
        setViewDate(addMonths(viewDate, 1))
        setCurrentPage(1)
        setPageInput('1')
    }

    const handleTimeInput = (val: string, field: 'check_in_time' | 'check_out_time') => {
        let value = val.replace(/[^0-9:]/g, '') // Only allow numbers and colon

        // Auto-format: 0800 -> 08:00
        if (value.length === 4 && !value.includes(':')) {
            value = value.slice(0, 2) + ':' + value.slice(2, 4)
        }

        // Limit to HH:mm format
        if (value.length > 5) value = value.slice(0, 5)

        // Validate if complete (HH:mm)
        if (value.length === 5 && value.includes(':')) {
            const [hourStr, minStr] = value.split(':')
            const hour = parseInt(hourStr, 10)
            const min = parseInt(minStr, 10)

            if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
                toast.error('Giờ không hợp lệ! (Giờ: 0-23, Phút: 0-59)')
                return // Don't update if invalid
            }
        }

        setReportData(prev => ({ ...prev, [field]: value }))
    }

    const rangeLabel = filterRange === 'month'
        ? format(viewDate, 'MMMM yyyy', { locale: locale === 'vi' ? vi : undefined })
        : filterRange === 'today' ? t.timesheets.today
            : filterRange === '3days' ? t.timesheets.last3Days
                : filterRange === '7days' ? t.timesheets.last7Days
                    : filterRange === '30days' ? t.timesheets.last30Days
                        : `${customRange.start} - ${customRange.end}`



    // --- PAGINATION LOGIC (Server-Side) ---
    const itemsPerPage = 10
    const [currentPage, setCurrentPage] = useState(1)
    const [pageInput, setPageInput] = useState('1')

    // Use totalCount from server data
    const totalRecords = data.totalCount || 0
    // If totalCount is missing (old API response format), fallback to logs length logic which might be wrong for pagination
    // But we updated the API, so it should be fine.
    const totalPages = Math.ceil(totalRecords / itemsPerPage)

    const fetchRange = async (start: Date, end: Date, page: number) => {
        setLoading(true)
        const result = await getAttendanceLogsRange(start.toISOString(), end.toISOString(), page, itemsPerPage)
        setData(result)
        setLoading(false)
    }

    // Effect: Handle Data Fetching
    const viewDateStr = format(viewDate, 'yyyy-MM')
    const customRangeStr = JSON.stringify(customRange)

    useEffect(() => {
        const fetch = async () => {
            let start: Date, end: Date
            const now = new Date()

            if (filterRange === 'month') {
                start = startOfMonth(viewDate)
                end = endOfMonth(viewDate)
            } else if (filterRange === 'today') {
                start = startOfDay(now)
                end = endOfDay(now)
            } else if (filterRange === '3days') {
                start = startOfDay(subDays(now, 2))
                end = endOfDay(now)
            } else if (filterRange === '7days') {
                start = startOfDay(subDays(now, 6))
                end = endOfDay(now)
            } else if (filterRange === '30days') {
                start = startOfDay(subDays(now, 29))
                end = endOfDay(now)
            } else if (filterRange === 'custom' && customRange.start && customRange.end) {
                start = new Date(customRange.start)
                end = new Date(customRange.end)
            } else {
                return
            }

            await fetchRange(start, end, currentPage)
        }

        fetch()
    }, [viewDateStr, filterRange, currentPage, customRangeStr])

    // Sync input when page changes via buttons
    useEffect(() => {
        setPageInput(currentPage.toString())
    }, [currentPage])

    // On Server Pagination, paginatedLogs ARE the data.logs
    // We apply local search filter on the currently visible page
    const paginatedLogs = (data.logs || []).filter((log: any) => {
        if (!search) return true
        const searchTerms = search.toLowerCase()
        const dateObj = parseISO(log.work_date + 'T12:00:00')
        const formattedDateVN = format(dateObj, 'dd/MM/yyyy')
        const dayName = format(dateObj, 'EEEE', { locale: locale === 'vi' ? vi : undefined }).toLowerCase()

        return log.work_date.includes(searchTerms) ||
            formattedDateVN.includes(searchTerms) ||
            dayName.includes(searchTerms)
    })



    return (
        <div className="flex flex-col h-full bg-background-dark md:bg-transparent overflow-hidden">
            {/* --- MOBILE HEADER --- */}
            {/* --- MOBILE HEADER --- */}
            {/* --- MOBILE HEADER --- */}
            <MobileHeader
                title={t.timesheets.title}
                subtitle="Quản lý công & lương"
                rightActions={<NotificationBell />}
            />

            {/* --- MOBILE TOOLBAR --- */}
            <div className="flex md:hidden items-center justify-between px-6 py-4 bg-background-dark/50 border-b border-white/5 sticky top-[73px] z-10 backdrop-blur-md">
                {/* Month Navigation */}
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/5">
                    {filterRange === 'month' ? (
                        <>
                            <button onClick={handlePrevMonth} className="p-1 hover:text-primary transition-colors hover:bg-white/5 rounded-md">
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-none min-w-[90px] text-center">
                                {format(viewDate, 'MMMM yyyy', { locale: vi })}
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:text-primary transition-colors hover:bg-white/5 rounded-md">
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </>
                    ) : (
                        <p className="px-3 py-1 text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-none">{rangeLabel}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`p-2 rounded-lg bg-slate-900/50 border border-white/10 transition-colors ${filterRange !== 'month' ? 'text-primary ring-1 ring-primary/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    </button>

                </div>
            </div>

            {/* --- DESKTOP HEADER --- */}
            <header className="hidden md:flex px-8 py-6 border-b border-border bg-background/50 backdrop-blur-md items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white text-2xl font-bold tracking-tight">{t.timesheets.title}</h2>
                    <p className="text-slate-500 text-sm italic">{t.timesheets.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    {filterRange === 'month' && (
                        <div className="flex items-center bg-slate-900/50 rounded-xl border border-white/5 p-1">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <div className="px-4 text-[11px] font-black text-white uppercase tracking-widest min-w-[140px] text-center">{rangeLabel}</div>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    )}
                    {filterRange !== 'month' && (
                        <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3">
                            <span className="text-[11px] font-black text-primary uppercase tracking-widest">{rangeLabel}</span>
                            <button onClick={() => setFilterRange('month')} className="text-primary hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}
                    <Button
                        onClick={() => setIsOTModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl gap-2 font-bold text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] border border-purple-400/30"
                    >
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        {locale === 'vi' ? 'ĐĂNG KÝ TĂNG CA' : 'REGISTER OT'}
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:p-8">
                {/* --- MOBILE STATS STRIP --- */}
                <div className="flex md:hidden items-center gap-4 overflow-x-auto no-scrollbar px-6 py-6 border-b border-white/5 bg-white/[0.01]">
                    <div className="min-w-[140px] p-5 bg-card/40 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 size-12 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.totalHoursWorked}</p>
                        <p className="text-2xl font-black text-white">{data.stats.totalHours}<span className="text-[10px] text-slate-600 block">GIỜ LÀM</span></p>
                    </div>
                    <div className="min-w-[140px] p-5 bg-card/40 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 size-12 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.overtime}</p>
                        <p className="text-2xl font-black text-white">{data.stats.overtime}<span className="text-[10px] text-slate-600 block">TĂNG CA</span></p>
                    </div>
                    <div className="min-w-[140px] p-5 bg-card/40 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 size-12 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.daysPresent}</p>
                        <p className="text-2xl font-black text-white">{data.stats.daysPresent}<span className="text-[10px] text-slate-600 block">/ {data.stats.totalWorkdays} NGÀY</span></p>
                    </div>
                    <div className="min-w-[140px] p-5 bg-card/40 rounded-3xl border border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 size-12 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.lateHours}</p>
                        <p className="text-2xl font-black text-white">{data.stats.lateHours || 0}<span className="text-[10px] text-slate-600 block">{locale === 'vi' ? 'GIỜ' : 'HOURS'}</span></p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto md:space-y-8">
                    {/* --- DESKTOP STATS CARDS --- */}
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Hours */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-xl">timer</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.totalHoursWorked}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.totalHours}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">{t.timesheets.unitHours}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Overtime */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-purple-400 text-xl">bolt</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.overtime}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.overtime}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">{t.timesheets.unitHours}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Days Present */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-400 text-xl">calendar_today</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.daysPresent}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.daysPresent}</span>
                                        <span className="text-xs font-bold text-slate-600">/ {data.stats.totalWorkdays}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Late Hours */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-rose-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-rose-400 text-xl">schedule</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.lateHours}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.lateHours || 0}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">{t.timesheets.unitHours || ''}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- DAILY LOGS SECTION --- */}
                    <div className="bg-card md:rounded-[2rem] md:border border-border overflow-hidden md:shadow-2xl flex flex-col min-h-[500px]">
                        {/* SEARCH / TOOLBAR (Desktop Only or simplified for mobile) */}
                        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-white/[0.01]">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {t.timesheets.dailyLogs}
                                <span className="text-[10px] font-bold text-slate-500 italic bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                    {totalRecords} LOGS
                                </span>
                            </h3>

                            <div className="relative group/search max-w-full">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within/search:text-primary transition-colors">search</span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t.timesheets.searchLogs}
                                    className="pl-10 pr-4 py-3 md:py-2 bg-slate-900/50 border border-white/5 rounded-2xl md:rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all w-full md:w-64"
                                />
                            </div>
                        </div>

                        {/* --- MOBILE LIST VIEW --- */}
                        <div className="flex md:hidden flex-col divide-y divide-white/5 p-6">
                            {paginatedLogs.length > 0 ? (
                                paginatedLogs.map((log: any) => {
                                    const dateObj = parseISO(log.work_date + 'T12:00:00')
                                    return (
                                        <div key={log.id} className="py-6 first:pt-0">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex gap-4">
                                                    <div className="size-12 rounded-2xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center shrink-0">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{format(dateObj, 'EEE')}</span>
                                                        <span className="text-xl font-black text-white leading-none">{format(dateObj, 'd')}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">
                                                            {format(dateObj, 'MMMM yyyy', { locale: locale === 'vi' ? vi : undefined })}
                                                        </p>
                                                        <p className="text-sm font-black text-white">{format(dateObj, 'EEEE', { locale: locale === 'vi' ? vi : undefined })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-primary leading-none">
                                                        {Math.floor(log.totalHours)}h {Math.round((log.totalHours % 1) * 60)}m
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">TỔNG GIỜ</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-1">
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">CLOCK IN</p>
                                                    <p className="text-[11px] font-black text-emerald-400 font-mono">
                                                        {log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm aa') : '--:--'}
                                                    </p>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-1">
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">CLOCK OUT</p>
                                                    <p className="text-[11px] font-black text-white font-mono opacity-80">
                                                        {log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm aa') : '--:--'}
                                                    </p>
                                                </div>
                                            </div>

                                            {(log.check_in_note || log.check_out_note) && (
                                                <div className="mt-3 flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2 border border-primary/10">
                                                    <span className="material-symbols-outlined text-[14px] text-primary">info</span>
                                                    <p className="text-[10px] font-medium text-primary/80 truncate">
                                                        {log.check_in_note || log.check_out_note}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={() => handleOpenReport(log)}
                                                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 rounded-lg transition-all"
                                                >
                                                    Báo cáo sai sót
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-2 opacity-50">
                                    <span className="material-symbols-outlined text-[48px] text-slate-700">inventory_2</span>
                                    <p className="text-sm font-bold text-slate-600">{t.dashboard.noRecentActivity}</p>
                                </div>
                            )}
                        </div>

                        {/* --- DESKTOP TABLE VIEW --- */}
                        <div className="hidden md:block flex-1 overflow-x-auto relative">
                            {loading && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-30 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">{t.common.loading}</span>
                                    </div>
                                </div>
                            )}
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-slate-900/20">
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.dashboard.date}</th>
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{locale === 'vi' ? 'THỨ' : 'DAY'}</th>
                                        <th className="text-center py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.timesheets.clockIn}</th>
                                        <th className="text-center py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.timesheets.clockOut}</th>
                                        <th className="text-center py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.timesheets.breakDuration}</th>
                                        <th className="text-right py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-primary">{t.timesheets.totalHours}</th>
                                        <th className="text-center py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedLogs.map((log: any) => {
                                        const dateObj = parseISO(log.work_date + 'T12:00:00')
                                        return (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="py-5 px-8">
                                                    <span className="text-white font-bold text-xs uppercase">{format(dateObj, 'dd/MM/yyyy')}</span>
                                                </td>
                                                <td className="py-5 px-8 text-slate-400 text-xs font-medium lowercase">
                                                    {format(dateObj, 'EEEE', { locale: locale === 'vi' ? vi : undefined })}
                                                </td>
                                                <td className="py-5 px-8 text-center font-mono text-[11px] font-black text-emerald-400/90 tracking-tighter">
                                                    {log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm aa') : '--:--'}
                                                </td>
                                                <td className="py-5 px-8 text-center font-mono text-[11px] font-black text-slate-300 tracking-tighter">
                                                    {log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm aa') : '--:--'}
                                                </td>
                                                <td className="py-5 px-8 text-center text-slate-500 text-[11px] font-bold">
                                                    {Math.floor(log.breakDurationMin / 60)}h {log.breakDurationMin % 60}m
                                                </td>
                                                <td className="py-5 px-8 text-right">
                                                    <span className="text-sm font-black text-primary tracking-tight">
                                                        {Math.floor(log.totalHours)}h {Math.round((log.totalHours % 1) * 60)}m
                                                    </span>
                                                </td>
                                                <td className="py-5 px-8 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenReport(log)
                                                        }}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                                                        title="Báo cáo sai sót"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit_square</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div >

                    {/* --- PAGINATION CONTROLS --- */}
                    {
                        totalRecords > 0 && (
                            <div className="flex items-center justify-between pb-8 md:pb-0 px-6 md:px-0">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-900 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-xl"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Trước
                                </button>

                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-white">Trang</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={pageInput}
                                            onChange={(e) => setPageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    let page = parseInt(pageInput)
                                                    if (isNaN(page) || page < 1) page = 1
                                                    if (page > totalPages) page = totalPages
                                                    setCurrentPage(page)
                                                    setPageInput(page.toString())
                                                }
                                            }}
                                            onBlur={() => {
                                                // Reset to current valid page on blur if invalid
                                                setPageInput(currentPage.toString())
                                            }}
                                            className="w-12 h-6 px-1 text-center bg-slate-800 border border-white/10 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary no-spinner"
                                        />
                                        <span className="text-xs font-bold text-white">/ {totalPages}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        {totalRecords} bản ghi
                                    </span>
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-900 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-xl"
                                >
                                    Sau
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        )
                    }

                    {/* --- LEAVE MANAGEMENT SECTION --- */}
                    <div className="px-6 md:px-0 mt-4 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{locale === 'vi' ? 'QUẢN LÝ NGHỈ PHÉP' : 'LEAVE MANAGEMENT'}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Monthly Leave */}
                            <div className="bg-card/80 md:rounded-[2rem] rounded-3xl border border-border p-6 relative overflow-hidden group flex flex-col items-center justify-center text-center shadow-lg">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                                <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-emerald-400 text-xl">calendar_view_month</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.paidLeaveMonth}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{data.stats.usedLeaveMonth}</span>
                                    <span className="text-xs font-bold text-slate-600 uppercase">/ {data.stats.monthlyLimit || 1}</span>
                                </div>
                            </div>

                            {/* Yearly Leave */}
                            <div className="bg-card/80 md:rounded-[2rem] rounded-3xl border border-border p-6 relative overflow-hidden group flex flex-col items-center justify-center text-center shadow-lg">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-sky-500/20 transition-all duration-700"></div>
                                <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-sky-400 text-xl">event_available</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.timesheets.paidLeaveYear}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{data.stats.usedLeaveYear}</span>
                                    <span className="text-xs font-bold text-slate-600 uppercase">/ {data.stats.annualLimit || 12}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

            </main >

            {/* --- FILTER MODAL (Overlay) --- */}
            {
                showFilterDropdown && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6" onClick={() => setShowFilterDropdown(false)}>
                        <div className="w-full md:max-w-md bg-slate-900 md:rounded-[2.5rem] p-8 md:p-10 border-t md:border border-white/10 animate-in slide-in-from-bottom duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="size-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shrink-0">
                                <span className="material-symbols-outlined text-[32px] text-primary">filter_list</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">{t.timesheets.filter}</h2>
                            <p className="text-slate-500 text-sm font-bold mb-8 uppercase tracking-widest">{t.timesheets.customRange}</p>

                            <div className="grid grid-cols-1 gap-4 mb-8">
                                <button onClick={() => handleFilterSelect('today')} className={`w-full py-5 rounded-[1.5rem] border font-black uppercase tracking-widest text-xs flex items-center justify-between px-8 ${filterRange === 'today' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                    {t.timesheets.today}
                                    {filterRange === 'today' && <span className="material-symbols-outlined">check_circle</span>}
                                </button>
                                <button onClick={() => handleFilterSelect('7days')} className={`w-full py-5 rounded-[1.5rem] border font-black uppercase tracking-widest text-xs flex items-center justify-between px-8 ${filterRange === '7days' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                    {t.timesheets.last7Days}
                                    {filterRange === '7days' && <span className="material-symbols-outlined">check_circle</span>}
                                </button>
                                <button onClick={() => handleFilterSelect('month')} className={`w-full py-5 rounded-[1.5rem] border font-black uppercase tracking-widest text-xs flex items-center justify-between px-8 ${filterRange === 'month' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                    {t.timesheets.last30Days}
                                    {filterRange === 'month' && <span className="material-symbols-outlined">check_circle</span>}
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <DatePicker
                                    date={customRange.start ? new Date(customRange.start) : undefined}
                                    setDate={(d) => setCustomRange({ ...customRange, start: d ? format(d, 'yyyy-MM-dd') : '' })}
                                    placeholder="Từ ngày"
                                    className="w-full py-5 rounded-[1.5rem] bg-white/5 border-white/5"
                                />
                                <DatePicker
                                    date={customRange.end ? new Date(customRange.end) : undefined}
                                    setDate={(d) => setCustomRange({ ...customRange, end: d ? format(d, 'yyyy-MM-dd') : '' })}
                                    placeholder="Đến ngày"
                                    className="w-full py-5 rounded-[1.5rem] bg-white/5 border-white/5"
                                />
                                <button
                                    onClick={handleCustomFilter}
                                    className="w-full py-5 bg-primary text-black font-black rounded-[1.5rem] uppercase tracking-widest mt-4 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                                >
                                    {t.common.confirm}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* --- REPORT ISSUE MODAL --- */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-white">Báo cáo sai sót chấm công</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Vui lòng điều chỉnh lại giờ đúng và nhập lý do.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right text-slate-400">
                                Ngày
                            </Label>
                            <div className="col-span-3 text-white font-bold">
                                {format(reportData.work_date, 'dd/MM/yyyy')}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="checkin" className="text-right text-slate-400">
                                Giờ vào
                            </Label>
                            <Input
                                id="checkin"
                                type="text"
                                placeholder="HH:mm (Ví dụ: 08:30)"
                                value={reportData.check_in_time}
                                onChange={(e) => handleTimeInput(e.target.value, 'check_in_time')}
                                className="col-span-3 bg-slate-950 border-slate-700 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="checkout" className="text-right text-slate-400">
                                Giờ ra
                            </Label>
                            <Input
                                id="checkout"
                                type="text"
                                placeholder="HH:mm (Ví dụ: 17:30)"
                                value={reportData.check_out_time}
                                onChange={(e) => handleTimeInput(e.target.value, 'check_out_time')}
                                className="col-span-3 bg-slate-950 border-slate-700 text-white"
                            />
                        </div>

                        {/* TYPE SELECTION */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-slate-400">Loại</Label>
                            <div className="col-span-3 flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="reportType"
                                        checked={reportData.type === 'normal'}
                                        onChange={() => setReportData({ ...reportData, type: 'normal' })}
                                        className="accent-primary"
                                    />
                                    <span className={`text-sm font-bold ${reportData.type === 'normal' ? 'text-white' : 'text-slate-500'}`}>Ca thường</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="reportType"
                                        checked={reportData.type === 'overtime'}
                                        onChange={() => setReportData({ ...reportData, type: 'overtime' })}
                                        className="accent-primary"
                                    />
                                    <span className={`text-sm font-bold ${reportData.type === 'overtime' ? 'text-white' : 'text-slate-500'}`}>Tăng ca</span>
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <Label htmlFor="reason" className="text-right text-slate-400 mt-3">
                                Lý do
                            </Label>
                            <Textarea
                                id="reason"
                                value={reportData.reason}
                                onChange={(e) => setReportData({ ...reportData, reason: e.target.value })}
                                className="col-span-3 bg-slate-950 border-slate-700 text-white"
                                placeholder="Nhập lý do điều chỉnh..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReportModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSubmitReport} disabled={isSubmittingReport} className="bg-primary text-black hover:bg-primary/90">
                            {isSubmittingReport ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <OvertimeRequestModal
                isOpen={isOTModalOpen}
                onClose={() => setIsOTModalOpen(false)}
                userId={user.id}
                onSuccess={() => {
                    // Refresh data after successful OT request
                    handleFilterSelect(filterRange)
                }}
            />
        </div>
    )
}

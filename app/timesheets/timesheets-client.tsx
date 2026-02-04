'use client'

import { useI18n } from '@/contexts/i18n-context'
import { useState, useEffect, useRef } from 'react'
import { format, parseISO, subMonths, addMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { getAttendanceLogsRange, getAllAttendanceLogs } from '@/app/actions/attendance'
import { exportAttendanceToExcel } from '@/lib/export-utils'
import { DatePicker } from '@/components/ui/date-picker'
import { useSidebar } from '@/contexts/sidebar-context'
import { parse } from 'date-fns'

interface TimesheetsClientProps {
    user: any
    initialData: any
}

type FilterRange = 'today' | 'month' | '3days' | '7days' | '30days' | 'custom'

export function TimesheetsClient({ user, initialData }: TimesheetsClientProps) {
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
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const downloadRef = useRef<HTMLDivElement>(null)

    // Handle clicks outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false)
            }
            if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
                setShowDownloadDropdown(false)
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
    }, [viewDate, filterRange, currentPage, customRange])

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
            <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-white/10 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsOpen(true)} className="text-slate-400">
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-white">{t.timesheets.title}</h1>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[10px] text-primary">analytics</span>
                            {filterRange === 'month' ? (
                                <div className="flex items-center gap-1">
                                    <button onClick={handlePrevMonth} className="px-1 py-0.5 hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-[12px]">chevron_left</span>
                                    </button>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none min-w-[80px] text-center">{rangeLabel}</span>
                                    <button onClick={handleNextMonth} className="px-1 py-0.5 hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{rangeLabel}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`p-2 rounded-lg bg-white/5 border border-white/10 transition-colors ${filterRange !== 'month' ? 'text-primary ring-1 ring-primary/30' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                    </button>
                    <div className="relative" ref={downloadRef}>
                        <button
                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">file_download</span>
                        </button>
                        {showDownloadDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        exportAttendanceToExcel(data.logs, rangeLabel)
                                        setShowDownloadDropdown(false)
                                    }}
                                    className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">date_range</span>
                                    {t.timesheets.exportRange}
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoading(true)
                                        const allData = await getAllAttendanceLogs()
                                        exportAttendanceToExcel(allData.logs, 'All History')
                                        setLoading(false)
                                        setShowDownloadDropdown(false)
                                    }}
                                    className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">all_inclusive</span>
                                    {t.timesheets.exportAll}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

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
                    <button onClick={() => setShowDownloadDropdown(!showDownloadDropdown)} className="h-10 w-10 flex items-center justify-center bg-slate-900/50 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-xl">download</span>
                    </button>
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
                </div>

                <div className="max-w-7xl mx-auto md:space-y-8">
                    {/* --- DESKTOP STATS CARDS --- */}
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                        {/* Monthly Leave */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-400 text-xl">calendar_view_month</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.paidLeaveMonth}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.usedLeaveMonth}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">/ {data.stats.remainingLeaveMonth}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Yearly Leave */}
                        <div className="bg-card rounded-[2rem] border border-border p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-sky-500/20 transition-all duration-700"></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sky-400 text-xl">event_available</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.timesheets.paidLeaveYear}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white">{data.stats.usedLeaveYear}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">/ {data.stats.remainingLeaveYear}</span>
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
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- PAGINATION CONTROLS --- */}
                    {totalRecords > 0 && (
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
                    )}
                </div>
            </main>

            {/* --- FILTER MODAL (Overlay) --- */}
            {showFilterDropdown && (
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
            )}
        </div>
    )
}

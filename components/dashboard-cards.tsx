'use client'

import { useI18n } from '@/contexts/i18n-context'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

import { useState, useEffect } from 'react'
import { getAttendanceStats } from '@/app/actions/attendance'

interface AttendanceProgressCardProps {
    initialData: any
}

export function AttendanceProgressCard({ initialData }: AttendanceProgressCardProps) {
    const { t, locale } = useI18n()
    const [view, setView] = useState<'week' | 'month'>('week')
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const result = await getAttendanceStats(view)
            setData(result)
            setLoading(false)
        }

        // Always fetch data if the view changes
        // Since we don't cache locally yet, we need to refetch even for the initial view
        // to handle the case where the user navigates away and back.
        // We skip the very first mount fetch if initialData is correct, but the logic below 
        // is safer and simpler: just fetch on view change.
        // To optimize: we could compare view with initialView and only skip if it's truly the FIRST mount.
        // But for this bug fix (returning to week view not updating columns), always fetching is the Solution.

        // Wait, if we want to use initialData on FIRST mount only:
        // That is handled by useState(initialData).
        // The problem with the previous code was: "if (view !== initialView) fetchData()"
        // When view becomes == initialView again, it didn't fetch.

        // Solution: Remove the condition. The component mounts with initialData.
        // If view changes (even to something else and back), we fetch.
        // However, on strict first mount, view is 'week' (default) or whatever initialView is.
        // If we dont want a double fetch on mount:

        const isFirstMount = data === initialData
        const derivedInitialView = initialData.dailyStats.length > 7 ? 'month' : 'week'

        if (isFirstMount && view === derivedInitialView) {
            // Do nothing, we have data. 
        } else {
            fetchData()
        }

    }, [view])

    const currentPeriod = format(new Date(), 'MMMM', { locale: locale === 'vi' ? vi : undefined })

    // Day name mapping
    const dayNames: any = {
        'MON': t.time.monday,
        'TUE': t.time.tuesday,
        'WED': t.time.wednesday,
        'THU': t.time.thursday,
        'FRI': t.time.friday,
        'SAT': t.time.saturday,
        'SUN': t.time.sunday
    }

    return (
        <div className="bg-card rounded-[2rem] border border-border p-6 lg:p-8 flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-white text-xl font-bold tracking-tight">
                        {view === 'week' ? t.dashboard.weeklyBreakdown : t.dashboard.monthlyBreakdown}
                    </h3>
                    <p className="text-slate-500 text-[11px] font-medium italic">
                        {view === 'week' ? t.dashboard.visualizingWeekly : t.dashboard.visualizingMonthly.replace('[Month]', currentPeriod)}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {/* Legend */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/80"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.standardHours}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500/80"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.overtime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.lateArrivals}</span>
                        </div>
                    </div>

                    {/* View Switcher (Localized) */}
                    <div className="bg-slate-900/50 p-0.5 rounded-lg border border-white/5 flex">
                        <button
                            onClick={() => setView('week')}
                            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${view === 'week' ? 'bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.dashboard.week}
                        </button>
                        <button
                            onClick={() => setView('month')}
                            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${view === 'month' ? 'bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.dashboard.month}
                        </button>
                    </div>
                </div>
            </div>

            {/* Total Work Time Summary Above Chart */}
            <div className="flex items-center gap-8 mb-8 relative z-10">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.totalWorkTime}</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{(data.totalHours + data.totalOT).toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-slate-500">HRS</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-white/5"></div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.standardHours}</span>
                        <span className="text-lg font-black text-primary/80">{data.totalHours}h</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.overtime}</span>
                        <span className="text-lg font-black text-purple-400/80">{data.totalOT}h</span>
                    </div>
                    {/* Late Stats */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.lateArrivals}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-rose-500/80">{data.totalLateCount || 0}</span>
                            <span className="text-[9px] font-bold text-slate-600 lowercase px-0.5">x</span>
                            <span className="text-sm font-bold text-rose-500/60">{data.totalLateMinutes || 0}m</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className={`flex-1 flex items-end justify-between ${view === 'week' ? 'gap-3 sm:gap-6 px-4' : 'gap-px sm:gap-0.5'} relative min-h-[220px] ${loading ? 'opacity-30' : 'opacity-100'} transition-opacity duration-300`}>
                {data.dailyStats.map((stat: any, i: number) => {
                    const stdPercentage = (stat.standard / 12) * 100
                    const otPercentage = (stat.ot / 12) * 100
                    // Late percentage for visualization (max 60 mins scale or just fixed height indicator)
                    // Let's make it proportional to 60 mins = 20% height for visibility
                    const latePercentage = Math.min((stat.lateMinutes / 60) * 10, 15)

                    const hasActivity = stat.standard > 0 || stat.ot > 0
                    const isFuture = stat.date && new Date(stat.date) > new Date()

                    return (
                        <div key={i} className={`flex-1 flex flex-col items-center gap-3 group/bar h-full justify-end ${stat.isOffDay ? 'opacity-20 hover:opacity-100' : 'opacity-100'} transition-opacity`}>
                            <div className="w-full flex flex-col justify-end h-full relative">
                                {/* Tooltip */}
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1.5 px-2.5 rounded-md border border-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-xl flex flex-col items-center gap-0.5">
                                    <span className="font-bold">{stat.standard}h + {stat.ot}h OT</span>
                                    {stat.lateMinutes > 0 && (
                                        <span className="text-rose-400 font-bold">Late: {stat.lateMinutes}m</span>
                                    )}
                                </div>

                                <div className={`w-full mx-auto ${view === 'month' ? 'max-w-full' : 'max-w-[24px] sm:max-w-[48px]'} bg-slate-800/20 rounded-full overflow-hidden flex flex-col justify-end h-[160px] transition-all group-hover/bar:bg-slate-800/40 relative`}>
                                    {/* Late Indicator (Top of stack or overlay?) -> Let's put it at the bottom as "Negative" space or distinct color */}
                                    {stat.lateMinutes > 0 && (
                                        <div
                                            className="w-full bg-rose-500/60 transition-all duration-700 absolute bottom-0 z-10"
                                            style={{ height: `${latePercentage}%`, bottom: 0 }}
                                        ></div>
                                    )}

                                    <div
                                        className="w-full bg-purple-500/60 transition-all duration-700 relative z-0"
                                        style={{ height: `${otPercentage}%` }}
                                    ></div>
                                    <div
                                        className="w-full bg-primary/60 transition-all duration-700 border-t border-white/5 relative z-0"
                                        style={{ height: `${stdPercentage}%`, marginBottom: stat.lateMinutes > 0 ? `${latePercentage}%` : 0 }}
                                    ></div>
                                </div>
                            </div>
                            <span className={`text-[8px] font-black tracking-tighter transition-colors ${hasActivity ? 'text-slate-400' : 'text-slate-600'} ${view === 'month' ? 'scale-90 pointer-events-none' : ''}`}>
                                {view === 'week' ? (dayNames[stat.label] || stat.label) : parseInt(stat.label, 10).toString()}
                            </span>
                        </div>
                    )
                })}

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    )
}

interface RecentHistoryCardProps {
    history: any[]
}

export function RecentHistoryCard({ history }: RecentHistoryCardProps) {
    const { t, locale } = useI18n()
    // Display only the latest 5 entries without pagination
    const currentItems = history.slice(0, 5)

    // Helper to calculate work duration for a single log based on shift rules
    const calculateLogHours = (checkIn: string, checkOut: string | null) => {
        if (!checkIn || !checkOut) return 0
        const inTime = new Date(checkIn)
        const outTime = new Date(checkOut)

        const getTime = (date: Date, h: number, m: number) => {
            const d = new Date(date)
            d.setHours(h, m, 0, 0)
            return d.getTime()
        }

        const inMs = inTime.getTime()
        const outMs = outTime.getTime()

        const morningStart = getTime(inTime, 8, 30)
        const morningEnd = getTime(inTime, 12, 0)
        const afternoonStart = getTime(inTime, 13, 30)
        const afternoonEnd = getTime(inTime, 18, 0)

        const totalDurationMinutes = (outMs - inMs) / (1000 * 60)

        // Calculate lunch overlap: overlap with [12:00, 13:30]
        const lunchStart = getTime(inTime, 12, 0)
        const lunchEnd = getTime(inTime, 13, 30)
        const lunchOverlapStart = Math.max(inMs, lunchStart)
        const lunchOverlapEnd = Math.min(outMs, lunchEnd)
        const lunchOverlapMinutes = Math.max(0, (lunchOverlapEnd - lunchOverlapStart) / (1000 * 60))

        const actualWorkMinutes = totalDurationMinutes - lunchOverlapMinutes
        return Math.round((actualWorkMinutes / 60) * 10) / 10
    }

    return (
        <div className="bg-card rounded-[2rem] border border-border flex flex-col h-full overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="text-white text-lg font-bold">{t.dashboard.attendanceLog}</h3>
                <button className="text-[10px] font-bold text-slate-500 px-2 py-1 bg-slate-800/50 rounded-md hover:bg-slate-800 transition-colors uppercase tracking-widest">
                    {t.dashboard.history}
                </button>
            </div>

            {/* Table Header Labels */}
            <div className="px-6 py-2 grid grid-cols-3 border-b border-white/5">
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-widest">{t.dashboard.date}</span>
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-widest text-center">{t.dashboard.inOut}</span>
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-widest text-right">{t.dashboard.hours}</span>
            </div>

            {/* List Body */}
            <div className="flex-1 divide-y divide-white/5 overflow-y-auto custom-scrollbar">
                {currentItems.length > 0 ? (
                    currentItems.map((log: any) => {
                        const duration = calculateLogHours(log.check_in_time, log.check_out_time)
                        const inDate = parseISO(log.check_in_time || log.created_at)
                        const isClosed = !!log.check_out_time

                        return (
                            <div key={log.id} className="px-6 py-4 grid grid-cols-3 items-center hover:bg-white/[0.02] transition-colors group">
                                {/* Date Column */}
                                <div className="flex flex-col justify-center">
                                    <span className="text-white font-bold text-xs">
                                        {format(inDate, 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-slate-500 text-[10px] font-medium mt-0.5 capitalize">
                                        {format(inDate, 'EEEE', { locale: locale === 'vi' ? vi : undefined })}
                                    </span>
                                </div>

                                {/* In/Out Column (Pill) */}
                                <div className="flex justify-center items-center">
                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900/30 rounded-full border border-white/5 group-hover:border-primary/10 transition-colors h-fit">
                                        <span className="font-mono text-[10px] font-bold text-emerald-500/80">
                                            {log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm') : '--:--'}
                                        </span>
                                        <span className="material-symbols-outlined text-[12px] text-slate-700">arrow_forward</span>
                                        <span className="font-mono text-[10px] font-bold text-slate-300">
                                            {log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm') : '--:--'}
                                        </span>
                                    </div>
                                </div>

                                {/* Hours Column */}
                                <div className="text-right flex flex-col justify-center">
                                    <span className={`text-xs font-bold ${duration >= 8 ? 'text-primary' : isClosed ? 'text-amber-500/80' : 'text-slate-700'
                                        }`}>
                                        {isClosed ? `${duration.toFixed(1)}h` : '--'}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="p-8 text-center text-slate-600 text-xs italic">
                        {t.dashboard.noRecentActivity}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}

        </div>
    )
}

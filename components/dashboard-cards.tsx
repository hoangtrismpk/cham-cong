'use client'

import { useI18n } from '@/contexts/i18n-context'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

import { useState, useEffect } from 'react'
import { getAttendanceStats } from '@/app/actions/attendance'

interface AttendanceProgressCardProps {
    weeklyStats: any
    monthlyStats: any
}

export function AttendanceProgressCard({ weeklyStats, monthlyStats }: AttendanceProgressCardProps) {
    const { t, locale } = useI18n()
    const [view, setView] = useState<'week' | 'month'>('week')
    const [showBars, setShowBars] = useState(false)

    // Trigger animation explicitly on mount & view change so all bars grow from 0
    useEffect(() => {
        const timer = setTimeout(() => setShowBars(true), 50)
        return () => clearTimeout(timer)
    }, [view])

    // Switch data instantly based on current view
    const data = view === 'week' ? weeklyStats : monthlyStats
    const loading = false

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
                            onClick={() => {
                                if (view === 'week') return;
                                setShowBars(false);
                                setView('week');
                            }}
                            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${view === 'week' ? 'bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.dashboard.week}
                        </button>
                        <button
                            onClick={() => {
                                if (view === 'month') return;
                                setShowBars(false);
                                setView('month');
                            }}
                            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${view === 'month' ? 'bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t.dashboard.month}
                        </button>
                    </div>
                </div>
            </div>

            {/* Total Work Time Summary Above Chart */}
            {/* Total Work Time Summary Above Chart */}
            <div className="flex flex-col gap-4 mb-8 relative z-10">
                <div className="flex items-baseline gap-3">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.totalWorkTime}:</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{(data.totalHours + data.totalOT).toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-slate-500">HRS</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 bg-slate-900/30 w-full rounded-xl p-3 border border-white/[0.02]">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.standardHours}</span>
                        <span className="text-lg font-black text-primary/80">{data.totalHours}h</span>
                    </div>
                    <div className="h-8 w-px bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.dashboard.overtime}</span>
                        <span className="text-lg font-black text-purple-400/80">{data.totalOT}h</span>
                    </div>
                    <div className="h-8 w-px bg-white/5"></div>
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

            {/* Chart Area - Bar chart with Y-axis (hours) and X-axis (days) */}
            {(() => {
                // Pre-compute each bar's total to find the max for auto-scaling
                const barData = data.dailyStats.map((stat: any) => {
                    const lateHours = Math.round(((stat.lateMinutes || 0) / 60) * 10) / 10
                    const standardHours = stat.standard || 0
                    const otHours = stat.ot || 0
                    // All 3 segments are ADDITIVE for bar height
                    const totalHours = standardHours + otHours + lateHours
                    return { ...stat, lateHours, standardHours, otHours, totalHours }
                })

                // Dynamic Y-axis scale: round up to nearest even number, minimum 10
                const maxVal = Math.max(...barData.map((b: any) => b.totalHours), 0)
                const yMax = Math.max(Math.ceil(maxVal / 2) * 2, 10)
                // Generate Y-axis ticks (e.g., 0, 2, 4, 6, 8, 10)
                const yStep = yMax <= 12 ? 2 : yMax <= 20 ? 4 : Math.ceil(yMax / 5)
                const yTicks: number[] = []
                for (let i = yMax; i >= 0; i -= yStep) yTicks.push(i)
                if (yTicks[yTicks.length - 1] !== 0) yTicks.push(0)

                return (
                    <div className={`flex-1 relative min-h-[220px] ${loading ? 'opacity-30' : 'opacity-100'} transition-opacity duration-300`}>
                        <div className="flex h-full">
                            {/* Y-axis labels */}
                            <div className="flex flex-col justify-between pr-2 py-0" style={{ height: '180px' }}>
                                {yTicks.map((tick, i) => (
                                    <span key={i} className="text-[9px] font-bold text-slate-600 tabular-nums leading-none text-right min-w-[20px]">
                                        {tick}h
                                    </span>
                                ))}
                            </div>

                            {/* Chart body */}
                            <div className="flex-1 flex flex-col">
                                {/* Bars + Grid area */}
                                <div className="relative" style={{ height: '180px' }}>
                                    {/* Horizontal grid lines */}
                                    {yTicks.map((tick, i) => {
                                        const pct = ((yMax - tick) / yMax) * 100
                                        return (
                                            <div
                                                key={i}
                                                className="absolute left-0 right-0 border-t border-dashed border-white/[0.04]"
                                                style={{ top: `${pct}%` }}
                                            />
                                        )
                                    })}

                                    {/* Bars container */}
                                    <div key={view} className={`absolute inset-0 flex items-end ${view === 'week' ? 'gap-3 sm:gap-5 px-2' : 'gap-px sm:gap-0.5'}`}>
                                        {barData.map((bar: any, i: number) => {
                                            const barHeightPct = yMax > 0 ? (bar.totalHours / yMax) * 100 : 0
                                            const latePct = bar.totalHours > 0 ? (bar.lateHours / bar.totalHours) * 100 : 0
                                            const stdPct = bar.totalHours > 0 ? (bar.standardHours / bar.totalHours) * 100 : 0
                                            const otPct = bar.totalHours > 0 ? (bar.otHours / bar.totalHours) * 100 : 0
                                            const hasActivity = bar.totalHours > 0

                                            return (
                                                <div key={i} className={`flex-1 min-w-0 h-full flex flex-col justify-end items-center group/bar ${bar.isOffDay ? 'opacity-20 hover:opacity-100' : ''} transition-opacity`}>
                                                    {/* Tooltip on hover */}
                                                    <div className="relative w-full flex justify-center">
                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur text-white text-[9px] py-1.5 px-3 rounded-lg border border-white/10 opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-20 pointer-events-none shadow-2xl flex flex-col items-center gap-0.5">
                                                            <span className="font-bold">{bar.standardHours}h {bar.otHours > 0 ? `+ ${bar.otHours}h OT` : ''}</span>
                                                            {bar.lateHours > 0 && (
                                                                <span className="text-rose-400 font-bold">Trễ: {bar.lateHours > 1 ? `${bar.lateHours.toFixed(1)}h` : `${bar.lateMinutes || Math.round(bar.lateHours * 60)}m`}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* The stacked bar */}
                                                    <div
                                                        className={`w-[85%] sm:w-full ${view === 'month' ? 'max-w-[10px] sm:max-w-[16px]' : 'max-w-[28px] sm:max-w-[44px]'} rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-700 ${hasActivity ? 'group-hover/bar:brightness-125' : ''}`}
                                                        style={{ height: showBars ? `${barHeightPct}%` : '0%', minHeight: (hasActivity && showBars) ? '4px' : '0' }}
                                                    >
                                                        {/* Top: Overtime (purple) */}
                                                        {otPct > 0 && (
                                                            <div
                                                                className="w-full bg-gradient-to-t from-purple-600/70 to-purple-400/70 transition-all duration-700"
                                                                style={{ height: `${otPct}%`, minHeight: '3px' }}
                                                            />
                                                        )}
                                                        {/* Middle: Standard hours (teal/primary) */}
                                                        {stdPct > 0 && (
                                                            <div
                                                                className="w-full bg-gradient-to-t from-primary/50 to-primary/70 transition-all duration-700"
                                                                style={{ height: `${stdPct}%`, minHeight: '3px' }}
                                                            />
                                                        )}
                                                        {/* Bottom: Late time (red) */}
                                                        {latePct > 0 && (
                                                            <div
                                                                className="w-full bg-gradient-to-t from-rose-600/70 to-rose-400/70 transition-all duration-700"
                                                                style={{ height: `${latePct}%`, minHeight: '3px' }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* X-axis labels */}
                                <div className={`flex ${view === 'week' ? 'gap-3 sm:gap-5 px-2' : 'gap-px sm:gap-0.5'} mt-3 border-t border-white/[0.06] pt-2`}>
                                    {barData.map((bar: any, i: number) => {
                                        const hasActivity = bar.totalHours > 0
                                        return (
                                            <div key={i} className="flex-1 min-w-0 text-center">
                                                <span className={`text-[9px] font-black tracking-tight transition-colors ${hasActivity ? 'text-slate-400' : 'text-slate-700'} ${view === 'month' ? 'text-[6px] sm:text-[7px]' : ''}`}>
                                                    {view === 'week' ? (dayNames[bar.label] || bar.label) : parseInt(bar.label, 10).toString()}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                )
            })()}
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

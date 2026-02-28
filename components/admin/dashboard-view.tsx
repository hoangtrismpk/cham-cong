'use client'

import { WeeklyAttendanceChart } from '@/components/charts/weekly-attendance-chart'
import { DepartmentChart } from '@/components/charts/department-chart'
import { format, differenceInMinutes, parseISO } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import Link from 'next/link'
import { useI18n } from '@/contexts/i18n-context'
import { LayoutDashboard } from 'lucide-react'

interface TrendData {
    name: string
    value: number
}

interface DeptData {
    name: string
    value: number
    color: string
}

interface UserProfile {
    full_name: string | null
    email: string | null
    avatar_url: string | null
    department: string | null
}

interface ActiveLog {
    id: string
    check_in_time: string
    check_out_time: string | null
    status: string | null
    profiles: UserProfile | null
    work_date: string
}

interface AdminDashboardClientProps {
    stats: {
        totalEmployees: number
        growth: number
        uniqueCurrentlyIn: number
        lateUserCount: number
        absent: number
        latePercentage: number
        absentPercentage: number
        activePercentage: number
    }
    pendingStats: {
        total: number
        leaves: number
        changes: number
    }
    trendData: TrendData[]
    trendData30Days: TrendData[]
    deptData: DeptData[]
    activeLogs: ActiveLog[]
    todayStr: string
}

export function AdminDashboardClient({
    stats,
    pendingStats,
    trendData,
    trendData30Days,
    deptData,
    activeLogs,
    todayStr
}: AdminDashboardClientProps) {
    const { t, locale } = useI18n()
    const dateLocale = locale === 'vi' ? vi : enUS

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117] space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" />
                        {t.admin.overview}
                    </h1>
                    <p className="text-slate-400">
                        {t.admin.realTimeData} {todayStr}
                    </p>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-6 xl:grid-cols-5 gap-3 md:gap-6">

                {/* Pending Approvals */}
                <Link href="/admin/approvals" className="col-span-3 xl:col-span-1 block">
                    <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-orange-500/50 transition-all h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-orange-500/10 transition-all"></div>
                        <div className="flex justify-between items-center mb-3 md:mb-4 relative z-10">
                            <div className="p-1.5 md:p-2 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">mark_email_unread</span>
                            </div>
                            <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg ${pendingStats.total > 0 ? 'text-orange-500 bg-orange-500/10 animate-pulse' : 'text-slate-500 bg-slate-800'}`}>
                                {pendingStats.total > 0 ? t.admin.actionNeeded : t.admin.allClear}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider relative z-10">{t.admin.pendingRequests}</p>
                        <p className="text-2xl md:text-3xl font-black text-white mt-1 relative z-10">{pendingStats.total}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 relative z-10">
                            <span>{pendingStats.leaves} {t.admin.leave}</span>
                            <span className="w-1 h-3 bg-slate-700/50 rounded-full"></span>
                            <span>{pendingStats.changes} {t.admin.changes}</span>
                        </div>
                    </div>
                </Link>

                {/* Total Employees */}
                <div className="col-span-3 xl:col-span-1 bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-blue-500/50 transition-all">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">groups_3</span>
                        </div>
                        <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg ${stats.growth >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                            {stats.growth >= 0 ? '+' : ''}{stats.growth}%
                        </span>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t.admin.totalEmployees}</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalEmployees}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* Currently In */}
                <div className="col-span-2 xl:col-span-1 bg-[#161b2c] p-3 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-emerald-500/50 transition-all">
                    <div className="flex justify-between items-center mb-2 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[18px] md:text-[24px]">login</span>
                        </div>
                        <span className="text-emerald-500 text-[9px] md:text-xs font-bold bg-emerald-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">{t.admin.live}</span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider truncate">{t.admin.currentlyIn}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1">{stats.uniqueCurrentlyIn}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${stats.activePercentage}%` }}></div>
                    </div>
                </div>

                {/* Late Arrivals */}
                <div className="col-span-2 xl:col-span-1 bg-[#161b2c] p-3 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-amber-500/50 transition-all">
                    <div className="flex justify-between items-center mb-2 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[18px] md:text-[24px]">schedule_send</span>
                        </div>
                        <span className="text-amber-500 text-[9px] md:text-xs font-bold bg-amber-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">{stats.latePercentage}%</span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider truncate">{t.admin.lateArrivals}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1">{stats.lateUserCount}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${stats.latePercentage}%` }}></div>
                    </div>
                </div>

                {/* Off / Absent */}
                <div className="col-span-2 xl:col-span-1 bg-[#161b2c] p-3 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-rose-500/50 transition-all">
                    <div className="flex justify-between items-center mb-2 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[18px] md:text-[24px]">logout</span>
                        </div>
                        <span className="text-slate-400 text-[9px] md:text-xs font-bold bg-slate-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">{t.admin.today}</span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider truncate">{t.admin.offAbsent}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1">{stats.absent}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${stats.absentPercentage}%` }}></div>
                    </div>
                </div>

            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-[#161b2c] p-6 rounded-2xl border border-[#2d3748] shadow-sm">
                    <WeeklyAttendanceChart data7Days={trendData} data30Days={trendData30Days} />
                </div>

                <div className="bg-[#161b2c] p-6 rounded-2xl border border-[#2d3748] shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-white font-bold text-lg">{t.admin.departmentDistribution}</h3>
                        <p className="text-slate-500 text-xs">{t.admin.headcountByDivision}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        {/* Center Text for Donut Chart */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                            <span className="text-3xl font-black text-white leading-none">{stats.totalEmployees}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">STAFF</span>
                        </div>
                        <DepartmentChart data={deptData} />
                    </div>
                </div>
            </div>

            {/* Active Personnel Table */}
            <div className="bg-[#161b2c] rounded-2xl border border-[#2d3748] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#2d3748] flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <h3 className="text-white font-bold text-lg">{t.admin.activePersonnel}</h3>
                        <p className="text-slate-500 text-xs">{t.admin.realTimeStatus}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#2d3748] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            {t.admin.export}
                        </button>
                        <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#2d3748] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">filter_list</span>
                            {t.admin.filter}
                        </button>
                    </div>
                </div>

                {/* Desktop View: Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-800/30 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-[#2d3748]">
                                <th className="px-4 md:px-6 py-4">{t.admin.employee}</th>
                                <th className="px-6 py-4">{t.admin.department}</th>
                                <th className="px-4 md:px-6 py-4">{t.admin.status}</th>
                                <th className="px-6 py-4">{t.admin.clockIn}</th>
                                <th className="px-6 py-4">{t.admin.dailyTotal}</th>
                                <th className="px-4 md:px-6 py-4 text-right">{t.admin.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d3748]/50">
                            {activeLogs?.map((log: ActiveLog) => {
                                const checkIn = parseISO(log.check_in_time)
                                const durationMinutes = differenceInMinutes(new Date(), checkIn)
                                const hours = Math.floor(durationMinutes / 60)
                                const minutes = durationMinutes % 60

                                // Determine Status Badge Color
                                let statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' // Default Present
                                let statusText = t.admin.clockedIn

                                if (log.status === 'late') {
                                    statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    statusText = t.admin.late
                                } else if (log.check_out_time) {
                                    statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    statusText = t.admin.completed // Or checkedOut
                                }

                                return (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-slate-700 bg-cover bg-center ring-2 ring-slate-800 group-hover:ring-primary/40 transition-all flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                    {log.profiles?.avatar_url ? (
                                                        <img src={log.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        (log.profiles?.full_name?.[0] || 'U')
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white">{log.profiles?.full_name || 'Unknown'}</p>
                                                    <p className="text-[11px] text-slate-500">{log.profiles?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400">{log.profiles?.department || 'N/A'}</td>
                                        <td className="px-4 md:px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusColor} whitespace-nowrap`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-300 font-mono">{format(checkIn, 'hh:mm a', { locale: dateLocale })}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-white">
                                            {log.check_out_time ? t.admin.completed : `${hours}h ${minutes}m`}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                                                <span className="material-symbols-outlined text-lg">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}

                            {(!activeLogs || activeLogs.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                                        {t.admin.noActiveCheckins}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-[#2d3748] flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.admin.showingResults?.replace('{count}', (activeLogs?.length || 0).toString())}</p>
                </div>
            </div>
        </div >
    )
}

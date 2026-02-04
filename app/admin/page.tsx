import { createClient } from '@/utils/supabase/server'
import { WeeklyAttendanceChart } from '@/components/charts/weekly-attendance-chart'
import { DepartmentChart } from '@/components/charts/department-chart'
import { format, subDays, differenceInMinutes, parseISO } from 'date-fns'

export const revalidate = 0 // Disable caching for realtime data

export default async function AdminDashboard() {
    const supabase = await createClient()

    // 1. Get Stats Overview
    // Force VN Timezone for 'today' query to avoid UTC mismatch
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const today = getVNNow().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    // Total Employees
    const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    // Employees 30 days ago (for trend)
    const { count: prevEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgoStr)

    const empGrowth = prevEmployees && totalEmployees
        ? Math.round(((totalEmployees - prevEmployees) / prevEmployees) * 100)
        : 0

    // Currently In (Unique Users currently on site)
    const { data: currentInLogs } = await supabase
        .from('attendance_logs')
        .select('user_id')
        .eq('work_date', today)
        .is('check_out_time', null)

    // Use Set to count unique users currently in
    const uniqueCurrentlyIn = new Set(currentInLogs?.map(l => l.user_id)).size

    // Accurate Late Arrivals Calculation (From DB Status)
    // Since checkIn action now calculates and sets 'status' = 'late', we just query it.
    const { data: lateLogs } = await supabase
        .from('attendance_logs')
        .select('user_id')
        .eq('work_date', today)
        .eq('status', 'late')

    const lateUserCount = new Set(lateLogs?.map(l => l.user_id)).size

    // Absent calculation
    // Total Employees - Unique Users who have checked in at least once
    const { data: todayAllLogs } = await supabase
        .from('attendance_logs')
        .select('user_id')
        .eq('work_date', today)

    const userFirstCheckIn = new Set(todayAllLogs?.map(l => l.user_id));
    const uniquePresentCount = userFirstCheckIn.size;
    const absent = Math.max((totalEmployees || 0) - uniquePresentCount, 0);

    // Percentages
    const latePercentage = (uniquePresentCount > 0) ? Math.round((lateUserCount / uniquePresentCount) * 100) : 0
    const absentPercentage = (totalEmployees && totalEmployees > 0) ? Math.round((absent / totalEmployees) * 100) : 0
    const activePercentage = (totalEmployees && totalEmployees > 0) ? Math.round((uniqueCurrentlyIn / totalEmployees) * 100) : 0

    // 2. Weekly Trend Data
    const trendData = []
    for (let i = 6; i >= 0; i--) {
        const date = subDays(getVNNow(), i) // Use getVNNow() for consistent timezone
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayLabel = format(date, 'EEE') // Mon, Tue...

        const { count } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .eq('work_date', dateStr)

        trendData.push({ name: dayLabel, value: count || 0 })
    }

    // 3. Department Distribution
    const { data: profiles } = await supabase
        .from('profiles')
        .select('department')

    const deptCounts: Record<string, number> = {}
    profiles?.forEach(p => {
        const dept = p.department || 'Unknown'
        deptCounts[dept] = (deptCounts[dept] || 0) + 1
    })

    // Colors matching design: Blue, Green, Yellow, Red
    const deptColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']
    const deptData = Object.keys(deptCounts).map((dept, idx) => ({
        name: dept,
        value: deptCounts[dept],
        color: deptColors[idx % deptColors.length]
    }))

    // 4. Active Personnel Table Data
    const { data: activeLogs } = await supabase
        .from('attendance_logs')
        .select(`
            *,
            profiles:user_id ( full_name, role, department, avatar_url )
        `)
        .eq('work_date', today)
        .order('check_in_time', { ascending: false })
        .limit(10) // Show last 10 entries

    return (
        <div className="p-8 max-w-[1600px] w-full mx-auto space-y-8 bg-[#0b0f1a] min-h-screen">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                    <p className="text-slate-400 text-sm">Real-time data from {today}</p>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

                {/* Total Employees */}
                <div className="bg-[#161b2c] p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-blue-500/50 transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">groups_3</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${empGrowth >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                            {empGrowth >= 0 ? '+' : ''}{empGrowth}%
                        </span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Employees</p>
                    <p className="text-3xl font-black text-white mt-1">{totalEmployees}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* Currently In */}
                <div className="bg-[#161b2c] p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-emerald-500/50 transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">login</span>
                        </div>
                        <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">Live</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Currently In</p>
                    <p className="text-3xl font-black text-white mt-1">{uniqueCurrentlyIn}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${activePercentage}%` }}></div>
                    </div>
                </div>

                {/* Late Arrivals */}
                <div className="bg-[#161b2c] p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-amber-500/50 transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">schedule_send</span>
                        </div>
                        <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-1 rounded-lg">{latePercentage}%</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Late Arrivals</p>
                    <p className="text-3xl font-black text-white mt-1">{lateUserCount}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${latePercentage}%` }}></div>
                    </div>
                </div>

                {/* Off / Absent */}
                <div className="bg-[#161b2c] p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-rose-500/50 transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                        <span className="text-slate-400 text-xs font-bold bg-slate-800 px-2 py-1 rounded-lg">Today</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Off / Absent</p>
                    <p className="text-3xl font-black text-white mt-1">{absent}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${absentPercentage}%` }}></div>
                    </div>
                </div>

            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#161b2c] rounded-2xl border border-[#2d3748] p-6 flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-white font-bold text-lg">Weekly Attendance Trend</h3>
                            <p className="text-slate-500 text-xs">Visualizing average workforce participation</p>
                        </div>
                        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
                            <button className="text-[10px] font-bold px-3 py-1 bg-primary text-white rounded-md shadow-lg shadow-primary/20">7 Days</button>
                            <button className="text-[10px] font-bold px-3 py-1 text-slate-400 hover:text-white rounded-md">30 Days</button>
                        </div>
                    </div>

                    <WeeklyAttendanceChart data={trendData} />
                </div>

                <div className="bg-[#161b2c] rounded-2xl border border-[#2d3748] p-6 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-white font-bold text-lg">Department Distribution</h3>
                        <p className="text-slate-500 text-xs">Total headcount by division</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        {/* Center Text for Donut Chart */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                            <span className="text-3xl font-black text-white leading-none">{totalEmployees}</span>
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
                        <h3 className="text-white font-bold text-lg">Active Personnel</h3>
                        <p className="text-slate-500 text-xs">Manage and view real-time status</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#2d3748] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            Export
                        </button>
                        <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#2d3748] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">filter_list</span>
                            Filter
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/30 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-[#2d3748]">
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Clock In</th>
                                <th className="px-6 py-4">Daily Total</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d3748]/50">
                            {activeLogs?.map((log: any) => {
                                const checkIn = parseISO(log.check_in_time)
                                const durationMinutes = differenceInMinutes(new Date(), checkIn)
                                const hours = Math.floor(durationMinutes / 60)
                                const minutes = durationMinutes % 60

                                // Determine Status Badge Color
                                let statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' // Default Present
                                let statusText = 'Clocked In'

                                if (log.status === 'late') {
                                    statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    statusText = 'Late'
                                } else if (log.check_out_time) {
                                    statusColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    statusText = 'Checked Out'
                                }

                                return (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-slate-700 bg-cover bg-center ring-2 ring-slate-800 group-hover:ring-primary/40 transition-all flex items-center justify-center text-xs font-bold text-white">
                                                    {log.profiles?.avatar_url ? (
                                                        <img src={log.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        (log.profiles?.full_name?.[0] || 'U')
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{log.profiles?.full_name || 'Unknown'}</p>
                                                    <p className="text-[11px] text-slate-500">{log.profiles?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400">{log.profiles?.department || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusColor}`}>
                                                {statusText}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-300 font-mono">{format(checkIn, 'hh:mm a')}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-white">
                                            {log.check_out_time ? 'Completed' : `${hours}h ${minutes}m`}
                                        </td>
                                        <td className="px-6 py-4 text-right">
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
                                        No active check-ins found for today.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-[#2d3748] flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Showing {activeLogs?.length || 0} Results</p>
                </div>
            </div>
        </div>
    )
}

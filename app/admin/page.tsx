import { createClient } from '@/utils/supabase/server'
import { format, subDays } from 'date-fns'
import { getPendingStats } from '@/app/actions/approvals'
import { AdminDashboardClient } from '@/components/admin/dashboard-view'
import { ClientRedirect } from '@/components/client-redirect'

export const revalidate = 0 // Disable caching for realtime data

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <ClientRedirect url="/login" />
    }

    // Custom permission logic to avoid infinite redirects and query DB only once
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role, 
            roles (
                name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    const roles = profile?.roles as any
    const roleData = Array.isArray(roles) ? roles[0] : roles
    const permissions = roleData?.permissions || []

    const isAdmin = profile?.role === 'admin' || roleData?.name === 'admin' || permissions.includes('*')

    const hasPerm = (required: string) => {
        if (isAdmin) return true
        if (permissions.includes(required)) return true
        const resource = required.split('.')[0]
        if (permissions.includes(`${resource}.*`)) return true
        return false
    }

    if (!hasPerm('dashboard.view')) {
        const fallbackRoutes = [
            { perm: 'my_team.view', url: '/admin/my-team' },
            { perm: 'users.view', url: '/admin/employees' },
            { perm: 'approvals.view', url: '/admin/approvals' },
            { perm: 'attendance.view', url: '/admin/attendance' },
            { perm: 'reports.view', url: '/admin/reports' },
            { perm: 'settings.view', url: '/admin/settings/general' },
        ]

        let redirectUrl = '/'
        for (const route of fallbackRoutes) {
            if (hasPerm(route.perm)) {
                redirectUrl = route.url
                break
            }
        }
        return <ClientRedirect url={redirectUrl} />
    }

    // 1. Get Stats Overview
    // Force VN Timezone for 'today' query to avoid UTC mismatch
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const today = getVNNow().toISOString().split('T')[0]
    const todayStr = format(getVNNow(), 'yyyy-MM-dd')
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

    // 2. Trend Data (Optimized Single Query)
    const trendStartDate = subDays(getVNNow(), 29)
    const trendStartDateStr = format(trendStartDate, 'yyyy-MM-dd')
    const currentTodayStr = format(getVNNow(), 'yyyy-MM-dd')

    const { data: logs } = await supabase
        .from('attendance_logs')
        .select('work_date')
        .gte('work_date', trendStartDateStr)
        .lte('work_date', currentTodayStr)

    // Group logs by date
    const counts: Record<string, number> = {}
    logs?.forEach((log: any) => {
        const date = log.work_date
        counts[date] = (counts[date] || 0) + 1
    })

    // Generate 7 Days Data
    const trendData = []
    for (let i = 6; i >= 0; i--) {
        const date = subDays(getVNNow(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayLabel = format(date, 'EEE')
        trendData.push({ name: dayLabel, value: counts[dateStr] || 0 })
    }

    // Generate 30 Days Data
    const trendData30Days = []
    for (let i = 29; i >= 0; i--) {
        const date = subDays(getVNNow(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayLabel = format(date, 'dd/MM')
        trendData30Days.push({ name: dayLabel, value: counts[dateStr] || 0 })
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

    // 5. Pending Stats
    const pendingStats = await getPendingStats()

    const stats = {
        totalEmployees: totalEmployees || 0,
        growth: empGrowth,
        uniqueCurrentlyIn,
        lateUserCount,
        absent,
        latePercentage,
        absentPercentage,
        activePercentage
    }

    return (
        <AdminDashboardClient
            stats={stats}
            pendingStats={pendingStats}
            trendData={trendData}
            trendData30Days={trendData30Days}
            deptData={deptData}
            activeLogs={activeLogs || []}
            todayStr={todayStr}
        />
    )
}

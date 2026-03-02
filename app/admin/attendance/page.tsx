import { createClient } from '@/utils/supabase/server'
import { AttendanceClient } from './client-page'
import { ClientRedirect } from '@/components/client-redirect'
import { checkPermission } from '@/utils/auth-guard'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Chấm công - Quản lý Chấm công",
    description: "Quản lý và theo dõi nhật ký chấm công của nhân viên.",
}

export const revalidate = 0

export default async function AttendancePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const fromParam = typeof searchParams.from === 'string' ? searchParams.from : ''
    const toParam = typeof searchParams.to === 'string' ? searchParams.to : ''

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <ClientRedirect url="/login" />

    // Check base permission
    const hasView = await checkPermission('attendance.view')
    if (!hasView) return <ClientRedirect url="/admin" />

    // Determine view scope: view_all > view_team
    const hasViewAll = await checkPermission('attendance.view_all')
    const hasViewTeam = await checkPermission('attendance.view_team')

    // Scope: 'all' = company-wide, 'team' = direct reports only
    // Admin (role admin) defaults to 'all' via checkPermission bypass
    const viewScope: 'all' | 'team' = hasViewAll ? 'all' : (hasViewTeam ? 'team' : 'all')

    // 1. Get Target Date Range (Default to Current Month)
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)

    let startDateStr = fromParam
    let endDateStr = toParam

    if (!startDateStr || !endDateStr) {
        const now = getVNNow()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        startDateStr = `${year}-${month}-01`

        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
        endDateStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    }

    // 2. Build the list of user IDs this person is allowed to see
    let allowedUserIds: string[] | null = null // null = all users (no filter)

    if (viewScope === 'team') {
        // Only direct reports - get profiles where manager_id = current user
        const { data: directReports } = await supabase
            .from('profiles')
            .select('id')
            .eq('manager_id', user.id)

        allowedUserIds = directReports?.map(p => p.id) || []
    }

    // 3. Fetch Data in Parallel (apply scope filter)
    let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, department, job_title')

    if (allowedUserIds !== null) {
        // Team scope: only fetch allowed profiles
        if (allowedUserIds.length === 0) {
            // No direct reports - show empty
            return (
                <AttendanceClient
                    initialEmployees={[]}
                    stats={{ totalEmployees: 0, totalWorkDays: 0, totalLateDays: 0, totalLeaveDays: 0 }}
                    startDateStr={startDateStr}
                    endDateStr={endDateStr}
                    viewScope={viewScope}
                />
            )
        }
        profilesQuery = profilesQuery.in('id', allowedUserIds)
    }

    const [
        profilesResult,
        { data: allAttendanceLogs },
        { data: allLeaveRequests }
    ] = await Promise.all([
        profilesQuery,
        supabase.from('attendance_logs').select('*').gte('work_date', startDateStr).lte('work_date', endDateStr),
        supabase.from('leave_requests').select('user_id, leave_date').gte('leave_date', startDateStr).lte('leave_date', endDateStr).eq('status', 'approved'),
    ])

    const profiles = profilesResult.data || []

    // Build a Set of allowed IDs for filtering logs/leaves
    const profileIdSet = new Set(profiles.map(p => p.id))

    // Filter attendance logs and leave requests to only allowed profiles
    const attendanceLogs = (allAttendanceLogs || []).filter(l => profileIdSet.has(l.user_id))
    const leaveRequests = (allLeaveRequests || []).filter(l => profileIdSet.has(l.user_id))

    let totalWorkDaysAll = 0
    let totalLateDaysAll = 0
    let totalLeaveDaysAll = 0

    // 5. Merge Data for Table (Monthly Aggregation)
    const employees = profiles.map(profile => {
        const userLogs = attendanceLogs.filter(l => l.user_id === profile.id) || []
        const userLeaves = leaveRequests.filter(l => l.user_id === profile.id) || []

        const daysWorked = new Set(userLogs.map(l => l.work_date))
        const workDays = daysWorked.size
        const leaveDays = new Set(userLeaves.map(l => l.leave_date)).size

        let lateDays = 0
        let totalHours = 0
        let totalOvertimeHours = 0

        daysWorked.forEach(date => {
            const dayLogs = userLogs.filter(l => l.work_date === date)
            dayLogs.sort((a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime())
            if (dayLogs[0].status === 'late') lateDays++

            dayLogs.forEach(lg => {
                let dailyHours = 0
                if (lg.check_in_time && lg.check_out_time) {
                    dailyHours = (new Date(lg.check_out_time).getTime() - new Date(lg.check_in_time).getTime()) / (1000 * 60 * 60)
                } else if (lg.check_in_time && date === new Date().toISOString().split('T')[0]) {
                    // Trạng thái đang checkin trong ngày hôm nay thì cộng tạm giờ đến hiện tại
                    dailyHours = (new Date().getTime() - new Date(lg.check_in_time).getTime()) / (1000 * 60 * 60)
                }
                totalHours += dailyHours
                totalOvertimeHours += (lg.overtime_hours || 0)
            })
        })

        totalWorkDaysAll += workDays
        totalLateDaysAll += lateDays
        totalLeaveDaysAll += leaveDays

        return {
            id: profile.id,
            employeeId: `#EMP-${profile.id.substring(0, 4)}`,
            name: profile.full_name || 'N/A',
            email: profile.email,
            avatar: profile.avatar_url,
            department: profile.department || 'Unassigned',
            workDays,
            lateDays,
            leaveDays,
            totalHours,
            totalOvertimeHours
        }
    })

    const stats = {
        totalEmployees: profiles.length,
        totalWorkDays: totalWorkDaysAll,
        totalLateDays: totalLateDaysAll,
        totalLeaveDays: totalLeaveDaysAll
    }

    return (
        <AttendanceClient
            initialEmployees={employees}
            stats={stats}
            startDateStr={startDateStr}
            endDateStr={endDateStr}
            viewScope={viewScope}
        />
    )
}

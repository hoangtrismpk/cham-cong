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

export default async function AttendancePage() {
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

    // 1. Get Today's Date (VN Timezone)
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const todayStr = getVNNow().toISOString().split('T')[0]

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
                    stats={{ totalEmployees: 0, present: 0, late: 0, onLeave: 0 }}
                    todayStr={todayStr}
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
        supabase.from('attendance_logs').select('*').eq('work_date', todayStr),
        supabase.from('leave_requests').select('user_id').eq('leave_date', todayStr).eq('status', 'approved'),
    ])

    const profiles = profilesResult.data || []

    // Build a Set of allowed IDs for filtering logs/leaves
    const profileIdSet = new Set(profiles.map(p => p.id))

    // Filter attendance logs and leave requests to only allowed profiles
    const attendanceLogs = (allAttendanceLogs || []).filter(l => profileIdSet.has(l.user_id))
    const leaveRequests = (allLeaveRequests || []).filter(l => profileIdSet.has(l.user_id))

    // 4. Process Stats
    const presentUserIds = new Set(attendanceLogs.map(l => l.user_id))
    const lateUserIds = new Set(attendanceLogs.filter(l => l.status === 'late').map(l => l.user_id))
    const leaveUserIds = new Set(leaveRequests.map(l => l.user_id))

    const stats = {
        totalEmployees: profiles.length,
        present: presentUserIds.size,
        late: lateUserIds.size,
        onLeave: leaveUserIds.size
    }

    // 5. Merge Data for Table
    const employees = profiles.map(profile => {
        const userLogs = attendanceLogs.filter(l => l.user_id === profile.id) || []
        const isLeave = leaveUserIds.has(profile.id)

        let status = 'absent'
        let checkIn = null
        let checkOut = null
        let totalHours = 0
        let isLate = false
        let activeSessionStartTime = null

        if (isLeave) {
            status = 'on_leave'
        } else if (userLogs.length > 0) {
            userLogs.sort((a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime())
            checkIn = userLogs[0].check_in_time
            isLate = userLogs[0].status === 'late'

            const activeLog = userLogs.find(l => !l.check_out_time)
            if (activeLog) {
                status = 'clocked_in'
                checkOut = null
                activeSessionStartTime = activeLog.check_in_time
            } else {
                status = 'clocked_out'
                checkOut = userLogs[userLogs.length - 1].check_out_time
            }

            userLogs.forEach(log => {
                if (log.check_in_time && log.check_out_time) {
                    const inTime = new Date(log.check_in_time).getTime()
                    const outTime = new Date(log.check_out_time).getTime()
                    totalHours += (outTime - inTime) / (1000 * 60 * 60)
                }
            })
        }

        return {
            id: profile.id,
            employeeId: `#EMP-${profile.id.substring(0, 4)}`,
            name: profile.full_name || 'N/A',
            email: profile.email,
            avatar: profile.avatar_url,
            department: profile.department || 'Unassigned',
            status,
            isLate,
            checkIn,
            checkOut,
            totalHours,
            activeSessionStartTime
        }
    })

    return (
        <AttendanceClient
            initialEmployees={employees}
            stats={stats}
            todayStr={todayStr}
            viewScope={viewScope}
        />
    )
}

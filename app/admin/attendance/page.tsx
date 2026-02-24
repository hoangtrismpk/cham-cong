import { createClient } from '@/utils/supabase/server'
import { AttendanceClient } from './client-page'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/utils/auth-guard'

export const revalidate = 0

export default async function AttendancePage() {
    await requirePermission('attendance.view', '/admin')

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Get Today's Date (VN Timezone)
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const todayStr = getVNNow().toISOString().split('T')[0]

    // 2. Fetch Data in Parallel
    const [
        { count: totalEmployees },
        { data: attendanceLogs },
        { data: leaveRequests },
        { data: profiles }
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('attendance_logs').select('*').eq('work_date', todayStr),
        supabase.from('leave_requests').select('user_id').eq('leave_date', todayStr).eq('status', 'approved'),
        supabase.from('profiles').select('id, full_name, email, avatar_url, department, job_title')
    ])

    // 3. Process Stats
    // Use Set to ensure unique counts if multiple logs exist (though mostly 1 per day)
    const presentUserIds = new Set(attendanceLogs?.map(l => l.user_id))
    const lateUserIds = new Set(attendanceLogs?.filter(l => l.status === 'late').map(l => l.user_id))
    const leaveUserIds = new Set(leaveRequests?.map(l => l.user_id))

    const stats = {
        totalEmployees: totalEmployees || 0,
        present: presentUserIds.size,
        late: lateUserIds.size,
        onLeave: leaveUserIds.size
    }

    // 4. Merge Data for Table
    const employees = profiles?.map(profile => {
        const userLogs = attendanceLogs?.filter(l => l.user_id === profile.id) || []
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
            employeeId: `#EMP-${profile.id.substring(0, 4)}`, // Mock ID format
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
    }) || []

    return (
        <AttendanceClient
            initialEmployees={employees}
            stats={stats}
            todayStr={todayStr}
        />
    )
}

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
        const log = attendanceLogs?.find(l => l.user_id === profile.id)
        const isLeave = leaveUserIds.has(profile.id)

        let status = 'absent'
        if (isLeave) status = 'on_leave'
        else if (log) {
            if (log.check_out_time) status = 'clocked_out'
            else status = 'clocked_in'

            // Override visibility if late? Or just add a badge? 
            // The design shows "LATE" as a status badge. 
            // But logic-wise, 'late' is a property of 'clocked_in'.
            // I'll pass 'late' boolean.
        }

        return {
            id: profile.id,
            employeeId: `#EMP-${profile.id.substring(0, 4)}`, // Mock ID format
            name: profile.full_name || 'N/A',
            email: profile.email,
            avatar: profile.avatar_url,
            department: profile.department || 'Unassigned',
            status,
            isLate: log?.status === 'late',
            checkIn: log?.check_in_time,
            checkOut: log?.check_out_time,
            totalHours: log?.total_hours
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

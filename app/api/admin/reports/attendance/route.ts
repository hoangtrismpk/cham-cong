import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { checkPermission } from '@/utils/auth-guard'

export async function GET(request: Request) {
    try {
        const hasAccess = await checkPermission('attendance.view')
        if (!hasAccess) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const monthStr = searchParams.get('month') // e.g. "2026-02"

        if (!monthStr) {
            return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 })
        }

        const supabase = await createClient()

        // Fetch all profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, department, job_title')

        if (profileError) throw profileError

        // Fetch attendance logs for the month using date range (DATE type, not text)
        const [year, month] = monthStr.split('-').map(Number)
        const firstDay = `${monthStr}-01`
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

        const { data: logs, error: logError } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('work_date', firstDay)
            .lte('work_date', lastDay)

        if (logError) throw logError

        // Fetch leave requests for the month using date range
        const { data: leaves, error: leaveError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'approved')
            .gte('leave_date', firstDay)
            .lte('leave_date', lastDay)

        if (leaveError) throw leaveError

        return NextResponse.json({
            profiles: profiles || [],
            logs: logs || [],
            leaves: leaves || []
        })

    } catch (error: any) {
        console.error('Error fetching attendance report data:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

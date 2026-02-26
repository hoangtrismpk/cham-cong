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
        const scope = searchParams.get('scope') || 'all' // 'all' or 'team'

        if (!monthStr) {
            return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 })
        }

        const supabase = await createClient()

        // Determine view scope based on permissions
        const hasViewAll = await checkPermission('attendance.view_all')
        const hasViewTeam = await checkPermission('attendance.view_team')

        // Effective scope: server-side re-validation (don't trust client param alone)
        const effectiveScope: 'all' | 'team' = hasViewAll ? 'all' : (hasViewTeam ? 'team' : 'all')

        // Get current user for team filter
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Build profile query with scope filter
        let profileQuery = supabase
            .from('profiles')
            .select('id, full_name, email, department, job_title')

        if (effectiveScope === 'team') {
            // Only direct reports of the current user
            profileQuery = profileQuery.eq('manager_id', user.id)
        }

        const { data: profiles, error: profileError } = await profileQuery

        if (profileError) throw profileError

        // If no profiles match (e.g., team scope with no direct reports), return empty
        if (!profiles || profiles.length === 0) {
            return NextResponse.json({
                profiles: [],
                logs: [],
                leaves: []
            })
        }

        // Build allowed user IDs set for filtering logs & leaves
        const allowedIds = profiles.map(p => p.id)

        // Fetch attendance logs for the month using date range
        const [year, month] = monthStr.split('-').map(Number)
        const firstDay = `${monthStr}-01`
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

        const { data: allLogs, error: logError } = await supabase
            .from('attendance_logs')
            .select('*')
            .gte('work_date', firstDay)
            .lte('work_date', lastDay)

        if (logError) throw logError

        // Fetch leave requests for the month
        const { data: allLeaves, error: leaveError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'approved')
            .gte('leave_date', firstDay)
            .lte('leave_date', lastDay)

        if (leaveError) throw leaveError

        // Filter logs and leaves to only allowed profiles (respect scope)
        const allowedIdSet = new Set(allowedIds)
        const logs = (allLogs || []).filter(l => allowedIdSet.has(l.user_id))
        const leaves = (allLeaves || []).filter(l => allowedIdSet.has(l.user_id))

        return NextResponse.json({
            profiles: profiles || [],
            logs,
            leaves
        })

    } catch (error: any) {
        console.error('Error fetching attendance report data:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

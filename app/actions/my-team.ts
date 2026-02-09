'use server'

import { createClient } from '@/utils/supabase/server'

export interface TeamMember {
    id: string
    first_name: string
    last_name: string
    full_name: string
    avatar_url: string | null
    job_title: string | null
    department: string | null
    manager_id: string | null
    employee_code: string | null
    email: string
    phone: string | null
    status: string
    attendance?: {
        status: 'present' | 'late' | 'absent' | 'leave'
        check_in: string | null
    } | null
}

export interface TeamStats {
    total: number
    present: number
    late: number
    absent: number
    leave: number
}

function calculateStats(team: TeamMember[]): TeamStats {
    const total = team.length
    const present = team.filter(m => m.attendance?.status === 'present' || (m.attendance?.check_in && m.attendance?.status !== 'late')).length
    const late = team.filter(m => m.attendance?.status === 'late').length
    // Absent logic is tricky without explicit absent logs, assumed if no log. 
    // However, status might be 'leave'.
    const leave = team.filter(m => m.attendance?.status === 'leave').length
    const absent = total - present - late - leave // Remaining

    return { total, present, late, absent, leave }
}

export async function getMyTeamData() {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized', team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } }

    try {
        // Check role
        const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('role, roles(name)')
            .eq('id', user.id)
            .single()

        // Handle role check safely
        const roleName = currentUserProfile?.roles && !Array.isArray(currentUserProfile.roles)
            ? (currentUserProfile.roles as any).name
            : currentUserProfile?.role

        const isAdmin = roleName === 'admin'

        // 2. Fetch all profiles needed to build the tree
        // For efficiency in small orgs (< 500 users), fetching all is fine.
        const { data: allProfiles, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, avatar_url, job_title, department, manager_id, employee_code, email, phone, status')

        if (error) throw error
        if (!allProfiles) return { team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } }

        // 3. Build hierarchy for current user
        let teamMembers: any[] = []

        if (isAdmin) {
            // Admin sees everyone
            teamMembers = allProfiles
        } else {
            // Manager sees themselves + descendants
            const queue = [user.id]
            const visited = new Set([user.id])

            // Add Self
            const self = allProfiles.find(p => p.id === user.id)
            if (self) teamMembers.push(self)

            // BFS to find all descendants (reports of reports)
            while (queue.length > 0) {
                const managerId = queue.shift()
                const directs = allProfiles.filter(p => p.manager_id === managerId)

                for (const direct of directs) {
                    if (!visited.has(direct.id)) {
                        visited.add(direct.id)
                        teamMembers.push(direct)
                        queue.push(direct.id)
                    }
                }
            }
        }

        // 4. Get Attendance Stats for these members for Today
        const today = new Date().toISOString().split('T')[0]
        const ids = teamMembers.map(m => m.id)

        let logs: any[] = []
        if (ids.length > 0) {
            const { data } = await supabase
                .from('attendance_logs')
                .select('employee_id, status, check_in_time')
                .eq('work_date', today)
                .in('employee_id', ids)
            logs = data || []
        }

        // Merge logs into team members
        const teamWithStatus: TeamMember[] = teamMembers.map(member => {
            const log = logs.find(l => l.employee_id === member.id)
            return {
                ...member,
                attendance: log ? { status: log.status, check_in: log.check_in_time } : null
            }
        })

        return {
            team: teamWithStatus,
            stats: calculateStats(teamWithStatus)
        }
    } catch (err: any) {
        console.error('Error fetching my team data:', err)
        return { error: err.message, team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } }
    }
}

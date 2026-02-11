'use server'

import { createClient } from '@/utils/supabase/server'

export interface TeamMember {
    id: string
    numeric_id?: number
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

interface GetMyTeamFilters {
    page?: number
    limit?: number
    search?: string
    department?: string
    status?: string
}

function calculateStats(teamIds: string[], allAttendance: any[]): TeamStats {
    const total = teamIds.length
    // Present = anyone who has checked in (status 'present', 'late', or just has a check_in_time)
    const present = allAttendance.filter(l =>
        l.status === 'present' || l.status === 'late' || l.check_in_time
    ).length
    const late = allAttendance.filter(l => l.status === 'late').length
    const leave = allAttendance.filter(l => l.status === 'leave').length

    // Absent = Total - (Checked-in) - (On leave)
    // Note: 'late' is already included in checked-in (present)
    const absent = Math.max(0, total - present - leave)

    return { total, present, late, absent, leave }
}

export async function getMyTeamData(filters: GetMyTeamFilters = {}) {
    const supabase = await createClient()
    const { page = 1, limit = 10, search = '', department = 'all', status = 'all' } = filters

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized', team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }, meta: { total: 0, page, limit, totalPages: 0 } }

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

        // 2. Fetch Hierarchy Structure (Lightweight)
        // Only fetch minimal columns to build the tree
        const { data: allProfiles, error } = await supabase
            .from('profiles')
            .select('id, manager_id, full_name, email, employee_code, department, status')

        if (error) throw error
        if (!allProfiles) return { team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }, meta: { total: 0, page, limit, totalPages: 0 } }

        // 3. Build Team IDs list
        let teamIds: string[] = []

        if (isAdmin) {
            // Admin sees everyone who matches first-level filters (if we were filtering strictly)
            // But for hierarchy logic, Admin is root of everything.
            // Let's filter later.
            teamIds = allProfiles.map(p => p.id)
        } else {
            // Manager sees themselves + descendants
            const queue = [user.id]
            const visited = new Set([user.id])
            teamIds.push(user.id)

            // BFS to find all descendants
            while (queue.length > 0) {
                const managerId = queue.shift()
                const directs = allProfiles.filter(p => p.manager_id === managerId)

                for (const direct of directs) {
                    if (!visited.has(direct.id)) {
                        visited.add(direct.id)
                        teamIds.push(direct.id)
                        queue.push(direct.id)
                    }
                }
            }
        }

        // --- FILTERING (Search/Dept/Status) on the full list FIRST ---
        // This is done in memory since we already fetched the lightweight structure.
        // For very large datasets, this should be moved to SQL Recursive CTE.
        let filteredIds = teamIds;
        if (search || department !== 'all' || status !== 'all') {
            filteredIds = teamIds.filter(id => {
                const profile = allProfiles.find(p => p.id === id);
                if (!profile) return false;

                const matchesSearch = !search ||
                    profile.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    profile.email?.toLowerCase().includes(search.toLowerCase()) ||
                    profile.employee_code?.toLowerCase().includes(search.toLowerCase());

                const matchesDept = department === 'all' || profile.department === department;
                const matchesStatus = status === 'all' || profile.status === status;

                return matchesSearch && matchesDept && matchesStatus;
            });
        }

        // 4. Get Attendance Stats for ALL filtered members (for KPI Cards)
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        let allAttendance: any[] = []
        if (filteredIds.length > 0) {
            const { data, error: attendanceError } = await supabase
                .from('attendance_logs')
                .select('user_id, status, check_in_time')
                .eq('work_date', today)
                .in('user_id', filteredIds)

            if (attendanceError) {
                console.error('Attendance fetch error:', attendanceError)
            }
            allAttendance = data || []
        }

        const stats = calculateStats(filteredIds, allAttendance);

        // 5. Pagination
        const total = filteredIds.length
        const start = (page - 1) * limit
        const end = start + limit
        const pageIds = filteredIds.slice(start, end)

        // 6. Fetch Full Details for Current Page
        if (pageIds.length === 0) {
            return { team: [], stats, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } }
        }

        const { data: pageProfiles } = await supabase
            .from('profiles')
            .select('id, numeric_id, first_name, last_name, full_name, avatar_url, job_title, department, manager_id, employee_code, email, phone, status')
            .in('id', pageIds)
            .order('full_name', { ascending: true }) // Sort the page results

        // Merge logs into page members
        const teamWithStatus: TeamMember[] = (pageProfiles || []).map((member: any) => {
            const log = allAttendance.find(l => l.user_id === member.id)
            return {
                ...member,
                attendance: log ? { status: log.status, check_in: log.check_in_time } : null
            }
        })

        return {
            team: teamWithStatus,
            stats,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (err: any) {
        console.error('Error fetching my team data:', err)
        return { error: err.message, team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }, meta: { total: 0, page, limit, totalPages: 0 } }
    }
}

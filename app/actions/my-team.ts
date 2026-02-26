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

    // Deduplicate by user_id - a user with multiple sessions should only be counted once
    // Priority: 'late' > 'present' > 'leave' (pick the worst status)
    const userStatusMap = new Map<string, string>()
    for (const log of allAttendance) {
        const existing = userStatusMap.get(log.user_id)
        if (!existing) {
            userStatusMap.set(log.user_id, log.status || 'present')
        } else {
            // If any session is 'late', mark user as late
            if (log.status === 'late') {
                userStatusMap.set(log.user_id, 'late')
            }
        }
    }

    let present = 0
    let late = 0
    let leave = 0

    for (const [, status] of userStatusMap) {
        if (status === 'late') {
            late++
            present++ // Late users ARE present (they checked in, just late)
        } else if (status === 'present') {
            present++
        } else if (status === 'leave') {
            leave++
        }
    }

    // Absent = people in team who have NO attendance record today and are NOT on leave
    const absent = Math.max(0, total - present - leave)

    return { total, present, late, absent, leave }
}

export async function getDescendantIds(userId: string, isAdmin: boolean = false): Promise<string[]> {
    const supabase = await createClient()
    const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, manager_id')

    if (error || !allProfiles) return []

    let teamIds: string[] = []

    if (isAdmin) {
        teamIds = allProfiles.map(p => p.id)
    } else {
        const queue = [userId]
        const visited = new Set([userId])
        teamIds.push(userId)

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
    return teamIds
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
        const { data: allProfiles, error } = await supabase
            .from('profiles')
            .select('id, manager_id, full_name, email, employee_code, department, status')

        if (error) throw error
        if (!allProfiles) return { team: [], stats: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }, meta: { total: 0, page, limit, totalPages: 0 } }

        // 3. Build Team IDs list
        const teamIds = await getDescendantIds(user.id, isAdmin)

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

        // Merge logs into page members (use latest check-in log per user)
        const teamWithStatus: TeamMember[] = (pageProfiles || []).map((member: any) => {
            // Get all logs for this user, pick the latest one for check_in time
            const memberLogs = allAttendance.filter(l => l.user_id === member.id)
            if (memberLogs.length === 0) {
                return { ...member, attendance: null }
            }

            // Sort by check_in_time desc to get the latest
            memberLogs.sort((a: any, b: any) =>
                new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()
            )
            const latestLog = memberLogs[0]

            // If ANY log is 'late', mark user as late (worst status wins)
            const hasLate = memberLogs.some((l: any) => l.status === 'late')

            return {
                ...member,
                attendance: {
                    status: hasLate ? 'late' : (latestLog.status || 'present'),
                    check_in: latestLog.check_in_time
                }
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

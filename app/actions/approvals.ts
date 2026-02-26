'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, parseISO, format } from 'date-fns'
import { createAuditLog } from './audit-logs'
import { checkPermission } from '@/utils/permissions'
import { getDescendantIds } from './my-team'
import { EmailService } from '@/lib/email-service'

/**
 * Determine the scope of approvals the current user can see.
 * - Admin/Super Admin → sees ALL requests (returns null = no filter)
 * - Manager/Leader with approvals.view → sees only requests from their team (returns user_id[])
 * - Others → sees nothing (returns empty array)
 */
async function getApprovalScope(): Promise<{ isAdmin: boolean, teamIds: string[] | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { isAdmin: false, teamIds: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, roles(name, permissions)')
        .eq('id', user.id)
        .single()

    const roles = profile?.roles as any
    const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name
    const permissions: string[] = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || []

    // Admin sees everything
    const isAdmin = profile?.role === 'admin' || roleName === 'admin' || permissions.includes('*')
    if (isAdmin) return { isAdmin: true, teamIds: null }

    // Check if user has approvals.view permission
    const hasApprovalView = permissions.includes('approvals.view') ||
        permissions.includes('approvals.*')
    if (!hasApprovalView) return { isAdmin: false, teamIds: [] }

    // Get all team member IDs (subordinates only, NOT including self)
    const allDescendants = await getDescendantIds(user.id, false)
    // Remove self from the list - we don't approve our own requests
    const teamIds = allDescendants.filter(id => id !== user.id)

    return { isAdmin: false, teamIds }
}

/**
 * Get all user IDs that should be notified when an employee creates a request.
 * Includes:
 *   1. All managers up the hierarchy chain (who have approvals.view or approvals.approve)
 *   2. All admin users
 * Excludes the employee themselves.
 * 
 * @param employeeUserId - The user who created the request
 * @param excludeUserId - Optional user to exclude (e.g., the approver themselves)
 */
export async function getApproverIds(employeeUserId: string, excludeUserId?: string): Promise<string[]> {
    const supabase = await createClient()

    // 1. Get all profiles with manager_id, role_id, and role
    const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, manager_id, role, role_id')

    if (!allProfiles) return []

    // 2. Walk UP the management chain from the employee
    const managerIds = new Set<string>()
    let currentId = employeeUserId
    const visited = new Set<string>()

    while (currentId) {
        const profile = allProfiles.find(p => p.id === currentId)
        if (!profile || !profile.manager_id || visited.has(profile.manager_id)) break

        visited.add(profile.manager_id)
        managerIds.add(profile.manager_id)
        currentId = profile.manager_id
    }

    // 3. Fetch role permissions for all managers to check who has approval access
    const managerArray = Array.from(managerIds)
    const approverIds = new Set<string>()

    if (managerArray.length > 0) {
        // Get the role_ids for managers
        const managerProfiles = allProfiles.filter(p => managerArray.includes(p.id))
        const roleIds = [...new Set(managerProfiles.map(p => p.role_id).filter(Boolean))]

        if (roleIds.length > 0) {
            const { data: roles } = await supabase
                .from('roles')
                .select('id, permissions')
                .in('id', roleIds)

            const approvalRoleIds = new Set<string>()
            roles?.forEach(r => {
                const perms: string[] = r.permissions || []
                if (perms.includes('*') || perms.includes('approvals.view') ||
                    perms.includes('approvals.approve') || perms.includes('approvals.*')) {
                    approvalRoleIds.add(r.id)
                }
            })

            // Add managers who have approval permissions
            managerProfiles.forEach(mp => {
                if (mp.role_id && approvalRoleIds.has(mp.role_id)) {
                    approverIds.add(mp.id)
                }
                // Also include if legacy role is admin
                if (mp.role === 'admin') {
                    approverIds.add(mp.id)
                }
            })
        }
    }

    // 4. Include ALL admin users (they always see everything)
    const adminProfiles = allProfiles.filter(p => p.role === 'admin')
    adminProfiles.forEach(a => approverIds.add(a.id))

    // 5. Remove the employee themselves and the excludeUserId
    approverIds.delete(employeeUserId)
    if (excludeUserId) approverIds.delete(excludeUserId)

    return Array.from(approverIds)
}

export interface ActivityItem {
    id: string
    type: 'leave_request' | 'attendance_edit' | 'profile_update' | 'schedule_change' | 'overtime_request' | 'other'
    title: string
    description: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    user: {
        id: string
        full_name: string
        email: string
        avatar_url: string | null
        department: string | null
        role: string | null
    }
    payload?: any
}

// Fetch pending counts for dashboard
export async function getPendingStats() {
    const supabase = await createClient()

    const { count: leaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: changeCount } = await supabase
        .from('change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: scheduleCount } = await supabase
        .from('work_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: overtimeCount } = await supabase
        .from('overtime_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    return {
        leaves: leaveCount || 0,
        changes: changeCount || 0,
        schedules: scheduleCount || 0,
        overtime: overtimeCount || 0,
        total: (leaveCount || 0) + (changeCount || 0) + (scheduleCount || 0) + (overtimeCount || 0)
    }
}

// Fetch activities based on status filter with PAGINATION
export async function getActivities(
    statusFilter: 'pending' | 'history',
    page: number = 1,
    limit: number = 10
): Promise<{ activities: ActivityItem[], totalCount: number }> {
    const supabase = await createClient()

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Count total records for all tables
    let leaveQuery = supabase
        .from('leave_requests')
        .select(`
            id,
            leave_date,
            reason,
            status,
            created_at,
            user_id,
            image_url,
            start_time,
            end_time,
            profiles:user_id (id, full_name, email, avatar_url, department, role)
        `)
        .order('created_at', { ascending: false })

    let changeQuery = supabase
        .from('change_requests')
        .select(`
            id,
            type,
            payload,
            reason,
            status,
            created_at,
            user_id,
            profiles:user_id (id, full_name, email, avatar_url, department, role)
        `)
        .order('created_at', { ascending: false })

    let scheduleQuery = supabase
        .from('work_schedules')
        .select(`
            id,
            work_date,
            shift_type,
            start_time,
            end_time,
            title,
            status,
            created_at,
            user_id,
            profiles:user_id (id, full_name, email, avatar_url, department, role)
        `)
        .order('created_at', { ascending: false })

    let overtimeQuery = supabase
        .from('overtime_requests')
        .select(`
            id,
            request_date,
            planned_hours,
            actual_hours,
            reason,
            status,
            created_at,
            user_id,
            profiles:user_id (id, full_name, email, avatar_url, department, role)
        `)
        .order('created_at', { ascending: false })


    if (statusFilter === 'pending') {
        leaveQuery = leaveQuery.eq('status', 'pending')
        changeQuery = changeQuery.eq('status', 'pending')
        scheduleQuery = scheduleQuery.eq('status', 'pending')
        overtimeQuery = overtimeQuery.eq('status', 'pending')
    } else {
        // History includes approved and rejected
        leaveQuery = leaveQuery.in('status', ['approved', 'rejected'])
        changeQuery = changeQuery.in('status', ['approved', 'rejected'])
        // For schedules, only show rejected in history to avoid flooding with all active shifts
        scheduleQuery = scheduleQuery.eq('status', 'rejected')
        overtimeQuery = overtimeQuery.in('status', ['approved', 'rejected'])
    }

    // Execute queries
    const [
        { data: leaves, error: leaveError },
        { data: changes, error: changeError },
        { data: schedules, error: scheduleError },
        { data: overtimeReqs, error: overtimeError }
    ] = await Promise.all([
        leaveQuery,
        changeQuery,
        scheduleQuery,
        overtimeQuery
    ])

    if (leaveError) console.error('Leave Error:', leaveError)
    if (changeError) console.error('Change Error:', changeError)
    if (scheduleError) console.error('Schedule Error:', scheduleError)
    if (overtimeError) console.error('Overtime Error:', overtimeError)

    // 3. Normalize & Merge
    const activities: ActivityItem[] = []

    // Map Leaves
    leaves?.forEach((leave: any) => {
        const profileData = Array.isArray(leave.profiles) ? leave.profiles[0] : leave.profiles
        const user = profileData || { id: leave.user_id, full_name: 'Unknown', email: '', avatar_url: null, department: 'N/A', role: 'Employee' }
        activities.push({
            id: leave.id,
            type: 'leave_request',
            title: `Nghỉ phép: ${new Date(leave.leave_date).toLocaleDateString('vi-VN')}`,
            description: `Yêu cầu xin nghỉ phép`,
            reason: leave.reason || 'Không có lý do',
            status: leave.status,
            created_at: leave.created_at,
            user: {
                id: user.id,
                full_name: user.full_name || 'No Name',
                email: user.email || '',
                avatar_url: user.avatar_url,
                department: user.department || 'Chưa cập nhật',
                role: user.role || 'Nhân viên'
            },
            payload: { leave_date: leave.leave_date, image_url: leave.image_url, start_time: leave.start_time, end_time: leave.end_time }
        })
    })

    // Map Changes
    changes?.forEach((change: any) => {
        const profileData = Array.isArray(change.profiles) ? change.profiles[0] : change.profiles
        const user = profileData || { id: change.user_id, full_name: 'Unknown', email: '', avatar_url: null, department: 'N/A', role: 'Employee' }
        let title = 'Yêu cầu thay đổi'
        let description = 'Yêu cầu cập nhật'

        if (change.type === 'attendance_edit') {
            title = 'Chỉnh sửa chấm công'
            description = 'Yêu cầu cập nhật thời gian vào/ra'
        } else if (change.type === 'profile_update') {
            title = 'Cập nhật hồ sơ'
            description = 'Yêu cầu thay đổi thông tin cá nhân'
        }

        activities.push({
            id: change.id,
            type: change.type,
            title,
            description,
            reason: change.reason || 'Không có lý do',
            status: change.status,
            created_at: change.created_at,
            user: {
                id: user.id,
                full_name: user.full_name || 'No Name',
                email: user.email || '',
                avatar_url: user.avatar_url,
                department: user.department || 'Chưa cập nhật',
                role: user.role || 'Nhân viên'
            },
            payload: change.payload
        })
    })

    // Map Schedules
    schedules?.forEach((schedule: any) => {
        const profileData = Array.isArray(schedule.profiles) ? schedule.profiles[0] : schedule.profiles
        const user = profileData || { id: schedule.user_id, full_name: 'Unknown', email: '', avatar_url: null, department: 'N/A', role: 'Employee' }

        let status: 'pending' | 'approved' | 'rejected' = 'pending'
        if (schedule.status === 'active') status = 'approved' // Map active to approved for UI consistency
        else if (schedule.status === 'rejected') status = 'rejected'
        else status = 'pending'

        const dateStr = new Date(schedule.work_date).toLocaleDateString('vi-VN')
        const timeStr = `${schedule.start_time} - ${schedule.end_time}`

        activities.push({
            id: schedule.id,
            type: 'schedule_change',
            title: `Đổi lịch: ${dateStr}`,
            description: `Thay đổi giờ làm: ${timeStr} (${schedule.shift_type})`,
            reason: schedule.title || 'Thay đổi lịch cá nhân',
            status: status,
            created_at: schedule.created_at || new Date().toISOString(),
            user: {
                id: user.id,
                full_name: user.full_name || 'No Name',
                email: user.email || '',
                avatar_url: user.avatar_url,
                department: user.department || 'Chưa cập nhật',
                role: user.role || 'Nhân viên'
            },
            payload: {
                work_date: schedule.work_date,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                schedule_id: schedule.id,
                shift_type: schedule.shift_type
            }
        })
    })

    // Map Overtime Requests
    overtimeReqs?.forEach((ot: any) => {
        const profileData = Array.isArray(ot.profiles) ? ot.profiles[0] : ot.profiles
        const user = profileData || { id: ot.user_id, full_name: 'Unknown', email: '', avatar_url: null, department: 'N/A', role: 'Employee' }

        const dateStr = new Date(ot.request_date).toLocaleDateString('vi-VN')

        activities.push({
            id: ot.id,
            type: 'overtime_request',
            title: `Tăng ca: ${dateStr}`,
            description: `Yêu cầu tăng ca ${ot.planned_hours}h`,
            reason: ot.reason || 'Tăng ca theo yêu cầu công việc',
            status: ot.status,
            created_at: ot.created_at,
            user: {
                id: user.id,
                full_name: user.full_name || 'No Name',
                email: user.email || '',
                avatar_url: user.avatar_url,
                department: user.department || 'Chưa cập nhật',
                role: user.role || 'Nhân viên'
            },
            payload: {
                request_date: ot.request_date,
                planned_hours: ot.planned_hours,
                actual_hours: ot.actual_hours
            }
        })
    })

    // Sort combined list by created_at desc
    const sorted = activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Paginate on the sorted merged list
    const totalCount = sorted.length
    const paginated = sorted.slice(from, to + 1)

    return {
        activities: paginated,
        totalCount
    }
}

// Approve Activity
export async function approveActivity(id: string, type: string): Promise<{ success: boolean, message?: string }> {
    // Server-side permission check
    const hasAccess = await checkPermission('approvals.approve')
    if (!hasAccess) return { success: false, message: 'Permission denied' }

    const supabase = await createClient()

    try {
        let userId = ''
        const notificationTitle = 'Yêu cầu được chấp thuận'
        let notificationBody = 'Yêu cầu của bạn đã được phê duyệt.'

        if (type === 'leave_request') {
            const { data: request } = await supabase.from('leave_requests').select('user_id, leave_date').eq('id', id).single()

            if (request) {
                const { error } = await supabase.from('leave_requests').update({ status: 'approved' }).eq('id', id)
                if (error) throw error

                userId = request.user_id
                const date = new Date(request.leave_date)
                const dateStr = date.toLocaleDateString('vi-VN')
                const dayName = getVietnameseDayName(date)

                notificationBody = `Đơn nghỉ phép ngày ${dayName} - ${dateStr} của bạn đã được duyệt.`

                // Send email notification (await to guarantee it sends before action returns in Vercel/NextJS)
                await sendLeaveEmail('approved', request.user_id, { ...request, id }, supabase).catch(err => {
                    console.error('[Approve] Failed to send email:', err)
                })

                // Audit Log
                await createAuditLog({
                    action: 'APPROVE',
                    resourceType: 'leave_request',
                    resourceId: id,
                    description: `Duyệt đơn nghỉ phép ngày ${dateStr}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'approved' }
                })
            }
        }
        else if (type === 'attendance_edit' || type === 'profile_update') {
            // 1. Fetch Request Details FIRST
            const { data: request } = await supabase.from('change_requests').select('*').eq('id', id).single()
            if (!request) throw new Error('Request not found')

            userId = request.user_id

            // 2. Handle Logic based on Type
            if (request.type === 'attendance_edit' && request.payload) {
                const { log_id, check_in_time, check_out_time, work_date } = request.payload

                // Update actual log if exists
                if (log_id) {
                    let checkInFull = null
                    let checkOutFull = null

                    // Simple logic for full datetime string construction
                    if (work_date) {
                        if (check_in_time) checkInFull = `${work_date}T${check_in_time}:00+07:00`
                        if (check_out_time) {
                            // Check for overnight shift (checkout < checkin) - Simplified
                            // In real scenarios, compare full datetimes or use explicit flags
                            // Here assuming same day unless explicitly handled differently in payload
                            checkOutFull = `${work_date}T${check_out_time}:00+07:00`
                        }
                    }

                    const updatePayload: any = { status: 'approved_correction' }
                    if (checkInFull) updatePayload.check_in_time = checkInFull
                    if (checkOutFull) updatePayload.check_out_time = checkOutFull

                    const { error: logError } = await supabase.from('attendance_logs').update(updatePayload).eq('id', log_id)
                    if (logError) throw logError
                }

                if (work_date) {
                    const dateStr = new Date(work_date).toLocaleDateString('vi-VN')
                    notificationBody = `Yêu cầu sửa công ngày ${dateStr} của bạn đã được duyệt.`
                }
            }

            // 3. Update Request Status
            const { error: updateError } = await supabase.from('change_requests').update({ status: 'approved' }).eq('id', id)
            if (updateError) throw updateError

            // Audit Log
            await createAuditLog({
                action: 'APPROVE',
                resourceType: 'attendance',
                resourceId: id,
                description: `Duyệt yêu cầu thay đổi ${request.type}`,
                oldValues: { status: 'pending' },
                newValues: { status: 'approved' }
            })
        }
        else if (type === 'schedule_change') {
            const { data: schedule } = await supabase.from('work_schedules').select('user_id, work_date').eq('id', id).single()

            if (schedule) {
                const { error } = await supabase.from('work_schedules').update({ status: 'active' }).eq('id', id)
                if (error) throw error

                userId = schedule.user_id
                const dateStr = new Date(schedule.work_date).toLocaleDateString('vi-VN')
                notificationBody = `Đề xuất đổi lịch làm việc ngày ${dateStr} đã được phê duyệt.`

                // Audit Log
                await createAuditLog({
                    action: 'APPROVE',
                    resourceType: 'schedule',
                    resourceId: id,
                    description: `Duyệt đổi lịch ngày ${dateStr}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'active' }
                })
            } else {
                throw new Error('Không tìm thấy yêu cầu hợp lệ')
            }
        }
        else if (type === 'overtime_request') {
            // 1. Fetch OT Request
            const { data: otRequest } = await supabase
                .from('overtime_requests')
                .select('user_id, request_date, planned_hours')
                .eq('id', id)
                .single()

            if (!otRequest) throw new Error('Không tìm thấy yêu cầu tăng ca')

            // 2. Get current admin user
            const { data: { user: adminUser } } = await supabase.auth.getUser()

            // 3. Update OT request status
            const { error: otError } = await supabase
                .from('overtime_requests')
                .update({
                    status: 'approved',
                    approved_by: adminUser?.id,
                    approved_at: new Date().toISOString()
                })
                .eq('id', id)
            if (otError) throw otError

            // 4. Upsert work_schedule override with allow_overtime = true
            const { error: schedError } = await supabase
                .from('work_schedules')
                .upsert({
                    user_id: otRequest.user_id,
                    work_date: otRequest.request_date,
                    shift_type: 'full_day',
                    allow_overtime: true,
                    status: 'active',
                    title: 'Tăng ca (Đã duyệt)',
                    start_time: '08:30',
                    end_time: '18:00'
                }, { onConflict: 'user_id, work_date' })
            if (schedError) {
                console.error('[OT Approve] Schedule upsert error:', schedError)
            }

            // 5. Retroactive recalculation — the KEY step!
            const { recalcOvertimeForUserDate } = await import('./overtime')
            await recalcOvertimeForUserDate(otRequest.user_id, otRequest.request_date)

            userId = otRequest.user_id
            const dateStr = new Date(otRequest.request_date).toLocaleDateString('vi-VN')
            notificationBody = `Yêu cầu tăng ca ngày ${dateStr} (${otRequest.planned_hours}h) đã được phê duyệt.`

            // Audit Log
            await createAuditLog({
                action: 'APPROVE',
                resourceType: 'overtime',
                resourceId: id,
                description: `Duyệt tăng ca ngày ${dateStr} - ${otRequest.planned_hours}h`,
                oldValues: { status: 'pending' },
                newValues: { status: 'approved' }
            })
        }

        if (userId) {
            const { sendNotification } = await import('@/app/actions/notification-system')
            const { data: { user: approver } } = await supabase.auth.getUser()

            // 1. Notify the employee
            await sendNotification({
                userId,
                title: notificationTitle,
                message: notificationBody,
                type: 'success',
                priority: 'high',
                link: '/admin/approvals'
            })

            // 2. Notify other managers in the hierarchy (excluding the approver)
            try {
                const managerIds = await getApproverIds(userId, approver?.id)
                if (managerIds.length > 0) {
                    // Get employee name
                    const { data: empProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', userId)
                        .single()
                    const empName = empProfile?.full_name || 'Nhân viên'

                    await sendNotification({
                        userIds: managerIds,
                        title: 'Yêu cầu đã được duyệt',
                        message: `Yêu cầu của ${empName} đã được phê duyệt.`,
                        type: 'info',
                        link: '/admin/approvals'
                    })
                }
            } catch (e) {
                console.error('[Approve] Manager notification error:', e)
            }
        }

        revalidatePath('/admin/approvals')
        return { success: true }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

// Reject Activity
export async function rejectActivity(id: string, type: string, note: string): Promise<{ success: boolean, message?: string }> {
    // Server-side permission check
    const hasAccess = await checkPermission('approvals.approve')
    if (!hasAccess) return { success: false, message: 'Permission denied' }

    const supabase = await createClient()

    try {
        let userId = ''
        const notificationTitle = 'Yêu cầu bị từ chối'
        let notificationBody = `Yêu cầu của bạn đã bị từ chối. Lý do: ${note}`

        if (type === 'leave_request') {
            const { data: request } = await supabase.from('leave_requests').select('user_id, leave_date').eq('id', id).single()

            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'rejected',
                    admin_note: note
                })
                .eq('id', id)
            if (error) throw error

            if (request) {
                userId = request.user_id
                const dateStr = new Date(request.leave_date).toLocaleDateString('vi-VN')
                notificationBody = `Đơn xin nghỉ phép ngày ${dateStr} của bạn đã bị từ chối. Lý do: ${note}`

                // Send email notification (await to guarantee it sends)
                await sendLeaveEmail('rejected', request.user_id, { ...request, id }, supabase, note).catch(err => {
                    console.error('[Reject] Failed to send email:', err)
                })

                // Audit Log
                await createAuditLog({
                    action: 'REJECT',
                    resourceType: 'leave_request',
                    resourceId: id,
                    description: `Từ chối nghỉ phép ngày ${dateStr}. Lý do: ${note}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'rejected', note }
                })
            }
        } else if (type === 'attendance_edit' || type === 'profile_update') {
            const { data: request } = await supabase.from('change_requests').select('user_id, payload').eq('id', id).single()

            const { error } = await supabase
                .from('change_requests')
                .update({ status: 'rejected', admin_note: note })
                .eq('id', id)
            if (error) throw error

            if (request) {
                userId = request.user_id
                if (type === 'attendance_edit' && request.payload?.work_date) {
                    const dateStr = new Date(request.payload.work_date).toLocaleDateString('vi-VN')
                    notificationBody = `Yêu cầu sửa công ngày ${dateStr} của bạn đã bị từ chối. Lý do: ${note}`
                }

                // Audit Log
                await createAuditLog({
                    action: 'REJECT',
                    resourceType: 'attendance',
                    resourceId: id,
                    description: `Từ chối yêu cầu ${type}. Lý do: ${note}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'rejected', note }
                })
            }
        } else if (type === 'schedule_change') {
            const { data: schedule } = await supabase.from('work_schedules').select('user_id, work_date').eq('id', id).single()

            if (schedule) {
                const { error } = await supabase.from('work_schedules').update({ status: 'rejected' }).eq('id', id)
                if (error) throw error

                userId = schedule.user_id
                const dateStr = new Date(schedule.work_date).toLocaleDateString('vi-VN')
                notificationBody = `Đề xuất đổi lịch làm việc ngày ${dateStr} đã bị từ chối. Lý do: ${note}`

                // Audit Log
                await createAuditLog({
                    action: 'REJECT',
                    resourceType: 'schedule',
                    resourceId: id,
                    description: `Từ chối đổi lịch ngày ${dateStr}. Lý do: ${note}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'rejected', note }
                })
            }
        } else if (type === 'overtime_request') {
            const { data: otRequest } = await supabase
                .from('overtime_requests')
                .select('user_id, request_date')
                .eq('id', id)
                .single()

            const { error: otError } = await supabase
                .from('overtime_requests')
                .update({ status: 'rejected', admin_note: note })
                .eq('id', id)
            if (otError) throw otError

            if (otRequest) {
                // Remove allow_overtime flag if it was set
                await supabase
                    .from('work_schedules')
                    .update({ allow_overtime: false })
                    .eq('user_id', otRequest.user_id)
                    .eq('work_date', otRequest.request_date)

                // Retroactive recalculation — reset OT to 0
                const { recalcOvertimeForUserDate } = await import('./overtime')
                await recalcOvertimeForUserDate(otRequest.user_id, otRequest.request_date)

                userId = otRequest.user_id
                const dateStr = new Date(otRequest.request_date).toLocaleDateString('vi-VN')
                notificationBody = `Yêu cầu tăng ca ngày ${dateStr} đã bị từ chối. Lý do: ${note}`

                // Audit Log
                await createAuditLog({
                    action: 'REJECT',
                    resourceType: 'overtime',
                    resourceId: id,
                    description: `Từ chối tăng ca ngày ${dateStr}. Lý do: ${note}`,
                    oldValues: { status: 'pending' },
                    newValues: { status: 'rejected', note }
                })
            }
        }

        if (userId) {
            const { sendNotification } = await import('@/app/actions/notification-system')
            const { data: { user: rejecter } } = await supabase.auth.getUser()

            // 1. Notify the employee
            await sendNotification({
                userId,
                title: notificationTitle,
                message: notificationBody,
                type: 'error',
                priority: 'high',
                link: '/admin/approvals'
            })

            // 2. Notify other managers in the hierarchy (excluding the rejecter)
            try {
                const managerIds = await getApproverIds(userId, rejecter?.id)
                if (managerIds.length > 0) {
                    const { data: empProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', userId)
                        .single()
                    const empName = empProfile?.full_name || 'Nhân viên'

                    await sendNotification({
                        userIds: managerIds,
                        title: 'Yêu cầu bị từ chối',
                        message: `Yêu cầu của ${empName} đã bị từ chối. Lý do: ${note}`,
                        type: 'warning',
                        link: '/admin/approvals'
                    })
                }
            } catch (e) {
                console.error('[Reject] Manager notification error:', e)
            }
        }

        revalidatePath('/admin/approvals')
        return { success: true }

    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

function getVietnameseDayName(date: Date) {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
    return days[date.getDay()]
}

/**
 * Helper: Send leave approval/rejection email
 */
async function sendLeaveEmail(
    status: 'approved' | 'rejected',
    employeeUserId: string,
    leaveData: any,
    supabase: any,
    rejectionReason?: string
) {
    try {
        // Get full leave request data
        const { data: fullRequest } = await supabase
            .from('leave_requests')
            .select('leave_type, duration_hours, start_time, end_time')
            .eq('id', leaveData.id || '')
            .single()

        // Get employee info
        const { data: employee } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', employeeUserId)
            .single()

        if (!employee?.email) return

        // Get approver info
        const { data: { user: approver } } = await supabase.auth.getUser()
        let approverName = 'Quản lý'
        if (approver) {
            const { data: approverProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', approver.id)
                .single()
            approverName = approverProfile?.full_name || 'Quản lý'
        }

        const leaveType = fullRequest?.leave_type || 'full_day'
        const leaveTypeMap: Record<string, string> = {
            'full_day': 'Nghỉ cả ngày',
            'half_day_morning': 'Nghỉ buổi sáng',
            'half_day_afternoon': 'Nghỉ buổi chiều',
            'partial': 'Nghỉ theo giờ',
        }

        // Determine start/end time
        let startTime = '08:00'
        let endTime = '17:00'
        if (leaveType === 'partial' && fullRequest?.start_time && fullRequest?.end_time) {
            startTime = fullRequest.start_time
            endTime = fullRequest.end_time
        } else if (leaveType === 'half_day_morning') {
            startTime = '08:00'
            endTime = '12:00'
        } else if (leaveType === 'half_day_afternoon') {
            startTime = '13:00'
            endTime = '17:00'
        }

        const leaveDate = new Date(leaveData.leave_date)
        const formattedDate = leaveDate.toLocaleDateString('vi-VN')

        // Calculate total days
        const durationHours = fullRequest?.duration_hours || 8
        const totalDays = durationHours >= 8
            ? Math.round(durationHours / 8 * 10) / 10
            : (durationHours / 8).toFixed(1)

        const templateSlug = status === 'approved' ? 'leave-approved' : 'leave-rejected'

        EmailService.sendAsync(templateSlug, employee.email, {
            user_name: employee.full_name,
            approver_name: approverName,
            leave_dates: formattedDate,
            leave_type: leaveTypeMap[leaveType] || leaveType,
            start_date: `${formattedDate} ${startTime}`,
            end_date: `${formattedDate} ${endTime}`,
            total_days: String(totalDays),
            rejection_reason: rejectionReason || '',
        })
    } catch (err) {
        console.error('[sendLeaveEmail] Error:', err)
    }
}

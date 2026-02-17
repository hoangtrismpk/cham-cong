'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, parseISO, format } from 'date-fns'

export interface ActivityItem {
    id: string
    type: 'leave_request' | 'attendance_edit' | 'profile_update' | 'schedule_change' | 'other'
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

    return {
        leaves: leaveCount || 0,
        changes: changeCount || 0,
        schedules: scheduleCount || 0,
        total: (leaveCount || 0) + (changeCount || 0) + (scheduleCount || 0)
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


    if (statusFilter === 'pending') {
        leaveQuery = leaveQuery.eq('status', 'pending')
        changeQuery = changeQuery.eq('status', 'pending')
        scheduleQuery = scheduleQuery.eq('status', 'pending')
    } else {
        // History includes approved and rejected
        leaveQuery = leaveQuery.in('status', ['approved', 'rejected'])
        changeQuery = changeQuery.in('status', ['approved', 'rejected'])
        // For schedules, only show rejected in history to avoid flooding with all active shifts
        scheduleQuery = scheduleQuery.eq('status', 'rejected')
    }

    // Execute queries
    const [
        { data: leaves, error: leaveError },
        { data: changes, error: changeError },
        { data: schedules, error: scheduleError }
    ] = await Promise.all([
        leaveQuery,
        changeQuery,
        scheduleQuery
    ])

    if (leaveError) console.error('Leave Error:', leaveError)
    if (changeError) console.error('Change Error:', changeError)
    if (scheduleError) console.error('Schedule Error:', scheduleError)

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
                const dateStr = new Date(request.leave_date).toLocaleDateString('vi-VN')
                notificationBody = `Đơn xin nghỉ phép ngày ${dateStr} của bạn đã được duyệt.`
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
        }
        else if (type === 'schedule_change') {
            const { data: schedule } = await supabase.from('work_schedules').select('user_id, work_date').eq('id', id).single()

            if (schedule) {
                const { error } = await supabase.from('work_schedules').update({ status: 'active' }).eq('id', id)
                if (error) throw error

                userId = schedule.user_id
                const dateStr = new Date(schedule.work_date).toLocaleDateString('vi-VN')
                notificationBody = `Đề xuất đổi lịch làm việc ngày ${dateStr} đã được phê duyệt.`
            } else {
                throw new Error('Không tìm thấy yêu cầu hợp lệ')
            }
        }

        if (userId) {
            const { sendNotification } = await import('@/app/actions/notification-system')
            await sendNotification({
                userId,
                title: notificationTitle,
                message: notificationBody,
                type: 'success',
                priority: 'high'
            })
        }

        revalidatePath('/admin/approvals')
        return { success: true }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

// Reject Activity
export async function rejectActivity(id: string, type: string, note: string): Promise<{ success: boolean, message?: string }> {
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
            }
        } else if (type === 'schedule_change') {
            const { data: schedule } = await supabase.from('work_schedules').select('user_id, work_date').eq('id', id).single()

            if (schedule) {
                const { error } = await supabase.from('work_schedules').update({ status: 'rejected' }).eq('id', id)
                if (error) throw error

                userId = schedule.user_id
                const dateStr = new Date(schedule.work_date).toLocaleDateString('vi-VN')
                notificationBody = `Đề xuất đổi lịch làm việc ngày ${dateStr} đã bị từ chối. Lý do: ${note}`
            }
        }

        if (userId) {
            const { sendNotification } = await import('@/app/actions/notification-system')
            await sendNotification({
                userId,
                title: notificationTitle,
                message: notificationBody,
                type: 'error',
                priority: 'high'
            })
        }

        revalidatePath('/admin/approvals')
        return { success: true }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

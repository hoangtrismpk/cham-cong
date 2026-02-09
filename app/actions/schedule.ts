'use server'

import { createClient } from '@/utils/supabase/server'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getMonthlyShifts(dateStr: string) { // YYYY-MM
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const viewDate = new Date(dateStr + '-01') // Ensure parsing as 1st of month

    // Calculate range for calendar view (week start to week end)
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    // 1. Fetch Work Schedules (Specific overrides)
    const { data: shifts, error: shiftsError } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', format(calendarStart, 'yyyy-MM-dd'))
        .lte('work_date', format(calendarEnd, 'yyyy-MM-dd'))

    if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError)
    }

    // 2. Fetch Leave Requests (Pending & Approved)
    const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .gte('leave_date', format(calendarStart, 'yyyy-MM-dd'))
        .lte('leave_date', format(calendarEnd, 'yyyy-MM-dd'))
        .in('status', ['pending', 'approved'])

    if (leavesError) {
        console.error('Error fetching leaves:', leavesError)
    }

    // 3. Fetch Default Schedule Templates
    const { data: templates, error: templatesError } = await supabase
        .from('employee_default_schedules')
        .select('*')
        .eq('employee_id', user.id)
        .eq('is_template', true)

    if (templatesError) {
        console.error('Error fetching templates:', templatesError)
    }

    // Transform array to Record<string, any> map
    const shiftsMap: Record<string, any> = {}

    // A. Populate Priority 1: Work Schedules (Specific days)
    shifts?.forEach((shift) => {
        shiftsMap[shift.work_date] = {
            ...shift,
            type: shift.shift_type,
            time: `${shift.start_time} - ${shift.end_time}`,
            source: 'schedule'
        }
    })

    // B. Populate Priority 2: Leaves (Override schedules)
    leaves?.forEach((leave) => {
        const isPending = leave.status === 'pending'
        const title = isPending ? 'Xin nghỉ (Chờ duyệt)' : 'Nghỉ phép (Đã duyệt)'

        shiftsMap[leave.leave_date] = {
            id: leave.id,
            work_date: leave.leave_date,
            type: 'leave',
            title: title,
            time: leave.start_time && leave.end_time ? `${leave.start_time} - ${leave.end_time}` : 'Full Day',
            location: 'Remote/Home',
            status: leave.status,
            members_count: 0,
            is_leave: true,
            source: 'leave'
        }
    })

    // C. Populate Priority 3: Default Templates (Fill gaps)
    if (templates && templates.length > 0) {
        const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

        allDays.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd')

            // Skip if already has shift or leave
            if (shiftsMap[dateKey]) return

            // Find template for this day of week (0=Sun, 1=Mon...)
            const dayOfWeek = day.getDay()
            const template = templates.find(t => t.day_of_week === dayOfWeek)

            if (template && template.shift_type !== 'off') {
                // Determine Title
                let title = 'Ca Làm Việc'
                if (template.shift_type === 'full') title = 'Cả Ngày'
                if (template.shift_type === 'custom') title = 'Tùy Chỉnh'

                // Assign Virtual Shift
                shiftsMap[dateKey] = {
                    id: `template-${dateKey}`, // Virtual ID
                    work_date: dateKey,
                    type: template.shift_type,
                    title: title,
                    start_time: template.custom_start_time || '08:30',
                    end_time: template.custom_end_time || '17:30',
                    time: `${template.custom_start_time || '08:30'} - ${template.custom_end_time || '17:30'}`,
                    status: 'active', // Template is considered active by default until changed
                    location: 'Văn phòng',
                    members_count: 0,
                    source: 'template'
                }
            }
        })
    }

    return shiftsMap
}

export async function saveShift(shiftData: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { work_date, shift_type, start_time, end_time, location, title, members_count } = shiftData

    // Always force 'pending' status for user-initiated changes/creates
    // Admin approval workflow required
    const status = 'pending';

    // Upsert based on (user_id, work_date)
    const { data, error } = await supabase
        .from('work_schedules')
        .upsert({
            user_id: user.id,
            work_date,
            shift_type,
            start_time,
            end_time,
            location,
            title,
            status,
            members_count
        }, { onConflict: 'user_id, work_date' })
        .select()
        .single()

    if (error) {
        console.error('Error saving shift:', error)
        return { error: error.message }
    }

    // Notification for Admins
    const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'manager', 'hr_manager'])

    if (adminProfiles && adminProfiles.length > 0) {
        // Use dynamic import for notification to avoid potential circular dependencies
        const { createNotification } = await import('@/app/actions/notification')
        const dateStr = new Date(work_date).toLocaleDateString('vi-VN')
        const requesterName = user.user_metadata?.full_name || user.email || 'Nhân viên'
        const message = `${requesterName} đã yêu cầu đổi lịch làm việc ngày ${dateStr}.`

        await Promise.all(adminProfiles.map(admin =>
            createNotification(admin.id, 'Yêu cầu đổi lịch mới', message, 'info')
        ))
    }

    revalidatePath('/schedule')
    return { data }
}

export async function getTodayShift() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const todayDate = format(new Date(), 'yyyy-MM-dd')
    const dayOfWeek = new Date().getDay()

    // 1. Try to find specific override
    const { data: specificShift, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', todayDate)
        .single()

    if (!error && specificShift) {
        return specificShift
    }

    // 2. If no specific shift, check template
    const { data: template } = await supabase
        .from('employee_default_schedules')
        .select('*')
        .eq('employee_id', user.id)
        .eq('is_template', true)
        .eq('day_of_week', dayOfWeek)
        .single()

    if (template && template.shift_type !== 'off') {
        // Return structured as a shift
        let title = 'Ca Làm Việc'
        if (template.shift_type === 'full') title = 'Cả Ngày'

        return {
            id: `template-${todayDate}`,
            work_date: todayDate,
            shift_type: template.shift_type,
            title: title,
            start_time: template.custom_start_time || '08:30',
            end_time: template.custom_end_time || '17:30',
            location: 'Văn phòng',
            status: 'active'
        }
    }

    return null
}

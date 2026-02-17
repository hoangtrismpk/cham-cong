'use server'

import { createClient } from '@/utils/supabase/server'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { getWorkSettings } from './settings'

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

    // Transform array to Record<string, any[]> map
    const shiftsMap: Record<string, any[]> = {}

    // A. Populate Priority 3: Default Templates (Base Layer)
    if (templates && templates.length > 0) {
        const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
        const workSettings = await getWorkSettings()

        allDays.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            // Skip if day already has data? No, templates are base.

            // Find template for this day of week (0=Sun, 1=Mon...)
            const dayOfWeek = day.getDay()
            const template = templates.find(t => t.day_of_week === dayOfWeek)

            if (template && template.shift_type !== 'off') {
                // Determine Title
                let title = 'Ca Làm Việc'
                if (template.shift_type === 'full') title = 'Cả Ngày'
                if (template.shift_type === 'custom') title = 'Tùy Chỉnh'

                const startTime = template.custom_start_time || workSettings.work_start_time
                const endTime = template.custom_end_time || workSettings.work_end_time

                shiftsMap[dateKey] = [{
                    id: `template-${dateKey}`, // Virtual ID
                    work_date: dateKey,
                    type: template.shift_type, // 'full', 'morning', 'afternoon'
                    title: title,
                    start_time: startTime,
                    end_time: endTime,
                    time: `${startTime} - ${endTime}`,
                    status: 'active',
                    location: 'Văn phòng',
                    members_count: 0,
                    source: 'template'
                }]
            }
        })
    }

    // B. Populate Priority 1: Work Schedules (Overrides - Replace Template)
    shifts?.forEach((shift) => {
        const scheduleShift = {
            ...shift,
            type: shift.shift_type, // 'full_day', 'morning', etc.. NOTE: DB might store 'full_day' vs template 'full'
            time: `${shift.start_time} - ${shift.end_time}`,
            source: 'schedule',
            title: shift.title || (shift.shift_type === 'full_day' ? 'Cả Ngày' : 'Tùy Chỉnh'),
            members: shift.members_count
        }

        // Overrides replace the Template for that day
        shiftsMap[shift.work_date] = [scheduleShift]
    })

    // C. Populate Priority 2: Leaves (Append)
    leaves?.forEach((leave) => {
        const isPending = leave.status === 'pending'
        const title = isPending ? 'Nghỉ (Chờ duyệt)' : 'Nghỉ (Đã duyệt)'

        const leaveShift = {
            id: leave.id,
            work_date: leave.leave_date,
            type: 'leave',
            title: title,
            time: leave.start_time && leave.end_time ? `${leave.start_time} - ${leave.end_time}` : 'Full Day',
            start_time: leave.start_time,
            end_time: leave.end_time,
            location: 'Remote/Home',
            status: leave.status,
            members_count: 0,
            is_leave: true,
            source: 'leave'
        }

        if (!shiftsMap[leave.leave_date]) {
            shiftsMap[leave.leave_date] = []
        }
        shiftsMap[leave.leave_date].push(leaveShift)
    })

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
        const { sendNotification } = await import('@/app/actions/notification-system')
        const dateStr = new Date(work_date).toLocaleDateString('vi-VN')
        const requesterName = user.user_metadata?.full_name || user.email || 'Nhân viên'
        const message = `${requesterName} đã yêu cầu đổi lịch làm việc ngày ${dateStr}.`

        await sendNotification({
            userIds: adminProfiles.map(a => a.id),
            title: 'Yêu cầu đổi lịch mới',
            message: message,
            type: 'info'
        })
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

        const workSettings = await getWorkSettings()
        const startTime = template.custom_start_time || workSettings.work_start_time
        const endTime = template.custom_end_time || workSettings.work_end_time

        return {
            id: `template-${todayDate}`,
            work_date: todayDate,
            shift_type: template.shift_type,
            title: title,
            start_time: startTime,
            end_time: endTime,
            location: 'Văn phòng',
            status: 'active'
        }
    }

    return null
}

export async function getEmployeeNextShift(employeeId: string) {
    const supabase = await createClient()

    const todayDate = format(new Date(), 'yyyy-MM-dd')

    // 1. Try to find specific override for today onwards
    const { data: specificShift, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', employeeId)
        .gte('work_date', todayDate)
        .order('work_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (!error && specificShift) {
        return specificShift
    }

    // 2. Fallback to template for tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = format(tomorrow, 'yyyy-MM-dd')
    const dayOfWeek = tomorrow.getDay()

    const { data: template } = await supabase
        .from('employee_default_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_template', true)
        .eq('day_of_week', dayOfWeek)
        .single()

    if (template && template.shift_type !== 'off') {
        const workSettings = await getWorkSettings()
        const startTime = template.custom_start_time || workSettings.work_start_time
        const endTime = template.custom_end_time || workSettings.work_end_time

        return {
            id: `template-${tomorrowDate}`,
            work_date: tomorrowDate,
            shift_type: template.shift_type,
            title: template.shift_type === 'full' ? 'Cả Ngày' : 'Ca Làm Việc',
            start_time: startTime,
            end_time: endTime,
            location: 'Văn phòng',
            status: 'active'
        }
    }

    return null
}

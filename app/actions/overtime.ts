'use server'

import { createClient } from '@/utils/supabase/server'
import { getWorkSettings } from './settings'
import { format } from 'date-fns'

/**
 * Parse time string "HH:mm" or "HH:mm:ss" into [hours, minutes]
 */
function parseTime(timeStr: string): [number, number] {
    const parts = timeStr.split(':').map(Number)
    return [parts[0], parts[1] || 0]
}

/**
 * Get the effective schedule for a user on a specific date.
 * Priority: work_schedules (override) > employee_default_schedules (template) > system_settings (default)
 */
export async function getEffectiveSchedule(userId: string, workDate: string) {
    const supabase = await createClient()
    const settings = await getWorkSettings()

    // 1. Check for specific override (work_schedules)
    const { data: override } = await supabase
        .from('work_schedules')
        .select('start_time, end_time, shift_type, allow_overtime, status')
        .eq('user_id', userId)
        .eq('work_date', workDate)
        .eq('status', 'active')
        .maybeSingle()

    if (override) {
        return {
            startTime: override.start_time || settings.work_start_time,
            endTime: override.end_time || settings.work_end_time,
            shiftType: override.shift_type,
            allowOvertime: override.allow_overtime ?? false,
            source: 'schedule' as const
        }
    }

    // 2. Check for default template (employee_default_schedules)
    const dayOfWeek = new Date(workDate).getDay()
    const { data: template } = await supabase
        .from('employee_default_schedules')
        .select('custom_start_time, custom_end_time, shift_type, allow_overtime')
        .eq('employee_id', userId)
        .eq('is_template', true)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

    if (template && template.shift_type !== 'off') {
        let defaultEndTime = settings.work_end_time
        if (template.shift_type === 'morning') defaultEndTime = settings.lunch_start_time

        return {
            startTime: template.custom_start_time || settings.work_start_time,
            endTime: template.custom_end_time || defaultEndTime,
            shiftType: template.shift_type,
            allowOvertime: template.allow_overtime ?? false,
            source: 'template' as const
        }
    }

    // 3. Fall back to system defaults
    return {
        startTime: settings.work_start_time,
        endTime: settings.work_end_time,
        shiftType: 'full',
        allowOvertime: false,
        source: 'default' as const
    }
}

/**
 * Check if user has an approved overtime request for a specific date
 */
export async function hasApprovedOvertimeRequest(userId: string, workDate: string): Promise<boolean> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('overtime_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('request_date', workDate)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle()

    return !!data
}

/**
 * Core function: Recalculate overtime_hours for a specific attendance log.
 * 
 * This is the SINGLE SOURCE OF TRUTH for overtime calculation.
 * Called from:
 *   1. checkOut() in attendance.ts - when user clocks out
 *   2. approveActivity() in approvals.ts - when admin approves OT request
 *   3. rejectActivity() in approvals.ts - when admin rejects OT (resets to 0)
 * 
 * Logic:
 *   - If schedule allows OT OR has approved OT request → calculate full OT
 *   - Otherwise → cap checkout at scheduled end time, OT = 0
 */
export async function recalcOvertimeForLog(logId: string) {
    const supabase = await createClient()

    // 1. Fetch the attendance log
    const { data: log, error: logError } = await supabase
        .from('attendance_logs')
        .select('id, user_id, work_date, check_in_time, check_out_time')
        .eq('id', logId)
        .single()

    if (logError || !log || !log.check_in_time || !log.check_out_time) {
        console.log('[recalcOT] No valid log found:', logId)
        return { overtime_hours: 0 }
    }

    // 2. Get effective schedule for this day
    const schedule = await getEffectiveSchedule(log.user_id, log.work_date)

    // 3. Check if OT is permitted (schedule flag OR approved request)
    const otApproved = await hasApprovedOvertimeRequest(log.user_id, log.work_date)
    const allowOT = schedule.allowOvertime || otApproved

    // 4. Get work settings for time boundaries
    const settings = await getWorkSettings()

    // 5. Calculate
    const inTime = new Date(log.check_in_time)
    const outTime = new Date(log.check_out_time)

    const inMs = inTime.getTime()
    let outMs = outTime.getTime()

    // Helper: convert VN time to UTC timestamp based on log date
    const getUTCTime = (date: Date, h: number, m: number) => {
        const d = new Date(date)
        let utcH = h - 7 // VN is UTC+7
        if (utcH < 0) utcH += 24
        d.setUTCHours(utcH, m, 0, 0)
        return d.getTime()
    }

    const scheduledEndMs = getUTCTime(inTime, ...parseTime(schedule.endTime))

    // 4.5. Hard Cap: Overtime cannot bleed into the NEXT day's scheduled shift
    // to prevent double-counting.
    try {
        const nextDay = new Date(log.work_date)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]
        const nextSchedule = await getEffectiveSchedule(log.user_id, nextDayStr)

        if (nextSchedule && nextSchedule.shiftType !== 'off') {
            const nextShiftStartMs = getUTCTime(nextDay, ...parseTime(nextSchedule.startTime))
            if (outMs > nextShiftStartMs) {
                console.log(`[recalcOT] Clipping checkout from ${new Date(outMs).toISOString()} to next shift start ${new Date(nextShiftStartMs).toISOString()}`)
                outMs = nextShiftStartMs
            }
        }
    } catch (e) {
        console.error('[recalcOT] Error checking next day schedule:', e)
    }

    // If OT NOT allowed, cap checkout at scheduled end time
    if (!allowOT && outMs > scheduledEndMs) {
        outMs = scheduledEndMs
    }

    // Calculate standard hours
    const morningStart = getUTCTime(inTime, ...parseTime(settings.work_start_time))
    const morningEnd = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
    const afternoonStart = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
    const afternoonEnd = getUTCTime(inTime, ...parseTime(settings.work_end_time))

    const mWorkStart = Math.max(inMs, morningStart)
    const mWorkEnd = Math.min(outMs, morningEnd)
    const mMinutes = Math.max(0, (mWorkEnd - mWorkStart) / (1000 * 60))

    const aWorkStart = Math.max(inMs, afternoonStart)
    const aWorkEnd = Math.min(outMs, afternoonEnd)
    const aMinutes = Math.max(0, (aWorkEnd - aWorkStart) / (1000 * 60))

    const standardMinutes = mMinutes + aMinutes

    // Calculate actual work minutes (total duration minus lunch)
    const totalDurationMinutes = (outMs - inMs) / (1000 * 60)
    let actualWorkMinutes = totalDurationMinutes

    const lunchStart = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
    const lunchEnd = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
    const lunchOverlapStart = Math.max(inMs, lunchStart)
    const lunchOverlapEnd = Math.min(outMs, lunchEnd)
    const lunchOverlapMinutes = Math.max(0, (lunchOverlapEnd - lunchOverlapStart) / (1000 * 60))
    actualWorkMinutes -= lunchOverlapMinutes

    // OT = actual work beyond standard (only if allowed)
    let overtimeHours = 0
    if (allowOT) {
        overtimeHours = Math.max(0, actualWorkMinutes - standardMinutes) / 60
    }

    const roundedOT = Math.round(overtimeHours * 100) / 100

    // 6. Write back to attendance_logs
    const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({ overtime_hours: roundedOT })
        .eq('id', log.id)

    if (updateError) {
        console.error('[recalcOT] Update error:', updateError)
    }

    console.log(`[recalcOT] Log ${logId}: allowOT=${allowOT}, OT=${roundedOT}h`)
    return { overtime_hours: roundedOT }
}

/**
 * Batch recalculate overtime for all logs of a user on a specific date.
 * Called when an OT request is approved/rejected (retroactive).
 */
export async function recalcOvertimeForUserDate(userId: string, workDate: string) {
    const supabase = await createClient()

    const { data: logs } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('work_date', workDate)

    if (!logs || logs.length === 0) return

    // Recalculate each log
    for (const log of logs) {
        await recalcOvertimeForLog(log.id)
    }

    console.log(`[recalcOT] Batch recalculated ${logs.length} logs for user ${userId} on ${workDate}`)
}

/**
 * User creates an overtime request for a specific date.
 */
export async function createOvertimeRequest(data: {
    requestDate: string   // YYYY-MM-DD
    plannedHours: number  // e.g. 2
    reason?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Chưa đăng nhập' }

    // Check if request already exists for this date
    const { data: existing } = await supabase
        .from('overtime_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('request_date', data.requestDate)
        .in('status', ['pending', 'approved'])
        .maybeSingle()

    if (existing) {
        return { error: `Bạn đã có yêu cầu tăng ca cho ngày này (${existing.status === 'approved' ? 'đã duyệt' : 'đang chờ'})` }
    }

    const { data: inserted, error } = await supabase
        .from('overtime_requests')
        .insert({
            user_id: user.id,
            request_date: data.requestDate,
            planned_hours: data.plannedHours,
            reason: data.reason || 'Tăng ca theo yêu cầu công việc',
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('[createOTRequest] Error:', error)
        return { error: error.message }
    }

    // Notify admins
    try {
        const { data: adminProfiles } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'hr_manager', 'manager'])

        if (adminProfiles && adminProfiles.length > 0) {
            const { sendNotification } = await import('@/app/actions/notification-system')
            const userName = user.user_metadata?.full_name || user.email || 'Nhân viên'
            const dateStr = new Date(data.requestDate).toLocaleDateString('vi-VN')

            await sendNotification({
                userIds: adminProfiles.map(a => a.id),
                title: 'Yêu cầu tăng ca mới',
                message: `${userName} yêu cầu tăng ca ${data.plannedHours}h ngày ${dateStr}.`,
                type: 'info'
            })
        }
    } catch (notifError) {
        console.error('[createOTRequest] Notification error:', notifError)
    }

    return { data: inserted }
}

/**
 * Get overtime requests for the current user
 */
export async function getUserOvertimeRequests(month?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('overtime_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('request_date', { ascending: false })

    if (month) {
        // month format: YYYY-MM
        const startDate = `${month}-01`
        const [year, mon] = month.split('-').map(Number)
        const endDate = `${year}-${String(mon).padStart(2, '0')}-${new Date(year, mon, 0).getDate()}`
        query = query.gte('request_date', startDate).lte('request_date', endDate)
    }

    const { data, error } = await query.limit(50)
    if (error) {
        console.error('[getUserOTRequests] Error:', error)
        return []
    }
    return data || []
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { OFFICE_COORDINATES, MAX_DISTANCE_METERS, calculateDistance, OFFICE_IPS } from '@/utils/geo'
import { format } from 'date-fns'
import { headers } from 'next/headers'

export async function checkIn(latitude?: number, longitude?: number, notes?: string) {
    const supabase = await createClient()
    const headerList = await headers()

    // Lấy IP người dùng (Xử lý qua Proxy/Ngrok/Load Balancer)
    const forwardedFor = headerList.get('x-forwarded-for')
    const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.' }
    }

    // --- KIỂM TRA VỊ TRÍ (GPS hoặc IP) ---
    let isLocationValid = false
    let verificationMethod = 'none'

    // 1. Kiểm tra IP Văn phòng
    if (userIp !== 'unknown' && OFFICE_IPS.includes(userIp)) {
        isLocationValid = true
        verificationMethod = 'office_wifi'
        console.log(`[checkIn] Verified by Office IP: ${userIp}`)
    }

    // 2. Nếu IP không khớp, kiểm tra GPS
    if (!isLocationValid && latitude !== undefined && longitude !== undefined) {
        const distance = calculateDistance(
            latitude,
            longitude,
            OFFICE_COORDINATES.latitude,
            OFFICE_COORDINATES.longitude
        )

        if (distance <= MAX_DISTANCE_METERS) {
            isLocationValid = true
            verificationMethod = 'gps'
        } else {
            return {
                error: `Bạn đang ở quá xa văn phòng (${Math.round(distance)}m). IP của bạn: ${userIp}`,
            }
        }
    }

    if (!isLocationValid) {
        return {
            error: `Không thể xác minh vị trí. Vui lòng bật GPS hoặc kết nối Wifi công ty. (IP của bạn: ${userIp})`
        }
    }

    // Helper to get date in Vietnam time (UTC+7)
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const today = getVNNow().toISOString().split('T')[0]

    // Get the LATEST attendance log for today
    const { data: latestLog } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .in('status', ['present', 'late']) // Only attendance logs
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // If there is a log and it has NO check_out_time, it means user is currently checked in
    if (latestLog && latestLog.check_in_time && !latestLog.check_out_time) {
        console.log('[checkIn] Blocked! Found active session:', latestLog)
        return { error: 'Bạn đang trong ca làm việc. Vui lòng Chấm ra trước khi Chấm vào mới.' }
    }

    // Insert check-in record
    // ... (rest of insert logic)
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()

    if (!profile) {
        console.log('Profile missing for user, attempting to create one...')
        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            full_name: user.user_metadata?.full_name || 'User',
            department: user.user_metadata?.department || '',
            role: 'employee'
        })
        if (profileError) {
            console.error('Failed to auto-create profile:', profileError)
            return { error: 'System Error: User profile missing and could not be created.' }
        }
    }

    // --- LATE DETECTION LOGIC ---
    let status = 'present'
    let lateMinutes = 0

    // 1. Get Today's Schedule
    const { data: schedule } = await supabase
        .from('work_schedules')
        .select('start_time')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .maybeSingle()

    const startTimeStr = schedule?.start_time || '08:30' // Default start time

    // 2. Get Current Time in VN (HH:mm)
    const nowVN = new Date()
    const nowHHMM = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(nowVN)

    // 3. Compare & Calculate
    // Ensure accurate string comparison (e.g. "08:35" > "08:30")
    // Also support "08:30:00" format from DB
    const targetTime = startTimeStr.substring(0, 5)

    if (nowHHMM > targetTime) {
        status = 'late'
        const [hNow, mNow] = nowHHMM.split(':').map(Number)
        const [hTarget, mTarget] = targetTime.split(':').map(Number)

        lateMinutes = (hNow * 60 + mNow) - (hTarget * 60 + mTarget)
        console.log(`[checkIn] User Late: ${lateMinutes} minutes (${nowHHMM} vs ${targetTime})`)
    }

    const { error } = await supabase.from('attendance_logs').insert({
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        check_in_location: latitude !== undefined && longitude !== undefined ? `(${latitude},${longitude})` : null,
        check_in_note: notes || (verificationMethod === 'office_wifi' ? 'Verified by Office Wifi' : ''),
        work_date: today,
        status: status,
        late_minutes: lateMinutes,
    })

    if (error) {
        console.error('Check-in error DETAILS:', JSON.stringify(error, null, 2))
        return { error: 'Lỗi hệ thống khi chấm vào: ' + error.message }
    }

    revalidatePath('/')
    return { success: true }
}

export async function checkOut(latitude?: number, longitude?: number, notes?: string) {
    const supabase = await createClient()
    const headerList = await headers()

    // Lấy IP người dùng
    const forwardedFor = headerList.get('x-forwarded-for')
    const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.' }

    // --- KIỂM TRA VỊ TRÍ ---
    let isLocationValid = false
    let verificationMethod = 'none'

    if (userIp !== 'unknown' && OFFICE_IPS.includes(userIp)) {
        isLocationValid = true
        verificationMethod = 'office_wifi'
    }

    if (!isLocationValid && latitude !== undefined && longitude !== undefined) {
        const distance = calculateDistance(
            latitude,
            longitude,
            OFFICE_COORDINATES.latitude,
            OFFICE_COORDINATES.longitude
        )

        if (distance <= MAX_DISTANCE_METERS) {
            isLocationValid = true
            verificationMethod = 'gps'
        } else {
            return {
                error: `Bạn đang ở quá xa văn phòng (${Math.round(distance)}m). IP của bạn: ${userIp}`,
            }
        }
    }

    if (!isLocationValid) {
        return {
            error: `Không thể xác minh vị trí. IP của bạn: ${userIp}`
        }
    }

    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const today = getVNNow().toISOString().split('T')[0]

    // --- TÌM PHIÊN CHẤM CÔNG CHƯA ĐÓNG ---
    // Tìm phiên mới nhất chưa đóng trong vòng 24h qua
    const { data: log, error: fetchError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['present', 'late'])
        .is('check_out_time', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (fetchError || !log) {
        console.error('[checkOut] No active session found for user:', user.id, 'IP:', userIp)
        return { error: 'Không tìm thấy phiên chấm công đang mở nào. Vui lòng chấm công trước.' }
    }

    const { data, error, count } = await supabase
        .from('attendance_logs')
        .update({
            check_out_time: new Date().toISOString(),
            check_out_location: latitude !== undefined && longitude !== undefined ? `(${latitude},${longitude})` : null,
            check_out_note: notes || (verificationMethod === 'office_wifi' ? 'Verified by Office Wifi' : ''),
        })
        .eq('id', log.id)
        .select() // Important to ensure we get data back or check count

    if (error) {
        console.error('Check-out error DETAILS:', JSON.stringify(error, null, 2))
        return { error: 'Lỗi hệ thống khi chấm ra: ' + error.message }
    }

    if (!data || data.length === 0) {
        console.error('Check-out failed: 0 rows affected. This is likely an RLS Policy issue.')
        return { error: 'Lỗi hệ thống: Cập nhật thất bại. Vui lòng liên hệ quản trị viên (Lỗi RLS).' }
    }

    revalidatePath('/')
    return { success: true }
}

export async function getTodayStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get the LATEST attendance status to determine button state
    const getVNNow = () => new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    const today = getVNNow().toISOString().split('T')[0]

    // Debug
    console.log('[getTodayStatus] Fetching for user:', user.id, 'Date:', today)

    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', today) // Strictly match today to avoid pulling stale/future logs
        .in('status', ['present', 'late'])
        .order('created_at', { ascending: false })
        .limit(1)

    if (error) {
        console.error('getTodayStatus error:', error)
        return null
    }

    const log = data && data.length > 0 ? data[0] : null
    console.log('[getTodayStatus] Found log:', log)
    return log
}

export async function getAttendanceHistory() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return data || []
}

export async function getAttendanceStats(view: 'week' | 'month' = 'week') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { totalHours: 0, totalOT: 0, dailyStats: [] }

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (view === 'week') {
        const day = now.getDay()
        const diff = (day === 0 ? -6 : 1) - day
        startDate = new Date(now)
        startDate.setDate(now.getDate() + diff)
        startDate.setHours(0, 0, 0, 0)

        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)

        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
    }

    const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', startDate.toISOString().split('T')[0])
        .lte('work_date', endDate.toISOString().split('T')[0])
        .order('work_date', { ascending: true })

    if (error || !logs) return { totalHours: 0, totalOT: 0, dailyStats: [] }

    // Map logs to days
    const statsMap = new Map<string, { standard: number, ot: number }>()

    // Initialize stats for each day in range
    const current = new Date(startDate)
    while (current <= endDate) {
        statsMap.set(current.toISOString().split('T')[0], { standard: 0, ot: 0 })
        current.setDate(current.getDate() + 1)
    }

    let totalStandardMinutes = 0
    let totalOTMinutes = 0

    logs.forEach(log => {
        if (log.check_in_time && log.check_out_time) {
            const inTime = new Date(log.check_in_time)
            const outTime = new Date(log.check_out_time)

            // Shift Calculation (Shift Rules: total max 8h)
            const getTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                d.setHours(h, m, 0, 0)
                return d.getTime()
            }

            const inMs = inTime.getTime()
            const outMs = outTime.getTime()

            const morningStart = getTime(inTime, 8, 30)
            const morningEnd = getTime(inTime, 12, 0)
            const afternoonStart = getTime(inTime, 13, 30)
            const afternoonEnd = getTime(inTime, 18, 0)

            // Standard Morning: overlap with [08:30, 12:00]
            const mWorkStart = Math.max(inMs, morningStart)
            const mWorkEnd = Math.min(outMs, morningEnd)
            const mMinutes = Math.max(0, (mWorkEnd - mWorkStart) / (1000 * 60))

            // Standard Afternoon: overlap with [13:30, 18:00]
            const aWorkStart = Math.max(inMs, afternoonStart)
            const aWorkEnd = Math.min(outMs, afternoonEnd)
            const aMinutes = Math.max(0, (aWorkEnd - aWorkStart) / (1000 * 60))

            const standardMinutes = mMinutes + aMinutes

            // Overtime: Total duration minus standard duration
            const totalDurationMinutes = (outMs - inMs) / (1000 * 60)
            // But we must also exclude the 1.5h lunch break if the session spans across it
            let actualWorkMinutes = totalDurationMinutes
            const lunchStart = getTime(inTime, 12, 0)
            const lunchEnd = getTime(inTime, 13, 30)

            const lunchOverlapStart = Math.max(inMs, lunchStart)
            const lunchOverlapEnd = Math.min(outMs, lunchEnd)
            const lunchOverlapMinutes = Math.max(0, (lunchOverlapEnd - lunchOverlapStart) / (1000 * 60))

            actualWorkMinutes -= lunchOverlapMinutes

            const otMinutes = Math.max(0, actualWorkMinutes - standardMinutes)

            totalStandardMinutes += standardMinutes
            totalOTMinutes += otMinutes

            const dateKey = log.work_date
            const dayStats = statsMap.get(dateKey) || { standard: 0, ot: 0 }
            dayStats.standard += (standardMinutes / 60)
            dayStats.ot += (otMinutes / 60)
            statsMap.set(dateKey, dayStats)
        }
    })

    const dailyStats = Array.from(statsMap.entries()).map(([date, stats]) => {
        const d = new Date(date)
        return {
            label: view === 'week' ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()] : format(d, 'dd'),
            date,
            standard: Math.round(stats.standard * 10) / 10,
            ot: Math.round(stats.ot * 10) / 10,
            // Height reference is 12h for better visualization of OT
            percentage: Math.min(((stats.standard + stats.ot) / 12) * 100, 100)
        }
    })

    // If weekly view, ensure Monday-Sunday order
    let finalStats = dailyStats
    if (view === 'week') {
        const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        finalStats = order.map(o => dailyStats.find(s => s.label === o) || { label: o, date: '', standard: 0, ot: 0, percentage: 0 })
    }

    return {
        totalHours: Math.round((totalStandardMinutes / 60) * 10) / 10,
        totalOT: Math.round((totalOTMinutes / 60) * 10) / 10,
        dailyStats: finalStats
    }
}

export async function getAttendanceLogsRange(
    startDateStr: string,
    endDateStr: string,
    page?: number,
    limit?: number
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { logs: [], totalCount: 0, stats: { totalHours: 0, overtime: 0, daysPresent: 0, totalWorkdays: 0, totalDaysInRange: 0 } }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    const startIso = startDate.toISOString().split('T')[0]
    const endIso = endDate.toISOString().split('T')[0]

    // 1. Get TOTAL Stats for the range (All data)
    const { data: allLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', startIso)
        .lte('work_date', endIso)

    // Calculate stats based on ALL logs in range
    const stats = calculateStats(allLogs || [], startDate, endDate)

    // 2. Get PAGINATED Logs
    let query = supabase
        .from('attendance_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('work_date', startIso)
        .lte('work_date', endIso)
        .order('work_date', { ascending: false })

    if (page && limit) {
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)
    }

    const { data: logs, count, error } = await query

    if (error || !logs) return { logs: [], totalCount: 0, stats }

    // Process only the paginated logs for display
    const processedLogs = processLogs(logs)

    // Reuse existing leave logic (fetching inside calculateStats or keep here if needed)
    // For simplicity, we keep the original stats calculation structure but moved to helper or inline

    // ... (Attach stats to return)
    return {
        logs: processedLogs,
        totalCount: count || 0,
        stats: await enhanceStatsWithLeave(supabase, user.id, stats)
    }
}

// Helper to process logs (extracted from original logic)
function processLogs(logs: any[]) {
    let totalStandardMinutes = 0 // Local var just for processing, not used for total stats
    let totalOTMinutes = 0

    return logs.map(log => {
        let standard = 0
        let ot = 0
        let breakMin = 0

        if (log.check_in_time && log.check_out_time) {
            const inTime = new Date(log.check_in_time)
            const outTime = new Date(log.check_out_time)
            const inMs = inTime.getTime()
            const outMs = outTime.getTime()

            const getTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                d.setHours(h, m, 0, 0)
                return d.getTime()
            }

            // Standards
            const morningStart = getTime(inTime, 8, 30)
            const morningEnd = getTime(inTime, 12, 0)
            const afternoonStart = getTime(inTime, 13, 30)
            const afternoonEnd = getTime(inTime, 18, 0)

            // Standard Calculation
            const mWorkStart = Math.max(inMs, morningStart)
            const mWorkEnd = Math.min(outMs, morningEnd)
            const mMin = Math.max(0, (mWorkEnd - mWorkStart) / 60000)

            const aWorkStart = Math.max(inMs, afternoonStart)
            const aWorkEnd = Math.min(outMs, afternoonEnd)
            const aMin = Math.max(0, (aWorkEnd - aWorkStart) / 60000)

            standard = (mMin + aMin) / 60

            // Break
            const lunchStart = getTime(inTime, 12, 0)
            const lunchEnd = getTime(inTime, 13, 30)
            const lOverlapStart = Math.max(inMs, lunchStart)
            const lOverlapEnd = Math.min(outMs, lunchEnd)
            breakMin = Math.max(0, (lOverlapEnd - lOverlapStart) / 60000)

            // OT
            const totalWorkMin = ((outMs - inMs) / 60000) - breakMin
            ot = Math.max(0, (totalWorkMin / 60) - (standard))
        }

        return {
            ...log,
            totalHours: standard + ot,
            breakDurationMin: breakMin,
            status: log.status || 'approved'
        }
    })
}

// Calculate Stats for ALL logs
function calculateStats(logs: any[], startDate: Date, endDate: Date) {
    let totalStandardMinutes = 0
    let totalOTMinutes = 0
    const daysPresent = new Set(logs.map(l => l.work_date)).size

    // Calculate total business days (Mon-Fri) in range
    let totalWorkdays = 0
    let totalDaysInRange = 0
    const tempDate = new Date(startDate)
    const endComp = new Date(endDate)
    endComp.setHours(23, 59, 59, 999)

    while (tempDate <= endComp) {
        const dayOfWeek = tempDate.getDay()
        if (dayOfWeek !== 0) { // Exclude only Sundays (0)
            totalWorkdays++
        }
        totalDaysInRange++
        tempDate.setDate(tempDate.getDate() + 1)
    }

    logs.forEach(log => {
        if (log.check_in_time && log.check_out_time) {
            // ... (Same logic as processLogs but aggregating totals)
            const inTime = new Date(log.check_in_time)
            const outTime = new Date(log.check_out_time)
            const inMs = inTime.getTime()
            const outMs = outTime.getTime()

            const getTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                d.setHours(h, m, 0, 0)
                return d.getTime()
            }

            const morningStart = getTime(inTime, 8, 30)
            const morningEnd = getTime(inTime, 12, 0)
            const afternoonStart = getTime(inTime, 13, 30)
            const afternoonEnd = getTime(inTime, 18, 0)

            // Standard Calculation
            const mWorkStart = Math.max(inMs, morningStart)
            const mWorkEnd = Math.min(outMs, morningEnd)
            const mMin = Math.max(0, (mWorkEnd - mWorkStart) / 60000)

            const aWorkStart = Math.max(inMs, afternoonStart)
            const aWorkEnd = Math.min(outMs, afternoonEnd)
            const aMin = Math.max(0, (aWorkEnd - aWorkStart) / 60000)

            const standard = (mMin + aMin) / 60

            // Break
            const lunchStart = getTime(inTime, 12, 0)
            const lunchEnd = getTime(inTime, 13, 30)
            const lOverlapStart = Math.max(inMs, lunchStart)
            const lOverlapEnd = Math.min(outMs, lunchEnd)
            const breakMin = Math.max(0, (lOverlapEnd - lOverlapStart) / 60000)

            // OT
            const totalWorkMin = ((outMs - inMs) / 60000) - breakMin
            const ot = Math.max(0, (totalWorkMin / 60) - (standard))

            totalStandardMinutes += (standard * 60)
            totalOTMinutes += (ot * 60)
        }
    })

    return {
        totalHours: Math.round(((totalStandardMinutes + totalOTMinutes) / 60) * 10) / 10,
        overtime: Math.round((totalOTMinutes / 60) * 10) / 10,
        daysPresent,
        totalWorkdays,
        totalDaysInRange
    }
}

async function enhanceStatsWithLeave(supabase: any, userId: string, stats: any) {
    // Calculate leave stats for the current year
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear}-12-31`
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const monthEnd = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd')

    // Year count
    const { count: usedLeaveYear } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'leave')
        .gte('work_date', yearStart)
        .lte('work_date', yearEnd)

    // Month count
    const { count: usedLeaveMonth } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'leave')
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd)

    const annualLimit = 12
    const monthlyLimit = 1

    return {
        ...stats,
        usedLeaveYear: usedLeaveYear || 0,
        remainingLeaveYear: Math.max(0, annualLimit - (usedLeaveYear || 0)),
        annualLimit,
        usedLeaveMonth: usedLeaveMonth || 0,
        remainingLeaveMonth: Math.max(0, monthlyLimit - (usedLeaveMonth || 0)),
        monthlyLimit
    }
}




export async function getAllAttendanceLogs() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { logs: [], stats: { totalHours: 0, overtime: 0, daysPresent: 0, totalWorkdays: 0, totalDaysInRange: 0 } }

    const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('work_date', { ascending: false })

    if (error || !logs || logs.length === 0) return { logs: [], stats: { totalHours: 0, overtime: 0, daysPresent: 0, totalWorkdays: 0, totalDaysInRange: 0 } }

    return getAttendanceLogsRange(
        logs[logs.length - 1].work_date,
        logs[0].work_date
    )
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateDistance, OFFICE_IPS } from '@/utils/geo'
import { getWorkSettings } from '@/app/actions/settings'
import { format } from 'date-fns'
import { headers } from 'next/headers'

export async function submitAttendanceChange(payload: {
    log_id?: string
    work_date: string
    check_in_time: string
    check_out_time: string
    reason: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Clean up old pending requests for this date to avoid duplicates
    // Fetch first to properly filter JSONB payload
    const { data: existingRequests, error: fetchError } = await supabase.from('change_requests')
        .select('id, payload')
        .eq('user_id', user.id)
        .eq('type', 'attendance_edit')
        .eq('status', 'pending')

    console.log('[submitAttendanceChange] Existing requests:', existingRequests)
    console.log('[submitAttendanceChange] Target work_date:', payload.work_date)

    if (fetchError) {
        console.error('[submitAttendanceChange] Fetch error:', fetchError)
    }

    // Filter for matching work_date in payload
    const idsToDelete = existingRequests
        ?.filter(req => {
            console.log('[submitAttendanceChange] Checking req:', req.id, 'work_date:', req.payload?.work_date)
            return req.payload?.work_date === payload.work_date
        })
        ?.map(req => req.id) || []

    console.log('[submitAttendanceChange] IDs to delete:', idsToDelete)

    // Delete matching old requests
    if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('change_requests')
            .delete()
            .in('id', idsToDelete)

        if (deleteError) {
            console.error('[submitAttendanceChange] DELETE ERROR:', deleteError)
        } else {
            console.log('[submitAttendanceChange] Successfully deleted', idsToDelete.length, 'old requests')
        }
    }

    const { error } = await supabase.from('change_requests').insert({
        user_id: user.id,
        type: 'attendance_edit',
        reason: payload.reason,
        status: 'pending',
        payload: {
            log_id: payload.log_id,
            work_date: payload.work_date,
            check_in_time: payload.check_in_time,
            check_out_time: payload.check_out_time
        }
    })

    if (error) {
        console.error('Submit Change Error:', error)
        return { error: error.message }
    }

    // NOTIFICATION: Notify Admins
    const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'admin').single()
    if (adminRole) {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role_id', adminRole.id)
        if (admins && admins.length > 0) {
            const { createNotification } = await import('@/app/actions/notification')
            const adminIds = admins.map(a => a.id)
            await Promise.all(adminIds.map(id =>
                createNotification(id, 'Yêu cầu sửa công mới', `Nhân viên ${user.user_metadata.full_name || 'ẩn danh'} yêu cầu chỉnh sửa công ngày ${payload.work_date}.`, 'info', '/admin/approvals')
            ))
        }
    }

    revalidatePath('/timesheets')
    return { success: true }
}

export async function checkIn(latitude?: number, longitude?: number, notes?: string) {
    const supabase = await createClient()
    const headerList = await headers()
    const settings = await getWorkSettings()

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
    let isIpValid = false
    let isGpsValid = false
    let verificationMethod = 'none'

    // 1. Kiểm tra IP Văn phòng
    const dynamicIps = settings.company_wifi_ip
        ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
        : []
    const validIps = dynamicIps.length > 0 ? dynamicIps : OFFICE_IPS

    if (userIp !== 'unknown' && validIps.includes(userIp)) {
        isIpValid = true
    }

    // 2. Kiểm tra GPS
    let gpsDistance = 0
    if (latitude !== undefined && longitude !== undefined) {
        gpsDistance = calculateDistance(
            latitude,
            longitude,
            parseFloat(settings.office_latitude),
            parseFloat(settings.office_longitude)
        )
        if (gpsDistance <= settings.max_distance_meters) {
            isGpsValid = true
        }
    }

    // --- XÁC ĐỊNH TỔNG HỢP VỊ TRÍ ---
    let isLocationValid = false
    if (settings.require_gps_and_wifi) {
        // Bắt buộc CẢ HAI
        if (isIpValid && isGpsValid) {
            isLocationValid = true
            verificationMethod = 'gps_and_wifi'
        } else {
            let errorMsg = 'Chế độ an toàn cao: Bạn cần thỏa mãn cả GPS và Wifi.'
            if (!isIpValid) errorMsg += ` (IP ${userIp} không thuộc văn phòng)`
            if (!isGpsValid) errorMsg += ` (Vị trí GPS nằm ngoài bán kính ${settings.max_distance_meters}m)`
            return { error: errorMsg }
        }
    } else {
        // Chỉ cần MỘT TRONG HAI (Mặc định)
        if (isIpValid) {
            isLocationValid = true
            verificationMethod = 'office_wifi'
        } else if (isGpsValid) {
            isLocationValid = true
            verificationMethod = 'gps'
        } else {
            return {
                error: `Không thể xác minh vị trí. Vui lòng kết nối Wifi công ty HOẶC bật GPS trong bán kính cho phép. (IP: ${userIp}, Khoảng cách: ${Math.round(gpsDistance)}m)`
            }
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

    const startTimeStr = schedule?.start_time || settings.work_start_time

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
    const settings = await getWorkSettings()

    // Lấy IP người dùng
    const forwardedFor = headerList.get('x-forwarded-for')
    const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.' }

    // --- KIỂM TRA VỊ TRÍ (CHECK-OUT) ---
    let isIpValid = false
    let isGpsValid = false
    let verificationMethod = 'none'

    const dynamicIps = settings.company_wifi_ip
        ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
        : []
    const validIps = dynamicIps.length > 0 ? dynamicIps : OFFICE_IPS

    if (userIp !== 'unknown' && validIps.includes(userIp)) {
        isIpValid = true
    }

    let gpsDistance = 0
    if (latitude !== undefined && longitude !== undefined) {
        gpsDistance = calculateDistance(
            latitude,
            longitude,
            parseFloat(settings.office_latitude),
            parseFloat(settings.office_longitude)
        )
        if (gpsDistance <= settings.max_distance_meters) {
            isGpsValid = true
        }
    }

    // --- XÁC ĐỊNH TỔNG HỢP VỊ TRÍ ---
    let isLocationValid = false
    if (settings.require_gps_and_wifi) {
        if (isIpValid && isGpsValid) {
            isLocationValid = true
            verificationMethod = 'gps_and_wifi'
        } else {
            let errorMsg = 'Cần thỏa mãn cả GPS và Wifi để Chấm ra.'
            if (!isIpValid) errorMsg += ` (IP ${userIp} không hợp lệ)`
            if (!isGpsValid) errorMsg += ` (GPS nằm ngoài bán kính)`
            return { error: errorMsg }
        }
    } else {
        if (isIpValid) {
            isLocationValid = true
            verificationMethod = 'office_wifi'
        } else if (isGpsValid) {
            isLocationValid = true
            verificationMethod = 'gps'
        } else {
            return {
                error: `Không thể xác minh vị trí qua Wifi hoặc GPS. (IP: ${userIp}, Khoảng cách: ${Math.round(gpsDistance)}m)`
            }
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

    const settings = await getWorkSettings()

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
            // Use original UTC times
            const inTime = new Date(log.check_in_time)
            const outTime = new Date(log.check_out_time)

            const inMs = inTime.getTime()
            const outMs = outTime.getTime()

            // Helper to set UTC time relative to the log's date
            const getUTCTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                // Settings are in VN Time (UTC+7). Convert to UTC (-7)
                // Handle day wrap if needed (simple -7 is fine for typical work hours)
                let utcH = h - 7
                if (utcH < 0) utcH += 24

                d.setUTCHours(utcH, m, 0, 0)
                return d.getTime()
            }

            // Standards (Using Settings - VN Time converted to UTC)
            const morningStart = getUTCTime(inTime, ...parseTime(settings.work_start_time))
            const morningEnd = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const afternoonStart = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
            const afternoonEnd = getUTCTime(inTime, ...parseTime(settings.work_end_time))

            // Standard Morning
            const mWorkStart = Math.max(inMs, morningStart)
            const mWorkEnd = Math.min(outMs, morningEnd)
            const mMinutes = Math.max(0, (mWorkEnd - mWorkStart) / (1000 * 60))

            // Standard Afternoon
            const aWorkStart = Math.max(inMs, afternoonStart)
            const aWorkEnd = Math.min(outMs, afternoonEnd)
            const aMinutes = Math.max(0, (aWorkEnd - aWorkStart) / (1000 * 60))

            const standardMinutes = mMinutes + aMinutes

            // Overtime: Total duration minus standard duration
            const totalDurationMinutes = (outMs - inMs) / (1000 * 60)
            let actualWorkMinutes = totalDurationMinutes

            // Break (Using Settings)
            const lunchStart = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const lunchEnd = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))

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
            hasData: stats.standard > 0 || stats.ot > 0,
            isOffDay: (settings.work_off_days || [6, 0]).includes(d.getDay()),
            // Height reference is 12h for better visualization of OT
            percentage: Math.min(((stats.standard + stats.ot) / 12) * 100, 100)
        }
    })

    // If weekly view, ensure Monday-Sunday order
    let finalStats = dailyStats
    if (view === 'week') {
        const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        const dayToNum: any = { 'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6 }
        const offDays = settings.work_off_days || [6, 0]

        finalStats = order.map(o =>
            dailyStats.find(s => s.label === o) ||
            {
                label: o,
                date: '',
                standard: 0,
                ot: 0,
                percentage: 0,
                hasData: false,
                isOffDay: offDays.includes(dayToNum[o])
            }
        )
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
    limit?: number,
    targetUserId?: string // New optional parameter
) {
    const supabase = await createClient()

    let queryUserId = targetUserId
    if (!queryUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { logs: [], totalCount: 0, stats: { totalHours: 0, overtime: 0, daysPresent: 0, totalWorkdays: 0, totalDaysInRange: 0 } }
        queryUserId = user.id
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    const startIso = startDate.toISOString().split('T')[0]
    const endIso = endDate.toISOString().split('T')[0]

    // 1. Get TOTAL Stats for the range (All data)
    const { data: allLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', queryUserId)
        .gte('work_date', startIso)
        .lte('work_date', endIso)

    // Calculate stats based on ALL logs in range
    const settings = await getWorkSettings()
    const stats = calculateStats(allLogs || [], startDate, endDate, settings)

    // 2. Get PAGINATED Logs
    let paginatedLogsQuery = supabase
        .from('attendance_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', queryUserId)
        .gte('work_date', startIso)
        .lte('work_date', endIso)
        .order('work_date', { ascending: false })

    if (page && limit) {
        const from = (page - 1) * limit
        const to = from + limit - 1
        paginatedLogsQuery = paginatedLogsQuery.range(from, to)
    }

    const { data: logs, count, error } = await paginatedLogsQuery

    if (error || !logs) return { logs: [], totalCount: 0, stats }

    // Process only the paginated logs for display
    const processedLogs = processLogs(logs, settings)

    // Reuse existing leave logic (fetching inside calculateStats or keep here if needed)
    // For simplicity, we keep the original stats calculation structure but moved to helper or inline

    // ... (Attach stats to return)
    return {
        logs: processedLogs,
        totalCount: count || 0,
        stats: await enhanceStatsWithLeave(supabase, queryUserId, stats, allLogs || [])
    }
}

// Helper to parsing "HH:mm" -> [H, M]
function parseTime(timeStr: string): [number, number] {
    const [h, m] = timeStr.split(':').map(Number)
    return [h || 0, m || 0]
}

// Helper to process logs (extracted from original logic)
function processLogs(logs: any[], settings: any) {
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

            // Helper to set UTC time (Shift -7h from VN Settings)
            const getUTCTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                let utcH = h - 7
                if (utcH < 0) utcH += 24
                d.setUTCHours(utcH, m, 0, 0)
                return d.getTime()
            }

            // Standards (Using Settings - VN Time converted to UTC)
            const morningStart = getUTCTime(inTime, ...parseTime(settings.work_start_time))
            const morningEnd = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const afternoonStart = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
            const afternoonEnd = getUTCTime(inTime, ...parseTime(settings.work_end_time))

            // Standard Calculation
            const mWorkStart = Math.max(inMs, morningStart)
            const mWorkEnd = Math.min(outMs, morningEnd)
            const mMin = Math.max(0, (mWorkEnd - mWorkStart) / 60000)

            const aWorkStart = Math.max(inMs, afternoonStart)
            const aWorkEnd = Math.min(outMs, afternoonEnd)
            const aMin = Math.max(0, (aWorkEnd - aWorkStart) / 60000)

            standard = (mMin + aMin) / 60

            // Break (Using Settings)
            const lunchStart = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const lunchEnd = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
            const lOverlapStart = Math.max(inMs, lunchStart)
            const lOverlapEnd = Math.min(outMs, lunchEnd)
            breakMin = Math.max(0, (lOverlapEnd - lOverlapStart) / 60000)

            // OT
            const totalWorkMin = ((outMs - inMs) / 60000) - breakMin
            ot = Math.max(0, (totalWorkMin / 60) - (standard))
        }

        return {
            ...log,
            totalHours: Math.round((standard + ot) * 10) / 10,
            breakDurationMin: Math.round(breakMin),
            status: log.status || 'approved'
        }
    })
}

// Calculate Stats for ALL logs
function calculateStats(logs: any[], startDate: Date, endDate: Date, settings: any) {
    let totalStandardMinutes = 0
    let totalOTMinutes = 0
    const daysPresent = new Set(logs.map(l => l.work_date)).size

    // Calculate total business days in range
    let totalWorkdays = 0
    let totalDaysInRange = 0
    const tempDate = new Date(startDate)
    const endComp = new Date(endDate)
    endComp.setHours(23, 59, 59, 999)

    const offDays = settings.work_off_days || [0] // Default to Sunday if not set
    while (tempDate <= endComp) {
        const dayOfWeek = tempDate.getDay()
        if (!offDays.includes(dayOfWeek)) {
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

            // Helper to set UTC time (Shift -7h from VN Settings)
            const getUTCTime = (date: Date, h: number, m: number) => {
                const d = new Date(date)
                let utcH = h - 7
                if (utcH < 0) utcH += 24
                d.setUTCHours(utcH, m, 0, 0)
                return d.getTime()
            }

            const morningStart = getUTCTime(inTime, ...parseTime(settings.work_start_time))
            const morningEnd = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const afternoonStart = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))
            const afternoonEnd = getUTCTime(inTime, ...parseTime(settings.work_end_time))

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

            const lunchStart = getUTCTime(inTime, ...parseTime(settings.lunch_start_time))
            const lunchEnd = getUTCTime(inTime, ...parseTime(settings.lunch_end_time))

            const lunchOverlapStart = Math.max(inMs, lunchStart)
            const lunchOverlapEnd = Math.min(outMs, lunchEnd)
            const lunchOverlapMinutes = Math.max(0, (lunchOverlapEnd - lunchOverlapStart) / (1000 * 60))

            const actualWorkMinutes = totalDurationMinutes - lunchOverlapMinutes

            const otMinutes = Math.max(0, actualWorkMinutes - standardMinutes)

            totalStandardMinutes += standardMinutes
            totalOTMinutes += otMinutes
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

async function enhanceStatsWithLeave(supabase: any, userId: string, stats: any, allLogs: any[]) {
    // If no logs found in range, check if there's ANY log for this user ever (to distinguish new user vs filtered range)
    if ((allLogs || []).length === 0) {
        const { count } = await supabase
            .from('attendance_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId) // Use userId here, as queryUserId is not available

        // If user has NO logs ever, return empty special state if needed
    }
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

// Get Quick Stats for Employee Profile Page
export async function getEmployeeQuickStats(userId: string) {
    const supabase = await createClient()
    const now = new Date()

    console.log('🔍 [Quick Stats] Fetching for user:', userId)

    // Get current month date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get last 3 months for punctuality calculation
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    console.log('📅 Date ranges:', {
        currentMonth: `${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`,
        threeMonths: `${threeMonthsAgo.toISOString().split('T')[0]} onwards`
    })

    // Fetch attendance logs for current month
    const { data: monthLogs, error: monthError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('work_date', startOfMonth.toISOString().split('T')[0])
        .lte('work_date', endOfMonth.toISOString().split('T')[0])

    console.log('📊 Month logs:', { count: monthLogs?.length || 0, error: monthError })

    // Fetch attendance logs for last 3 months (for punctuality)
    const { data: punctualityLogs, error: punctualityError } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('user_id', userId)
        .gte('work_date', threeMonthsAgo.toISOString().split('T')[0])

    console.log('⏰ Punctuality logs:', { count: punctualityLogs?.length || 0, error: punctualityError })

    // Fetch leave requests to calculate PTO balance
    // Schema: id, user_id, leave_date, status
    // Assumption: Each record is 1 day
    const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('status')
        .eq('user_id', userId)
        .in('status', ['approved', 'pending'])

    console.log('🏖️ Leave data:', { count: leaveData?.length || 0, error: leaveError })

    // Calculate Punctuality (% on-time in last 3 months)
    let punctualityRate = 0
    if (punctualityLogs && punctualityLogs.length > 0) {
        const onTimeCount = punctualityLogs.filter(log => log.status === 'present' || log.status === 'on-time').length
        punctualityRate = Math.round((onTimeCount / punctualityLogs.length) * 100)
    }

    let overtimeHours = 0
    // --- Reuse getAttendanceLogsRange for CONSISTENT Overtime Calculation ---
    // This ensures Quick Stats matches the Monthly Chart exactly
    try {
        const statsData = await getAttendanceLogsRange(
            startOfMonth.toISOString().split('T')[0],
            endOfMonth.toISOString().split('T')[0],
            1, 1000, // Get all logs for the month
            userId // PASS THE TARGET USER ID!
        )

        // Use the calculated overtime from the shared logic
        if (statsData.stats && typeof statsData.stats.totalOvertimeHours === 'number') {
            overtimeHours = statsData.stats.totalOvertimeHours
            console.log('⏱️ Overtime (Synced):', overtimeHours)
        } else if (monthLogs && monthLogs.length > 0) {
            // Fallback (old simple logic) if sync fails
            overtimeHours = monthLogs.reduce((total, log) => {
                // ... (fallback logic) ...
                const explicitOT = log.overtime_hours ? parseFloat(log.overtime_hours.toString()) : 0
                if (explicitOT > 0) return total + explicitOT
                // Simple diff fallback
                if (log.check_in_time && log.check_out_time) {
                    const diff = new Date(log.check_out_time).getTime() - new Date(log.check_in_time).getTime()
                    const hours = diff / 3600000
                    if (hours > 9) return total + (hours - 9)
                }
                return total
            }, 0)
        }
    } catch (err) {
        console.error('Error syncing overtime logic:', err)
    }

    // Calculate PTO Balance (assume 12 days per year, minus used days)
    const annualPTO = 12 // Standard PTO days per year
    // Each record in leave_requests is 1 day
    const usedPTO = leaveData?.length || 0
    const ptoBalance = Math.max(0, annualPTO - usedPTO)

    console.log('📈 Final stats:', { punctualityRate, overtimeHours, ptoBalance, usedPTO })

    return {
        punctuality: punctualityRate, // Percentage (0-100)
        ptoBalance: ptoBalance.toFixed(1), // Days remaining
        overtime: overtimeHours.toFixed(1), // Hours this month
        error: monthError || punctualityError || leaveError,
        // Debug info (cleaned up)
        _debug: {
            userId,
            syncMethod: 'getAttendanceLogsRange',
            overtime: overtimeHours
        }
    }
}

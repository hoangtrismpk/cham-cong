'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { getWorkSettings } from '@/app/actions/settings'
import { calculateDistance, OFFICE_IPS } from '@/utils/geo'
import { revalidatePath } from 'next/cache'

// ──────────────────────────────────────────────
// Return types
// ──────────────────────────────────────────────
interface AutoCheckResult {
    status: 'success' | 'skipped' | 'need_gps' | 'error'
    reason?: string
    error?: string
}

// Helper to get VN Time in Minutes explicitly
function getVnTimeInMinutes(): number {
    const vnTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date())
    const [h, m] = vnTimeStr.split(':').map(Number)
    return h * 60 + m
}

// ──────────────────────────────────────────────
// attemptAutoCheckIn - Server-side consolidated
// Replaces 6 waterfall client queries with 1 call
// ──────────────────────────────────────────────
export async function attemptAutoCheckIn(
    gpsLatitude?: number,
    gpsLongitude?: number
): Promise<AutoCheckResult> {
    try {
        const supabase = await createClient()
        const headerList = await headers()
        const settings = await getWorkSettings()

        // ─── 1. Auth check ───
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { status: 'skipped', reason: 'not_authenticated' }

        // ─── 2. Parallel: profile + active session + schedules ───
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())

        const [profileRes, activeLogsRes, schedulesRes, leaveRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('auto_checkin_enabled, clock_in_remind_minutes')
                .eq('id', user.id)
                .single(),
            supabase
                .from('attendance_logs')
                .select('id')
                .eq('user_id', user.id)
                .is('check_out_time', null),
            supabase
                .from('work_schedules')
                .select('*')
                .eq('user_id', user.id)
                .eq('work_date', today),
            supabase
                .from('leave_requests')
                .select('id')
                .eq('employee_id', user.id)
                .eq('leave_date', today)
                .eq('status', 'approved')
                .limit(1)
        ])

        const profile = profileRes.data
        const activeLogs = activeLogsRes.data
        const schedules = schedulesRes.data
        const approvedLeaves = leaveRes.data || []

        // ─── 3. Early bailouts ───
        if (!profile || !profile.auto_checkin_enabled) {
            return { status: 'skipped', reason: 'disabled' }
        }

        if (activeLogs && activeLogs.length > 0) {
            return { status: 'skipped', reason: 'already_checked_in' }
        }

        if (!schedules || schedules.length === 0) {
            return { status: 'skipped', reason: 'no_schedule' }
        }

        if (approvedLeaves.length > 0) {
            return { status: 'skipped', reason: 'on_approved_leave' }
        }

        const offDays: number[] = settings.work_off_days || [6, 0]
        const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
        if (offDays.includes(vnNow.getDay())) {
            return { status: 'skipped', reason: 'company_off_day' }
        }

        // ─── 4. Find matching shift ───
        const remindMinutes = profile.clock_in_remind_minutes ?? 5
        let targetSchedule = null
        const nowMins = getVnTimeInMinutes()

        for (const schedule of schedules) {
            if (!schedule.start_time) continue

            const [startH, startM] = schedule.start_time.split(':').map(Number)
            const shiftStartMins = startH * 60 + startM

            const diffMins = shiftStartMins - nowMins

            // Within window: not too early AND up to 10 hours late
            if (diffMins <= remindMinutes && diffMins > -600) {
                targetSchedule = schedule
                break
            }
        }

        if (!targetSchedule) {
            return { status: 'skipped', reason: 'outside_time_window' }
        }

        // ─── 5. Location verification (IP first, then GPS) ───
        const forwardedFor = headerList.get('x-forwarded-for')
        const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

        const dynamicIps = settings.company_wifi_ip
            ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
            : []
        const validIps = dynamicIps.length > 0 ? dynamicIps : OFFICE_IPS

        let isIpValid = userIp !== 'unknown' && validIps.includes(userIp)
        let isGpsValid = false
        let verificationMethod = 'none'
        let gpsDistance = 0

        if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
            gpsDistance = calculateDistance(
                gpsLatitude, gpsLongitude,
                parseFloat(settings.office_latitude),
                parseFloat(settings.office_longitude)
            )
            isGpsValid = gpsDistance <= settings.max_distance_meters
        }

        // Determine location validity
        if (settings.require_gps_and_wifi) {
            if (isIpValid && isGpsValid) {
                verificationMethod = 'gps_and_wifi'
            } else if (!isIpValid && !isGpsValid && gpsLatitude === undefined) {
                // No GPS provided yet, IP failed → tell client to retry with GPS
                return { status: 'need_gps', reason: `ip_failed:${userIp}` }
            } else {
                return { status: 'skipped', reason: `too_far|${gpsDistance}` }
            }
        } else {
            if (isIpValid) {
                verificationMethod = 'office_wifi'
            } else if (isGpsValid) {
                verificationMethod = 'gps'
            } else if (gpsLatitude === undefined) {
                // No GPS provided, IP failed → tell client to retry with GPS
                return { status: 'need_gps', reason: `ip_failed:${userIp}` }
            } else {
                return { status: 'skipped', reason: `too_far|${gpsDistance.toFixed(1)}m` }
            }
        }

        // ─── 6. Do the check-in! (reuse core logic from checkIn) ───
        const serverNow = new Date()

        // Double-check no active session (race condition guard)
        const { data: latestLog } = await supabase
            .from('attendance_logs')
            .select('id, check_out_time')
            .eq('user_id', user.id)
            .eq('work_date', today)
            .in('status', ['present', 'late'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (latestLog && !latestLog.check_out_time) {
            return { status: 'skipped', reason: 'already_checked_in' }
        }

        // Late detection
        let status = 'present'
        let lateMinutes = 0

        const startTimeStr = targetSchedule.start_time || settings.work_start_time
        const nowHHMM = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh'
        }).format(serverNow)

        const targetTime = startTimeStr.substring(0, 5)

        if (nowHHMM > targetTime) {
            status = 'late'
            const [hNow, mNow] = nowHHMM.split(':').map(Number)
            const [hTarget, mTarget] = targetTime.split(':').map(Number)
            lateMinutes = (hNow * 60 + mNow) - (hTarget * 60 + mTarget)

            if (settings.allow_grace_period && lateMinutes <= (settings.grace_period_minutes || 5)) {
                status = 'present'
                lateMinutes = 0
            }
        }

        // Insert
        const { error } = await supabase.from('attendance_logs').insert({
            user_id: user.id,
            check_in_time: serverNow.toISOString(),
            check_in_location: gpsLatitude !== undefined && gpsLongitude !== undefined
                ? `(${gpsLatitude},${gpsLongitude})` : null,
            check_in_note: `Auto: ${verificationMethod}`,
            work_date: today,
            status,
            late_minutes: lateMinutes,
        })

        if (error) {
            console.error('[attemptAutoCheckIn] Insert error:', error)
            return { status: 'error', error: error.message }
        }

        revalidatePath('/')
        return { status: 'success', reason: verificationMethod }

    } catch (e: any) {
        console.error('[attemptAutoCheckIn] Exception:', e)
        return { status: 'error', error: e.message }
    }
}

// ──────────────────────────────────────────────
// attemptAutoCheckOut - Server-side consolidated
// ──────────────────────────────────────────────
export async function attemptAutoCheckOut(
    gpsLatitude?: number,
    gpsLongitude?: number
): Promise<AutoCheckResult> {
    try {
        const supabase = await createClient()
        const headerList = await headers()
        const settings = await getWorkSettings()

        // ─── 1. Auth check ───
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { status: 'skipped', reason: 'not_authenticated' }

        // ─── 2. Parallel: profile + active session + schedules ───
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())

        const [profileRes, activeLogsRes, schedulesRes, leaveRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('auto_checkout_enabled, clock_out_remind_mode, clock_out_remind_minutes')
                .eq('id', user.id)
                .single(),
            supabase
                .from('attendance_logs')
                .select('*')
                .eq('user_id', user.id)
                .is('check_out_time', null)
                .order('created_at', { ascending: false })
                .limit(1),
            supabase
                .from('work_schedules')
                .select('*')
                .eq('user_id', user.id)
                .eq('work_date', today),
            supabase
                .from('leave_requests')
                .select('id')
                .eq('employee_id', user.id)
                .eq('leave_date', today)
                .eq('status', 'approved')
                .limit(1)
        ])

        const profile = profileRes.data
        const activeLogs = activeLogsRes.data
        const schedules = schedulesRes.data
        const approvedLeaves = leaveRes.data || []

        // ─── 3. Early bailouts ───
        if (!profile || !profile.auto_checkout_enabled) {
            return { status: 'skipped', reason: 'disabled' }
        }

        if (!activeLogs || activeLogs.length === 0) {
            return { status: 'skipped', reason: 'no_active_session' }
        }

        if (!schedules || schedules.length === 0) {
            return { status: 'skipped', reason: 'no_schedule' }
        }

        if (approvedLeaves.length > 0) {
            return { status: 'skipped', reason: 'on_approved_leave' }
        }

        const offDays: number[] = settings.work_off_days || [6, 0]
        const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
        if (offDays.includes(vnNow.getDay())) {
            return { status: 'skipped', reason: 'company_off_day' }
        }

        const activeLog = activeLogs[0]
        const remindMode = profile.clock_out_remind_mode ?? 'before'
        const remindMinutes = profile.clock_out_remind_minutes ?? 5

        // ─── 4. Find matching shift for checkout ───
        let shouldCheckOut = false
        const nowMins = getVnTimeInMinutes()

        for (const schedule of schedules) {
            if (!schedule.end_time) continue

            const [endH, endM] = schedule.end_time.split(':').map(Number)
            const shiftEndMins = endH * 60 + endM
            const diffMins = nowMins - shiftEndMins

            if (remindMode === 'before') {
                if (diffMins >= -remindMinutes && diffMins <= 480) {
                    shouldCheckOut = true
                    break
                }
            } else {
                if (diffMins >= 0 && diffMins <= Math.max(remindMinutes, 480)) {
                    shouldCheckOut = true
                    break
                }
            }
        }

        if (!shouldCheckOut) {
            return { status: 'skipped', reason: 'outside_time_window' }
        }

        // ─── 5. Location verification ───
        const forwardedFor = headerList.get('x-forwarded-for')
        const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

        const dynamicIps = settings.company_wifi_ip
            ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
            : []
        const validIps = dynamicIps.length > 0 ? dynamicIps : OFFICE_IPS

        let isIpValid = userIp !== 'unknown' && validIps.includes(userIp)
        let isGpsValid = false
        let verificationMethod = 'none'
        let gpsDistance = 0

        if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
            gpsDistance = calculateDistance(
                gpsLatitude, gpsLongitude,
                parseFloat(settings.office_latitude),
                parseFloat(settings.office_longitude)
            )
            isGpsValid = gpsDistance <= settings.max_distance_meters
        }

        if (settings.require_gps_and_wifi) {
            if (isIpValid && isGpsValid) {
                verificationMethod = 'gps_and_wifi'
            } else if (!isIpValid && !isGpsValid && gpsLatitude === undefined) {
                return { status: 'need_gps', reason: `ip_failed:${userIp}` }
            } else {
                return { status: 'skipped', reason: `too_far|${gpsDistance}` }
            }
        } else {
            if (isIpValid) {
                verificationMethod = 'office_wifi'
            } else if (isGpsValid) {
                verificationMethod = 'gps'
            } else if (gpsLatitude === undefined) {
                return { status: 'need_gps', reason: `ip_failed:${userIp}` }
            } else {
                return { status: 'skipped', reason: `too_far|${gpsDistance.toFixed(1)}m` }
            }
        }

        // ─── 6. Do the check-out! ───
        const serverNow = new Date()

        const { data, error } = await supabase
            .from('attendance_logs')
            .update({
                check_out_time: serverNow.toISOString(),
                check_out_location: gpsLatitude !== undefined && gpsLongitude !== undefined
                    ? `(${gpsLatitude},${gpsLongitude})` : null,
                check_out_note: `Auto: ${verificationMethod}`,
            })
            .eq('id', activeLog.id)
            .select()

        if (error) {
            console.error('[attemptAutoCheckOut] Update error:', error)
            return { status: 'error', error: error.message }
        }

        if (!data || data.length === 0) {
            return { status: 'error', error: 'RLS policy blocked update' }
        }

        // Recalculate overtime (non-blocking)
        try {
            const { recalcOvertimeForLog } = await import('./overtime')
            await recalcOvertimeForLog(activeLog.id)
        } catch (otError) {
            console.error('[attemptAutoCheckOut] OT recalc error:', otError)
        }

        revalidatePath('/')
        return { status: 'success', reason: verificationMethod }

    } catch (e: any) {
        console.error('[attemptAutoCheckOut] Exception:', e)
        return { status: 'error', error: e.message }
    }
}

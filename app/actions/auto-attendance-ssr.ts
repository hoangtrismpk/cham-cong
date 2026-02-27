'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { getWorkSettings } from '@/app/actions/settings'
import { OFFICE_IPS } from '@/utils/geo'

// ──────────────────────────────────────────────
// SSR Auto Check Result
// ──────────────────────────────────────────────
export interface SSRAutoCheckResult {
    action: 'none' | 'checked_in' | 'checked_out' | 'need_gps_checkin' | 'need_gps_checkout'
    reason?: string
    method?: string
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

/**
 * Server-Side Rendering Auto Attendance - Layer 1
 * 
 * Called directly in page.tsx during SSR.
 * Uses IP address to check-in/check-out instantly (0ms client delay).
 * If IP fails → returns 'need_gps_*' so client can handle GPS fallback.
 * 
 * Performance: ~200-400ms (runs in parallel with other data fetches)
 */
export async function ssrAutoAttendance(): Promise<SSRAutoCheckResult> {
    try {
        const supabase = await createClient()
        const headerList = await headers()
        const settings = await getWorkSettings()

        // ─── 1. Auth check ───
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { action: 'none', reason: 'not_authenticated' }

        // ─── 2. Parallel data fetch ───
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())

        const [profileRes, activeLogsRes, schedulesRes, leaveRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('auto_checkin_enabled, auto_checkout_enabled, clock_in_remind_minutes, clock_out_remind_mode, clock_out_remind_minutes')
                .eq('id', user.id)
                .single(),
            supabase
                .from('attendance_logs')
                .select('id, check_out_time')
                .eq('user_id', user.id)
                .is('check_out_time', null)
                .order('created_at', { ascending: false })
                .limit(1),
            supabase
                .from('work_schedules')
                .select('id, start_time, end_time, title')
                .eq('user_id', user.id)
                .eq('work_date', today),
            supabase
                .from('leave_requests')
                .select('id')
                .eq('user_id', user.id)
                .eq('leave_date', today)
                .eq('status', 'approved')
                .limit(1)
        ])

        const profile = profileRes.data
        const activeLogs = activeLogsRes.data || []
        const schedules = schedulesRes.data || []

        if (!profile || schedules.length === 0) {
            return { action: 'none', reason: 'no_profile_or_schedule' }
        }

        // ─── Guard: Skip on approved leave ───
        const approvedLeaves = leaveRes.data || []
        if (approvedLeaves.length > 0) {
            return { action: 'none', reason: 'on_approved_leave' }
        }

        // ─── Guard: Skip on company off days (Sat/Sun etc) ───
        const offDays: number[] = settings.work_off_days || [6, 0]
        const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
        if (offDays.includes(vnNow.getDay())) {
            return { action: 'none', reason: 'company_off_day' }
        }

        // ─── 3. IP Verification ───
        const forwardedFor = headerList.get('x-forwarded-for')
        const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') || 'unknown')

        const dynamicIps = settings.company_wifi_ip
            ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
            : []
        const validIps = dynamicIps.length > 0 ? dynamicIps : OFFICE_IPS
        const isIpValid = userIp !== 'unknown' && validIps.includes(userIp)

        const nowMins = getVnTimeInMinutes()
        const hasActiveSession = activeLogs.length > 0

        // ─── 4A. Try AUTO CHECK-OUT (if has active session) ───
        if (hasActiveSession && profile.auto_checkout_enabled) {
            const remindMode = profile.clock_out_remind_mode ?? 'before'
            const remindMinutes = profile.clock_out_remind_minutes ?? 5

            for (const schedule of schedules) {
                if (!schedule.end_time) continue

                const [endH, endM] = schedule.end_time.split(':').map(Number)
                const shiftEndMins = endH * 60 + endM
                const diffMins = nowMins - shiftEndMins

                let shouldCheckOut = false
                if (remindMode === 'before') {
                    shouldCheckOut = diffMins >= -remindMinutes && diffMins <= 480
                } else {
                    shouldCheckOut = diffMins >= 0 && diffMins <= Math.max(remindMinutes, 480)
                }

                if (shouldCheckOut) {
                    if (isIpValid) {
                        // IP valid → auto checkout NOW
                        const serverNow = new Date()
                        const { data, error } = await supabase
                            .from('attendance_logs')
                            .update({
                                check_out_time: serverNow.toISOString(),
                                check_out_note: 'Auto: office_wifi (SSR)',
                            })
                            .eq('id', activeLogs[0].id)
                            .select()

                        if (!error && data && data.length > 0) {
                            // Recalculate overtime (non-blocking)
                            try {
                                const { recalcOvertimeForLog } = await import('./overtime')
                                await recalcOvertimeForLog(activeLogs[0].id)
                            } catch (_) { }

                            return { action: 'checked_out', method: 'office_wifi', reason: 'ssr_instant' }
                        }
                    } else if (!settings.require_gps_and_wifi) {
                        // IP failed, GPS might work → tell client
                        return { action: 'need_gps_checkout', reason: `ip_failed:${userIp}` }
                    }
                    break
                }
            }
        }

        // ─── 4B. Try AUTO CHECK-IN (if no active session) ───
        if (!hasActiveSession && profile.auto_checkin_enabled) {
            const remindMinutes = profile.clock_in_remind_minutes ?? 5

            for (const schedule of schedules) {
                if (!schedule.start_time) continue

                const [startH, startM] = schedule.start_time.split(':').map(Number)
                const shiftStartMins = startH * 60 + startM
                const diffMins = shiftStartMins - nowMins

                // Within window: not too early AND up to 10 hours late
                if (diffMins <= remindMinutes && diffMins > -600) {
                    if (isIpValid) {
                        // IP valid → auto check-in NOW
                        const serverNow = new Date()

                        // Late detection
                        let status = 'present'
                        let lateMinutes = 0
                        const startTimeStr = schedule.start_time
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

                        const { error } = await supabase.from('attendance_logs').insert({
                            user_id: user.id,
                            check_in_time: serverNow.toISOString(),
                            check_in_note: 'Auto: office_wifi (SSR)',
                            work_date: today,
                            status,
                            late_minutes: lateMinutes,
                        })

                        if (!error) {
                            return { action: 'checked_in', method: 'office_wifi', reason: 'ssr_instant' }
                        }
                    } else if (!settings.require_gps_and_wifi) {
                        // IP failed → tell client to try GPS
                        return { action: 'need_gps_checkin', reason: `ip_failed:${userIp}` }
                    }
                    break
                }
            }
        }

        return { action: 'none', reason: 'no_matching_condition' }

    } catch (e: any) {
        console.error('[ssrAutoAttendance] Exception:', e)
        return { action: 'none', reason: `error:${e.message}` }
    }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { EmailService } from '@/lib/email-service'
import { headers } from 'next/headers'

/**
 * Send password changed notification email to the current user
 */
export async function notifyPasswordChanged() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const headersList = await headers()
        const userAgent = headersList.get('user-agent') || 'Unknown'
        const forwardedFor = headersList.get('x-forwarded-for')
        const realIp = headersList.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'Unknown'

        // Parse device info from user-agent
        const device = parseDevice(userAgent)

        // Determine approximate location from IP
        let location = 'Không xác định'
        if (ip !== 'Unknown' && ip !== '::1' && ip !== '127.0.0.1') {
            try {
                const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`, {
                    signal: AbortSignal.timeout(3000)
                })
                if (geoRes.ok) {
                    const geo = await geoRes.json()
                    location = `${geo.city || ''}, ${geo.country || ''}`.replace(/^, |, $/g, '') || 'Không xác định'
                }
            } catch {
                // Ignore geo lookup errors
            }
        }

        await EmailService.sendAsync('password-changed', user.email, {
            user_name: profile?.full_name || user.email.split('@')[0],
            user_email: user.email,
            changed_at: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            device: device,
            ip_address: ip,
            location: location,
        })
    } catch (err) {
        console.error('[notifyPasswordChanged] Error:', err)
    }
}

/**
 * Detect unknown device and send alert email
 * Call this after successful login
 */
export async function detectAndNotifyUnknownDevice(userId: string) {
    try {
        const supabase = await createClient()
        const headersList = await headers()

        const userAgent = headersList.get('user-agent') || 'Unknown'
        const forwardedFor = headersList.get('x-forwarded-for')
        const realIp = headersList.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'Unknown'

        // Parse device info from user-agent
        const device = parseDevice(userAgent)

        // Check if this device fingerprint has been seen before
        const fingerprint = `${device}__${ip}`

        const { data: existing } = await supabase
            .from('known_devices')
            .select('id')
            .eq('user_id', userId)
            .eq('fingerprint', fingerprint)
            .limit(1)
            .single()

        if (existing) {
            // Known device - update last_seen
            await supabase
                .from('known_devices')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', existing.id)
            return // No alert needed
        }

        // New device detected - save it and send alert
        await supabase
            .from('known_devices')
            .insert({
                user_id: userId,
                fingerprint,
                device_name: device,
                ip_address: ip,
                last_seen: new Date().toISOString()
            })
            .select()
            .single()

        // Count existing devices to determine if this is really "new"
        const { count } = await supabase
            .from('known_devices')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)

        // Skip alerting for the very first device (first login ever)
        if ((count || 0) <= 1) return

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single()

        if (!profile?.email) return

        // Determine approximate location from IP
        let location = 'Không xác định'
        try {
            const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`, {
                signal: AbortSignal.timeout(3000)
            })
            if (geoRes.ok) {
                const geo = await geoRes.json()
                location = `${geo.city || ''}, ${geo.country || ''}`.replace(/^, |, $/g, '')
            }
        } catch {
            // Ignore geo lookup errors
        }

        EmailService.sendAsync('unknown-device-login', profile.email, {
            user_name: profile.full_name || profile.email.split('@')[0],
            device: device,
            ip_address: ip,
            location: location || 'Không xác định',
            login_time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        })

        console.info(`[DeviceDetection] ⚠️ New device alert sent to ${profile.email}: ${device} from ${ip}`)
    } catch (err) {
        console.error('[detectAndNotifyUnknownDevice] Error:', err)
    }
}

/**
 * Parse user-agent string into a human-readable device description
 */
function parseDevice(ua: string): string {
    let browser = 'Unknown Browser'
    let os = 'Unknown OS'

    // Browser detection
    if (ua.includes('Edg/')) browser = 'Microsoft Edge'
    else if (ua.includes('Chrome/')) browser = 'Google Chrome'
    else if (ua.includes('Firefox/')) browser = 'Firefox'
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera'

    // OS detection
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    return `${browser} on ${os}`
}

/**
 * Handle password reset logic and send the custom email using 'password-reset' template
 */
export async function sendPasswordResetEmail(email: string) {
    try {
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        // Generate the native supabase recovery link
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`
            }
        })

        if (linkErr) throw linkErr
        if (!linkData?.properties?.action_link) throw new Error("No reset link generated")

        const { data: profile } = await adminClient
            .from('profiles')
            .select('full_name')
            .eq('email', email)
            .single()

        // Send custom email through our service
        await EmailService.sendAsync('password-reset', email, {
            user_name: profile?.full_name || email.split('@')[0],
            user_email: email,
            reset_link: linkData.properties.action_link,
            action_url: linkData.properties.action_link,
            expiry_time: '24 giờ',
        })
        return { success: true }
    } catch (error: any) {
        console.error('[sendPasswordResetEmail] Error:', error)
        return { success: false, error: 'Không thể gửi email khởi tạo lại mật khẩu' }
    }
}

/**
 * Compile and send Daily Attendance Report to administrators
 */
export async function sendDailyAttendanceReport() {
    try {
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        // 1. Lấy danh sách admin
        const { data: adminRoles } = await adminClient.from('roles').select('id').eq('name', 'admin')
        const adminRoleIds = adminRoles?.map(r => r.id) || []

        const { data: adminProfiles } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .or(`role.eq.admin,role_id.in.(${adminRoleIds.join(',')})`)
            .eq('status', 'active')

        const adminEmails = adminProfiles?.map(a => a.email).filter(Boolean) as string[]
        if (!adminEmails || adminEmails.length === 0) return { success: false, error: 'Không có admin để gửi' }

        // 2. Tóm tắt thông số cho "Hôm nay"
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        const displayDateStr = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

        // Tổng nhân sự
        const { count: totalEmp } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active')

        // Điểm danh hôm nay
        const { data: logs } = await adminClient.from('attendance_logs').select('status').eq('work_date', todayStr)
        const onTime = logs?.filter(l => l.status === 'on_time').length || 0
        const late = logs?.filter(l => l.status === 'late').length || 0

        // Xin nghỉ
        const { data: leaves } = await adminClient.from('leave_requests').select('id').eq('leave_date', todayStr).eq('status', 'approved')
        const onLeave = leaves?.length || 0

        // Vắng không phép
        const sumTracked = onTime + late + onLeave
        const absent = Math.max(0, (totalEmp || 0) - sumTracked)

        // 3. Gửi email
        await EmailService.sendAsync('daily-attendance-report', adminEmails, {
            report_date: displayDateStr,
            on_time_count: String(onTime),
            late_count: String(late),
            absent_count: String(absent),
            on_leave_count: String(onLeave),
        })

        console.info(`[Cron] Gửi Daily Report (${displayDateStr}) cho ${adminEmails.length} admin.`)
        return { success: true }
    } catch (error: any) {
        console.error('[sendDailyAttendanceReport] Error:', error)
        return { success: false, error: error.message }
    }
}

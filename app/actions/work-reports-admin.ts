'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/app/actions/notifications'
import { getWorkSettings } from '@/app/actions/settings'
import { WorkReport } from './work-reports'
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    getDay,
    isSameDay,
    parseISO
} from 'date-fns'

// New admin actions with notifications

export async function approveReport(reportId: string, note?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Unauthorized' }
    }

    // Get report to find owner
    const { data: report } = await supabase
        .from('work_reports')
        .select('user_id')
        .eq('id', reportId)
        .single()

    if (!report) {
        return { success: false, message: 'Report not found' }
    }

    // Update report status
    const { error } = await supabase
        .from('work_reports')
        .update({
            status: 'approved',
            reviewer_note: note || null
        })
        .eq('id', reportId)

    if (error) {
        console.error('Approve report error:', error)
        return { success: false, message: 'Không thể phê duyệt báo cáo' }
    }

    // Create notification for user
    const { sendNotification } = await import('@/app/actions/notification-system')
    await sendNotification({
        userId: report.user_id,
        type: 'report_approved',
        title: 'Báo cáo đã được phê duyệt',
        message: note || 'Báo cáo của bạn đã được phê duyệt',
        reportId: reportId,
        priority: 'high'
    })

    revalidatePath('/reports')
    revalidatePath('/admin/reports')
    return { success: true, message: 'Đã phê duyệt báo cáo' }
}

export async function requestReportChanges(reportId: string, note: string) {
    console.log('🔍 requestReportChanges called:', { reportId, noteLength: note?.length })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('❌ No user found')
        return { success: false, message: 'Unauthorized' }
    }

    if (!note || !note.trim()) {
        console.error('❌ Empty note')
        return { success: false, message: 'Vui lòng nhập nội dung yêu cầu chỉnh sửa' }
    }

    // Get report to find owner
    const { data: report, error: fetchError } = await supabase
        .from('work_reports')
        .select('user_id')
        .eq('id', reportId)
        .single()

    if (fetchError) {
        console.error('❌ Fetch report error:', fetchError)
        return { success: false, message: 'Không tìm thấy báo cáo' }
    }

    if (!report) {
        console.error('❌ Report not found')
        return { success: false, message: 'Report not found' }
    }

    console.log('✅ Report found! Target user_id:', report.user_id)
    console.log('Will send notification to user_id:', report.user_id)

    // Update report status
    const { error } = await supabase
        .from('work_reports')
        .update({
            status: 'changes_requested',
            reviewer_note: note,
            is_resubmitted: false, // Reset because it's now needing a NEW resubmit
            admin_viewed: true     // Admin just did this action
        })
        .eq('id', reportId)

    if (error) {
        console.error('❌ Update status error:', error)
        // Return detailed error for debugging
        return {
            success: false,
            message: `Không thể gửi yêu cầu chỉnh sửa: ${error.message || JSON.stringify(error)}`
        }
    }

    // Create notification for user using helper function
    const { sendNotification } = await import('@/app/actions/notification-system')
    console.log('🔔 Sending notification to:', report.user_id)

    await sendNotification({
        userId: report.user_id,
        type: 'report_changes_requested',
        title: 'Yêu cầu chỉnh sửa báo cáo',
        message: note || 'Vui lòng chỉnh sửa báo cáo',
        reportId: reportId,
        priority: 'high'
    })

    revalidatePath('/reports')
    revalidatePath('/admin/reports')

    return { success: true, message: 'Đã gửi yêu cầu chỉnh sửa.' }
}

export async function addReportFeedback(reportId: string, note: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Unauthorized' }
    }

    if (!note || !note.trim()) {
        return { success: false, message: 'Vui lòng nhập nội dung góp ý' }
    }

    // Get report to find owner
    const { data: report } = await supabase
        .from('work_reports')
        .select('user_id, reviewer_note')
        .eq('id', reportId)
        .single()

    if (!report) {
        return { success: false, message: 'Report not found' }
    }

    // Update reviewer note (append or replace)
    const updatedNote = report.reviewer_note
        ? `${report.reviewer_note}\n---\n${note}`
        : note

    const { error } = await supabase
        .from('work_reports')
        .update({
            reviewer_note: updatedNote,
            status: 'reviewed' // Mark as reviewed when feedback is added
        })
        .eq('id', reportId)

    if (error) {
        console.error('Add feedback error:', error)
        return { success: false, message: 'Không thể gửi góp ý' }
    }

    // Create notification for user
    const { sendNotification } = await import('@/app/actions/notification-system')
    await sendNotification({
        userId: report.user_id,
        type: 'report_feedback',
        title: 'Góp ý mới cho báo cáo',
        message: note,
        reportId: reportId
    })

    revalidatePath('/reports')
    revalidatePath('/admin/reports')
    return { success: true, message: 'Đã gửi góp ý' }
}

export async function notifyReportUpdated(reportId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get admin users to notify via role relation
    const { data: profiles } = await supabase
        .from('profiles')
        .select(`
            id,
            roles!inner ( name )
        `)

    if (!profiles) return

    // Filter admins client-side to be safe with role names
    const admins = profiles.filter((p: any) => {
        const roleName = p.roles?.name?.toLowerCase()
        return ['admin', 'manager', 'hr_manager'].includes(roleName)
    })

    if (admins.length === 0) return

    // Create notifications for all admins
    const { sendNotification } = await import('@/app/actions/notification-system')

    for (const admin of admins) {
        await sendNotification({
            userId: admin.id,
            type: 'report_updated',
            title: 'Báo cáo đã được cập nhật',
            message: `${user.email} đã cập nhật báo cáo`,
            reportId: reportId
        })
    }

    revalidatePath('/admin/reports')
}

export async function getReportById(reportId: string): Promise<WorkReport | null> {
    const supabase = await createClient()

    // Mark as viewed by admin automatically
    await supabase.from('work_reports').update({ admin_viewed: true }).eq('id', reportId)

    const { data: report, error } = await supabase
        .from('work_reports')
        .select(`
            *,
            user:profiles(
                full_name,
                avatar_url,
                email,
                department
            ),
            attachments(
                id,
                name,
                url,
                size,
                type
            ),
            views:report_views(
                viewer_id,
                viewed_at,
                viewer_name,
                viewer_avatar
            )
        `)
        .eq('id', reportId)
        .single()

    if (error || !report) {
        console.error('Error fetching report:', error)
        return null
    }

    // Map next_plan based on type for consistent display
    const mappedReport = {
        ...report,
        next_plan: report.report_type === 'daily' ? report.next_day_plan :
            report.report_type === 'weekly' ? report.next_week_plan :
                report.report_type === 'monthly' ? report.next_month_plan : report.next_plan
    }

    return mappedReport as unknown as WorkReport
}

export async function getEmployeeReportAnalytics(userId: string, month: number, year: number) {
    const supabase = await createClient()

    // 1. Get Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, employee_code, job_title, department')
        .eq('id', userId)
        .single()

    if (!profile) return null

    // 2. Get Work Settings for off days
    const settings = await getWorkSettings()
    const workOffDays = settings.work_off_days || [0, 6] // Default Sat, Sun

    // 3. Define Date Range
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(startDate)
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // 4. Fetch All Reports for this month
    const { data: reports } = await supabase
        .from('work_reports')
        .select('*')
        .eq('user_id', userId)
        .gte('report_date', format(startDate, 'yyyy-MM-dd'))
        .lte('report_date', format(endDate, 'yyyy-MM-dd'))

    // 5. Categorize and Calculate
    let totalRequired = 0
    let submittedCount = 0
    let onTimeCount = 0
    let lateCount = 0

    const submissionLog = daysInMonth.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayOfWeek = getDay(date)
        const isOffDay = workOffDays.includes(dayOfWeek)

        if (!isOffDay) totalRequired++

        const report = reports?.find((r: any) => r.report_date === dateStr)

        let status: 'on-time' | 'late' | 'missing' | 'off-day' = 'missing'
        let time: string | null = null

        if (isOffDay) {
            status = 'off-day'
        } else if (report) {
            submittedCount++
            const createdDate = new Date(report.created_at)
            // Logic: Submitted on the same day as report_date is on-time
            // Since report_date is YYYY-MM-DD, we compare with created_at date part
            const createdDateStr = format(createdDate, 'yyyy-MM-dd')

            if (createdDateStr <= dateStr) {
                status = 'on-time'
                onTimeCount++
            } else {
                status = 'late'
                lateCount++
            }
            time = format(createdDate, 'HH:mm')
        }

        return {
            date: dateStr,
            day: date.getDate(),
            status,
            time,
            reportId: report?.id || null
        }
    })

    return {
        profile,
        stats: {
            totalRequired,
            submitted: submittedCount,
            onTime: onTimeCount,
            late: lateCount,
            onTimeRate: totalRequired > 0 ? Math.round((onTimeCount / totalRequired) * 100) : 0
        },
        submissionLog,
        reports: reports?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
    }
}

export async function getGlobalReportExport(month: number, year: number) {
    const supabase = await createClient()

    // 1. Get all active profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, employee_code, department')
        .eq('status', 'active')

    if (!profiles) return []

    // 2. Get Work Settings
    const settings = await getWorkSettings()
    const workOffDays = settings.work_off_days || [0, 6]

    // 3. Define Date Range
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(startDate)
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // Total working days in month
    let totalRequired = 0
    daysInMonth.forEach(date => {
        if (!workOffDays.includes(getDay(date))) totalRequired++
    })

    // 4. Fetch All Reports for this month for all users
    const { data: allReports } = await supabase
        .from('work_reports')
        .select('user_id, report_type, report_date, created_at')
        .gte('report_date', format(startDate, 'yyyy-MM-dd'))
        .lte('report_date', format(endDate, 'yyyy-MM-dd'))

    // 5. Aggregate data per user
    const exportData = profiles.map(profile => {
        const userReports = allReports?.filter(r => r.user_id === profile.id) || []

        const dailyCount = userReports.filter(r => r.report_type === 'daily' || r.report_type === 'makeup').length
        const weeklyCount = userReports.filter(r => r.report_type === 'weekly').length
        const monthlyCount = userReports.filter(r => r.report_type === 'monthly').length

        // Calculate on-time count (Daily only for rate?) 
        // User asked for "Tỉ lệ báo cáo đúng hạn", let's calculate based on daily reports
        const dailyReports = userReports.filter(r => r.report_type === 'daily')
        let onTimeCount = 0
        dailyReports.forEach(r => {
            const createdDateStr = format(new Date(r.created_at), 'yyyy-MM-dd')
            if (createdDateStr <= r.report_date) onTimeCount++
        })

        const onTimeRate = totalRequired > 0 ? Math.round((onTimeCount / totalRequired) * 100) : 0

        return {
            'Tháng': `${month}/${year}`,
            'Mã nhân viên': profile.employee_code,
            'Họ và tên': profile.full_name,
            'Phòng ban': profile.department || '',
            'Số báo cáo phải nộp': totalRequired,
            'Báo cáo ngày': dailyCount,
            'Báo cáo tuần': weeklyCount,
            'Báo cáo tháng': monthlyCount,
            'Tỉ lệ đúng hạn (%)': `${onTimeRate}%`
        }
    })

    return exportData
}

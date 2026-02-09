'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getWorkSettings } from '@/app/actions/settings'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'

/*
SQL FOR VIEW TRACKING (RUN IN SUPABASE SQL EDITOR):
CREATE TABLE IF NOT EXISTS public.report_views (
    report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (report_id, viewer_id)
);
ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View counts are public" ON public.report_views FOR SELECT USING (true);
CREATE POLICY "Users can track view" ON public.report_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
*/

export interface WorkReportView {
    viewer_id: string
    viewed_at: string
    viewer_name: string
    viewer_avatar: string | null
}

export interface WorkReport {
    id: string
    user_id: string
    content: string
    report_date: string
    report_type: 'daily' | 'weekly' | 'monthly'
    is_makeup?: boolean
    is_resubmitted?: boolean // User has submitted again after changes requested
    admin_viewed?: boolean  // Admin has viewed the latest update
    status: 'draft' | 'submitted' | 'approved' | 'reviewed' | 'changes_requested' | 'rejected'
    reviewer_note?: string
    next_plan?: string
    next_day_plan?: string
    next_week_plan?: string
    next_month_plan?: string
    attachments: Attachment[]
    created_at: string
    updated_at: string
    user?: {
        full_name: string
        avatar_url: string | null
    }
    views?: WorkReportView[]
}

export interface Attachment {
    name: string
    url: string
    type: string
    size: number
}

export async function submitReport(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Unauthorized' }
    }

    const content = formData.get('content') as string
    const next_plan = formData.get('next_plan') as string
    const report_date = formData.get('report_date') as string
    const report_type = formData.get('report_type') as string
    const attachmentsJson = formData.get('attachments') as string

    if (!content || !report_date || !report_type) {
        return { success: false, message: 'Missing required fields' }
    }

    let attachments: Attachment[] = []
    try {
        if (attachmentsJson) {
            attachments = JSON.parse(attachmentsJson)
        }
    } catch (e) {
        console.error('Error parsing attachments', e)
    }

    // Check for existing report based on type and cycle
    let query = supabase
        .from('work_reports')
        .select('id')
        .eq('user_id', user.id)

    if (report_type === 'daily' || report_type === 'makeup') {
        // Daily and Makeup are mutually exclusive for the same date
        query = query
            .in('report_type', ['daily', 'makeup'])
            .eq('report_date', report_date)
    } else if (report_type === 'weekly') {
        const date = parseISO(report_date)
        const start = startOfWeek(date, { weekStartsOn: 1 }).toISOString()
        const end = endOfWeek(date, { weekStartsOn: 1 }).toISOString()
        query = query
            .eq('report_type', 'weekly')
            .gte('report_date', start)
            .lte('report_date', end)
    } else if (report_type === 'monthly') {
        const date = parseISO(report_date)
        const start = startOfMonth(date).toISOString()
        const end = endOfMonth(date).toISOString()
        query = query
            .eq('report_type', 'monthly')
            .gte('report_date', start)
            .lte('report_date', end)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) {
        return { success: false, message: 'DUPLICATE_DATE' }
    }



    // Prepare insert data with correct plan column mapping
    const insertData: any = {
        user_id: user.id,
        content,
        report_date,
        report_type,
        attachments,
        status: 'submitted'
    }

    // Map next_plan to correct column based on report_type
    if (next_plan) {
        if (report_type === 'daily') {
            insertData.next_day_plan = next_plan
        } else if (report_type === 'weekly') {
            insertData.next_week_plan = next_plan
        } else if (report_type === 'monthly') {
            insertData.next_month_plan = next_plan
        }
    }

    const { error } = await supabase.from('work_reports').insert(insertData)

    if (error) {
        console.error('Submit report error:', error)
        return { success: false, message: 'Failed to submit report' }
    }

    revalidatePath('/reports')
    revalidatePath('/admin/reports')
    return { success: true }
}

export async function updateReportStatus(
    reportId: string,
    status: WorkReport['status'],
    note?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, message: 'Unauthorized' }

    // Verify admin/manager role
    const updateData: any = { status }
    if (note !== undefined) {
        updateData.reviewer_note = note
    }

    const { error } = await supabase
        .from('work_reports')
        .update(updateData)
        .eq('id', reportId)

    if (error) {
        console.error('Update report status error:', error)
        return { success: false, message: 'Failed to update report status' }
    }

    revalidatePath('/reports')
    revalidatePath('/admin/reports') // Revalidate list
    revalidatePath(`/admin/reports/${reportId}`) // Revalidate detail if page exists

    return { success: true }
}

export async function getMyReports(page = 1, limit = 10) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { reports: [], total: 0 }

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Get total count
    const { count } = await supabase
        .from('work_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    // Get data with view tracking
    const { data, error } = await supabase
        .from('work_reports')
        .select(`
            *,
            report_views (
                viewer_id, 
                viewed_at, 
                profiles:viewer_id (full_name, avatar_url)
            )
        `)
        .eq('user_id', user.id)
        .order('report_date', { ascending: false })
        .range(from, to)

    if (error) {
        console.error('Get my reports error:', error)
        // Fallback to empty if table doesn't exist yet (to prevent full crash before migration)
        return { reports: [], total: 0 }
    }

    // Transform data to match interface
    const reports = data.map((item: any) => ({
        ...item,
        views: item.report_views?.map((v: any) => ({
            viewer_id: v.viewer_id,
            viewed_at: v.viewed_at,
            viewer_name: v.profiles?.full_name || 'Người dùng',
            viewer_avatar: v.profiles?.avatar_url || null
        })) || []
    }))

    return { reports, total: count || 0 }
}

export async function markReportAsViewed(reportId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false }

    // 1. Update views tracking table
    const { error: viewError } = await supabase
        .from('report_views')
        .upsert({
            report_id: reportId,
            viewer_id: user.id,
            viewed_at: new Date().toISOString()
        }, { onConflict: 'report_id, viewer_id' })

    if (viewError) {
        console.error('Mark viewed error:', viewError)
        return { success: false }
    }

    // 2. Update the report's admin_viewed status if the viewer has admin permissions
    // We check if the user is an admin by looking at their profile/role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role_id, role, roles(name)')
        .eq('id', user.id)
        .single()

    const roleName = (profile?.role || (profile?.roles as any)?.name || '').toLowerCase()

    // Any role that is NOT 'member' or is one of the admin types
    const isAdmin = ['admin', 'manager', 'hr_manager', 'hr', 'super_admin', 'accountant'].includes(roleName)

    if (isAdmin) {
        await supabase
            .from('work_reports')
            .update({ admin_viewed: true })
            .eq('id', reportId)
    }

    return { success: true }
}

export async function getReportStats(month: number, year: number) {
    const supabase = await createClient()

    // Monthly range for stats
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // Trends data for the specific month/year
    const trendData = await getDailyReportTrend(undefined, month, year)

    // Calculate aggregated stats from trendData if month/year matches current
    const { count: totalReports } = await supabase
        .from('work_reports')
        .select('*', { count: 'exact', head: true })
        .gte('report_date', startDate)
        .lte('report_date', endDate)

    // Calculate actual rates from reports
    const { data: allReports } = await supabase
        .from('work_reports')
        .select('report_date, created_at')
        .gte('report_date', startDate)
        .lte('report_date', endDate)

    let onTimeCount = 0
    let lateCount = 0

    if (allReports) {
        allReports.forEach(r => {
            const reportDateStr = r.report_date
            const createdAtStr = new Date(r.created_at).toISOString().split('T')[0]
            if (reportDateStr === createdAtStr) {
                onTimeCount++
            } else {
                lateCount++
            }
        })
    }

    const totalCount = (totalReports || 0)
    const onTimeRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0
    const lateRate = totalCount > 0 ? Math.round((lateCount / totalCount) * 100) : 0

    // Calculate Completion Rate: Total Reports / Total Required for that period
    const totalRequired = trendData.reduce((acc: number, curr: any) => acc + (curr.isOffDay ? 0 : (curr.requiredCount || 0)), 0)
    const completionRate = totalRequired > 0 ? Math.round((totalCount / totalRequired) * 100) : 0

    return {
        totalReports: totalCount,
        completionRate: Math.min(100, completionRate),
        onTimeRate,
        lateRate,
        dailyTrend: trendData
    }
}

export async function getDailyReportTrend(daysBack = 30, month?: number, year?: number) {
    const supabase = await createClient()
    const settings = await getWorkSettings()
    const workOffDays = settings.work_off_days || [6, 0]

    // 1. Get all active employees
    const { data: employees } = await supabase
        .from('profiles')
        .select('id, start_date, status')
        .eq('status', 'active')

    if (!employees) return []

    // 2. Setup date range 
    const dates: string[] = []
    if (month && year) {
        // Full month range
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(`${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`)
        }
    } else {
        // Last N days
        const now = new Date()
        for (let i = daysBack; i > 0; i--) {
            const d = new Date()
            d.setUTCDate(now.getUTCDate() - i)
            dates.push(d.toISOString().split('T')[0])
        }
    }

    const startStr = dates[0]
    const endStr = dates[dates.length - 1]

    // 3. Fetch reports in range
    const { data: reports } = await supabase
        .from('work_reports')
        .select('user_id, report_date, created_at, report_type')
        .gte('report_date', startStr)
        .lte('report_date', endStr)

    // 4. Fetch leaves in range
    const { data: leaves } = await supabase
        .from('leave_requests')
        .select('user_id, start_date, end_date')
        .eq('status', 'approved')
        .lte('start_date', endStr)
        .gte('end_date', startStr)

    // 5. Build daily stats
    const todayStr = new Date().toISOString().split('T')[0]
    const trend = dates.map(dateStr => {
        const dateObj = new Date(dateStr)
        const dayOfWeek = dateObj.getUTCDay()
        const isOffDay = workOffDays.includes(dayOfWeek)
        const isFuture = dateStr > todayStr
        if (isOffDay || isFuture) {
            return {
                day: parseInt(dateStr.split('-')[2]),
                onTime: 0,
                late: 0,
                missing: 0,
                isOffDay,
                isFuture,
                requiredCount: 0,
                date: dateStr
            }
        }

        // Count employees who should report today
        const eligibleEmployees = employees.filter(emp => {
            if (!emp.start_date) return true
            const startStr = emp.start_date.split('T')[0]
            return dateStr >= startStr
        })

        // Filter out employees on leave
        const employeesOnLeave = leaves?.filter(l => {
            const start = l.start_date.split('T')[0]
            const end = l.end_date.split('T')[0]
            return dateStr >= start && dateStr <= end
        }).map(l => l.user_id) || []

        const requiredCount = eligibleEmployees.filter(e => !employeesOnLeave.includes(e.id)).length

        // Analyze reports for this date
        const reportsForDate = reports?.filter(r => r.report_date === dateStr) || []

        let onTime = 0
        let late = 0
        const usersReported = new Set()

        reportsForDate.forEach(r => {
            usersReported.add(r.user_id)
            const createdAtStr = new Date(r.created_at).toISOString().split('T')[0]
            if (createdAtStr === dateStr) {
                onTime++
            } else {
                late++
            }
        })

        const missing = Math.max(0, requiredCount - usersReported.size)

        return {
            day: parseInt(dateStr.split('-')[2]),
            onTime,
            late,
            missing,
            requiredCount,
            date: dateStr
        }
    })

    return trend
}

interface ReportFilters {
    month: number
    year: number
    status?: string
    type?: string
}

export async function getAllReports(page = 1, limit = 20, filters?: ReportFilters) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { reports: [], total: 0 }

    let query = supabase
        .from('work_reports')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url, email, department),
            report_views (
                viewer_id, 
                viewed_at, 
                profiles:viewer_id (full_name, avatar_url)
            )
        `, { count: 'exact' })
        .order('admin_viewed', { ascending: true }) // false (unread) comes before true (read)
        .order('created_at', { ascending: false }) // then newest first

    if (filters?.month && filters?.year) {
        const startDate = `${filters.year}-${filters.month.toString().padStart(2, '0')}-01`
        const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
        query = query.gte('report_date', startDate).lte('report_date', endDate)
    }

    if (filters?.status) {
        switch (filters.status) {
            case 'unread':
                query = query.eq('admin_viewed', false)
                break
            case 'updated':
                query = query.eq('is_resubmitted', true)
                break
            case 'viewed':
                query = query.eq('admin_viewed', true).eq('is_resubmitted', false)
                break
            default:
                query = query.eq('status', filters.status)
        }
    }

    if (filters?.type) {
        query = query.eq('report_type', filters.type)
    }

    // Pagination
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) {
        console.error('Get all reports error:', error)
        return { reports: [], total: 0 }
    }

    // Transform
    const reports = data.map((item: any) => ({
        ...item,
        user: item.profiles,
        views: item.report_views?.map((v: any) => ({
            viewer_id: v.viewer_id,
            viewed_at: v.viewed_at,
            viewer_name: v.profiles?.full_name || 'Người dùng',
            viewer_avatar: v.profiles?.avatar_url || null
        })) || []
    }))

    return { reports, total: count || 0 }
}

export async function getMissingReports(userId: string, daysBack = 30) {
    const supabase = await createClient()

    // 0. Get Admin Settings for working days
    const settings = await getWorkSettings()
    const nonWorkingDays = settings.work_off_days || [] // e.g. [0, 6] for Sun, Sat

    // 1. Calculate date range keys (UTC)
    const now = new Date()

    // endDate = yesterday
    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1))

    // startDate = daysBack ago
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysBack))

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // 2. Fetch existing reports in range
    const { data: existingReports } = await supabase
        .from('work_reports')
        .select('report_date')
        .eq('user_id', userId)
        .gte('report_date', startStr)
        .lte('report_date', endStr)

    const reportedDates = new Set(existingReports?.map(r => r.report_date) || [])

    // 3. Fetch approved leaves overlapping with range
    const { data: leaves } = await supabase
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', endStr)
        .gte('end_date', startStr)

    // 4. Generate missing dates
    const missingDates: string[] = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayOfWeek = currentDate.getUTCDay() // 0-6, corresponds to dateStr because currentDate is UTC 00:00

        // Skip non-working days (from Admin Settings)
        if (nonWorkingDays.includes(dayOfWeek)) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
            continue
        }

        // Check if report exists
        if (reportedDates.has(dateStr)) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
            continue
        }

        // Check if on leave
        const isOnLeave = leaves?.some(leave => {
            // Normalize DB dates to YYYY-MM-DD
            const startStr = leave.start_date.split('T')[0]
            const endStr = leave.end_date.split('T')[0]

            return dateStr >= startStr && dateStr <= endStr
        })

        if (isOnLeave) {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
            continue
        }

        missingDates.push(dateStr)
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    // Sort descending (newest missing first)
    return missingDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
}

export async function updateReportContent(reportId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: 'Unauthorized' }
    }

    const content = formData.get('content') as string
    const next_plan = formData.get('next_plan') as string
    const attachmentsJson = formData.get('attachments') as string

    if (!content) {
        return { success: false, message: 'Missing required fields' }
    }

    let attachments: Attachment[] = []
    try {
        if (attachmentsJson) {
            attachments = JSON.parse(attachmentsJson)
        }
    } catch (e) {
        console.error('Error parsing attachments', e)
    }

    const { data: currentReport } = await supabase
        .from('work_reports')
        .select('status, user_id, report_type')
        .eq('id', reportId)
        .single()

    if (!currentReport) return { success: false, message: 'Report not found' }
    if (currentReport.user_id !== user.id) return { success: false, message: 'Unauthorized' }

    if (currentReport.status === 'approved') {
        return { success: false, message: 'Cannot edit approved reports' }
    }

    // Prepare update data
    const report_type = formData.get('report_type') as string

    console.log(`Updating report ${reportId}. Type: ${report_type}, NextPlan: ${next_plan?.substring(0, 20)}...`)

    const updateData: any = {
        content,
        attachments,
        updated_at: new Date().toISOString(),
        status: 'submitted',
        reviewer_note: null, // Clear old change request
        is_resubmitted: true, // Mark as resubmitted
        admin_viewed: false   // Mark as unread for admin
    }

    // Handle report type change if provided
    const targetType = report_type || currentReport.report_type
    if (report_type) {
        updateData.report_type = report_type
    }

    // Reset all plan columns first to ensure clean state if type changes
    // Only reset if we are provided a new plan (which implies a full update)
    if (next_plan !== undefined) {
        updateData.next_day_plan = null
        updateData.next_week_plan = null
        updateData.next_month_plan = null
        updateData.next_plan = null // Clear generic fallback too

        if (targetType === 'daily') {
            updateData.next_day_plan = next_plan
        } else if (targetType === 'weekly') {
            updateData.next_week_plan = next_plan
        } else if (targetType === 'monthly') {
            updateData.next_month_plan = next_plan
        } else {
            // Makeup or other
            updateData.next_plan = next_plan
        }
    }

    const { data: updatedData, error } = await supabase
        .from('work_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single()

    if (error) {
        console.error('Update report content error:', error)
        return { success: false, message: `Lỗi Database: ${error.message}` }
    }

    if (!updatedData) {
        console.error('Update failed: 0 rows affected for ID', reportId)
        return { success: false, message: 'Không thể cập nhật báo cáo (Không tìm thấy bản ghi hoặc không có quyền)' }
    }

    console.log('Successfully updated report:', updatedData.id, 'New Status:', updatedData.status)

    // Notify admins that report has been updated
    const { notifyReportUpdated } = await import('@/app/actions/work-reports-admin')
    await notifyReportUpdated(reportId)

    revalidatePath('/reports')
    revalidatePath('/admin/reports')
    return { success: true }
}

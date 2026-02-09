'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'APPROVE'
    | 'REJECT'
    | 'LOGIN'
    | 'LOGOUT'
    | 'ASSIGN_ROLE'
    | 'REVOKE_ROLE'
    | 'EXPORT'

export type ResourceType =
    | 'user'
    | 'role'
    | 'setting'
    | 'approval'
    | 'leave_request'
    | 'attendance'
    | 'schedule'
    | 'shift'

export interface AuditLogEntry {
    id: string
    user_id: string | null
    user_email: string | null
    user_name: string | null
    user_role: string | null
    action: string
    resource_type: string
    resource_id: string | null
    description: string | null
    old_values: any
    new_values: any
    ip_address: string | null
    user_agent: string | null
    status: string
    created_at: string
}

/**
 * Create an audit log entry
 * Automatically captures user info, IP, and user agent
 */
export async function createAuditLog({
    action,
    resourceType,
    resourceId,
    description,
    oldValues,
    newValues
}: {
    action: AuditAction
    resourceType: ResourceType
    resourceId?: string
    description?: string
    oldValues?: any
    newValues?: any
}): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const headersList = await headers()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Get IP and User Agent
        const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim()
            || headersList.get('x-real-ip')
            || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        // Call the database function
        const { data, error } = await supabase.rpc('create_audit_log', {
            p_user_id: user.id,
            p_action: action,
            p_resource_type: resourceType,
            p_resource_id: resourceId || null,
            p_description: description || null,
            p_old_values: oldValues ? JSON.stringify(oldValues) : null,
            p_new_values: newValues ? JSON.stringify(newValues) : null,
            p_ip_address: ip,
            p_user_agent: userAgent
        })

        if (error) {
            console.error('Failed to create audit log:', error)
            return { success: false, error: error.message }
        }

        return { success: true, logId: data }
    } catch (error) {
        console.error('Audit log error:', error)
        return { success: false, error: 'Failed to create audit log' }
    }
}

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs({
    page = 1,
    limit = 50,
    action,
    resourceType,
    userId,
    startDate,
    endDate
}: {
    page?: number
    limit?: number
    action?: string
    resourceType?: string
    userId?: string
    startDate?: string
    endDate?: string
} = {}): Promise<{ logs: AuditLogEntry[]; total: number; error?: string }> {
    try {
        const supabase = await createClient()

        // Build query
        let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Apply filters
        if (action) {
            query = query.eq('action', action)
        }
        if (resourceType) {
            query = query.eq('resource_type', resourceType)
        }
        if (userId) {
            query = query.eq('user_id', userId)
        }
        if (startDate) {
            query = query.gte('created_at', startDate)
        }
        if (endDate) {
            query = query.lte('created_at', endDate)
        }

        // Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Failed to fetch audit logs:', error)
            return { logs: [], total: 0, error: error.message }
        }

        return {
            logs: data || [],
            total: count || 0
        }
    } catch (error) {
        console.error('Audit logs fetch error:', error)
        return { logs: [], total: 0, error: 'Failed to fetch audit logs' }
    }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(): Promise<{
    totalLogs: number
    actionCounts: Record<string, number>
    recentActivity: AuditLogEntry[]
    error?: string
}> {
    try {
        const supabase = await createClient()

        // Get total count
        const { count: totalLogs } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })

        // Get action counts (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: logs } = await supabase
            .from('audit_logs')
            .select('action')
            .gte('created_at', thirtyDaysAgo.toISOString())

        const actionCounts: Record<string, number> = {}
        logs?.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
        })

        // Get recent activity (last 10)
        const { data: recentActivity } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        return {
            totalLogs: totalLogs || 0,
            actionCounts,
            recentActivity: recentActivity || []
        }
    } catch (error) {
        console.error('Audit stats error:', error)
        return {
            totalLogs: 0,
            actionCounts: {},
            recentActivity: [],
            error: 'Failed to fetch audit stats'
        }
    }
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(filters: {
    action?: string
    resourceType?: string
    userId?: string
    startDate?: string
    endDate?: string
}): Promise<{ csv?: string; error?: string }> {
    try {
        // Get all logs matching filters (no pagination)
        const { logs, error } = await getAuditLogs({
            ...filters,
            limit: 10000 // Max export limit
        })

        if (error) {
            return { error }
        }

        // Convert to CSV
        const headers = [
            'Date/Time',
            'User',
            'Role',
            'Action',
            'Resource Type',
            'Resource ID',
            'Description',
            'IP Address',
            'Status'
        ]

        const rows = logs.map(log => [
            new Date(log.created_at).toLocaleString('vi-VN'),
            log.user_name || log.user_email || 'Unknown',
            log.user_role || '-',
            log.action,
            log.resource_type,
            log.resource_id || '-',
            log.description || '-',
            log.ip_address || '-',
            log.status
        ])

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        return { csv }
    } catch (error) {
        console.error('Export audit logs error:', error)
        return { error: 'Failed to export audit logs' }
    }
}

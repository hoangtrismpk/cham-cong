import { createClient } from '@/utils/supabase/server'

// ==========================================
// PERMISSION CONSTANTS
// ==========================================

export const PERMISSIONS = {
    // Dashboard
    DASHBOARD: {
        VIEW: 'dashboard.view',
    },

    // User Management
    USERS: {
        VIEW: 'users.view',
        VIEW_DETAILS: 'users.view_details',
        VIEW_SALARY: 'users.view_salary', // Sensitive
        CREATE: 'users.create',
        EDIT: 'users.edit',
        DELETE: 'users.delete',
    },

    // My Team
    MY_TEAM: {
        VIEW: 'my_team.view',
    },

    // Attendance
    ATTENDANCE: {
        VIEW: 'attendance.view',
        EDIT: 'attendance.edit', // Sensitive
        EXPORT: 'attendance.export',
    },

    // Leaves & Approvals
    LEAVES: {
        VIEW: 'leaves.view',
        CREATE_FOR_OTHERS: 'leaves.create_for_others',
    },
    APPROVALS: {
        VIEW: 'approvals.view',
        APPROVE: 'approvals.approve',
    },

    // Reports
    REPORTS: {
        VIEW: 'reports.view',
        EXPORT: 'reports.export',
    },

    // Notifications / Campaigns
    NOTIFICATIONS: {
        VIEW: 'notifications.view',
        SEND: 'notifications.send',
    },

    // Audit Logs
    AUDIT_LOGS: {
        VIEW: 'audit_logs.view',
        EXPORT: 'audit_logs.export',
    },

    // Email Templates
    EMAIL_TEMPLATES: {
        VIEW: 'email_templates.view',
        EDIT: 'email_templates.edit',
    },

    // System & Settings
    SETTINGS: {
        VIEW: 'settings.view',
        MANAGE: 'settings.manage',
        MANAGE_ORGANIZATION: 'settings_organization.manage',
        MANAGE_SECURITY: 'settings_security.manage',
        MANAGE_NOTIFICATIONS: 'settings_notifications.manage',
        MANAGE_EMAIL: 'settings_email.manage',
        MANAGE_FEATURE_TOGGLES: 'settings_feature_toggles.manage',
        MANAGE_INTEGRATIONS: 'settings_integrations.manage',
    },
    ROLES: {
        VIEW: 'roles.view',
        MANAGE: 'roles.manage',
    },
} as const


// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if current user has a specific permission
 * @param permission - The permission to check (e.g., PERMISSIONS.USERS.VIEW)
 * @returns boolean - True if user has the permission
 */
export async function checkPermission(permission: string): Promise<boolean> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Get user's role and permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role,
            role_id,
            roles (
                name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    // 1. Super Admin Bypass (Check both legacy role column and new role relation)
    if (profile?.role === 'admin' || (profile?.roles as any)?.name === 'admin') {
        return true
    }

    if (!profile?.roles) return false

    const roles = profile.roles as any
    const permissions = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || []

    // 2. Wildcard Check
    if (permissions.includes('*')) return true

    // 3. Exact Match
    if (permissions.includes(permission)) return true

    // 4. Resource Wildcard (e.g., "users.*" grants "users.view")
    const [resource] = permission.split('.')
    if (permissions.includes(`${resource}.*`)) return true

    return false
}

/**
 * Check multiple permissions at once
 * @param requiredPermissions - Array of permissions to check
 * @param requireAll - If true, all permissions must be granted. If false, any one is sufficient.
 * @returns boolean
 */
export async function checkPermissions(
    requiredPermissions: string[],
    requireAll: boolean = true
): Promise<boolean> {
    // Optimization: Check parallelly? No, checkPermission has DB call.
    // Ideally we should fetch perms once and check in memory.

    // Optimized version: Fetch perms ONCE
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role,
            role_id,
            roles (
                name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    // Super Admin
    if (profile?.role === 'admin' || (profile?.roles as any)?.name === 'admin') return true

    const roles = profile?.roles as any
    const userPermissions = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || [] as string[]

    // Check logic
    if (userPermissions.includes('*')) return true

    const hasPermission = (perm: string) => {
        if (userPermissions.includes(perm)) return true
        const [resource] = perm.split('.')
        if (userPermissions.includes(`${resource}.*`)) return true
        return false
    }

    if (requireAll) {
        return requiredPermissions.every(p => hasPermission(p))
    } else {
        return requiredPermissions.some(p => hasPermission(p))
    }
}

/**
 * Require a permission for a Server Action.
 * Returns null if authorized, or an error object if denied.
 * Usage in Server Actions:
 *   const denied = await requirePermissionForAction('users.edit')
 *   if (denied) return denied
 */
export async function requirePermissionForAction(permission: string): Promise<{ error: string } | null> {
    const hasAccess = await checkPermission(permission)
    if (!hasAccess) {
        return { error: 'Permission denied: You do not have the required permission to perform this action.' }
    }
    return null
}

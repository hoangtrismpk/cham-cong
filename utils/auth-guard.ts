import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function checkPermission(requiredPermission: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // Fetch user profile with roles
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role, 
            roles (
                name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    if (!profile) return false

    // 1. Check Super Admin Role
    // 'admin' string in profile.role is legacy but we keep it compatible
    if (profile.role === 'admin') return true

    const roles = profile.roles as any
    // Some setups return an array, some return object. Robust check:
    const roleData = Array.isArray(roles) ? roles[0] : roles

    if (roleData?.name === 'admin') return true

    // 2. Check Specific Permissions
    const permissions = roleData?.permissions || []

    // Wildcard check
    if (permissions.includes('*')) return true

    // Resource wildcard check (e.g. 'users.*' covers 'users.view' and 'users.create')
    const [resource] = requiredPermission.split('.')
    if (permissions.includes(`${resource}.*`)) return true

    // Exact match
    return permissions.includes(requiredPermission)
}

/**
 * Requires a permission to access the page.
 * If user is not logged in -> Redirect to /login
 * If user is logged in but no permission -> Redirect to / (or /admin if fallback provided)
 */
export async function requirePermission(requiredPermission: string, fallbackUrl: string = '/') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const hasAccess = await checkPermission(requiredPermission)

    if (!hasAccess) {
        console.warn(`[AuthGuard] User ${user.email} denied access to ${requiredPermission}`)
        redirect(fallbackUrl)
    }
}

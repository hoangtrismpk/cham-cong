import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Admin Route Protection Middleware
 * Kiểm tra authentication và permissions cho các route admin
 */
export async function middleware(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Redirect to login if not authenticated
    if (!user) {
        const url = new URL('/auth/login', request.url)
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Get user's role and permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role_id,
            roles (
                name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    if (!profile?.roles) {
        // No role assigned - redirect to unauthorized
        return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    const roles = profile.roles as any
    const permissions = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || []
    const pathname = request.nextUrl.pathname

    // Admin has wildcard - allow everything
    if (permissions.includes('*')) {
        return NextResponse.next()
    }

    // Map routes to required permissions
    const routePermissions: Record<string, string[]> = {
        '/admin/settings/roles': ['roles.view'],
        '/admin/settings': ['settings.view'],
        '/admin/employees': ['users.view'],
        '/admin/approvals': ['approvals.view'],
        '/admin/audit-logs': ['settings.view'],
        '/admin/attendance': ['attendance.view'],
        '/admin/reports': ['reports.view'],
        '/admin': ['dashboard.view'],
    }

    // Check if user has required permission for this route
    // Sort by length desc to ensure specific routes like /admin/settings/roles are checked before /admin/settings
    const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);

    for (const route of sortedRoutes) {
        if (pathname === route || pathname.startsWith(`${route}/`)) {
            const requiredPerms = routePermissions[route];

            const hasPermission = requiredPerms.some(perm => {
                // Check exact match
                if (permissions.includes(perm)) return true

                // Check wildcard (e.g., "users.*" grants "users.view")
                const [resource] = perm.split('.')
                if (permissions.includes(`${resource}.*`)) return true

                return false
            })

            if (!hasPermission) {
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }

            // If matched specific route, stop checking
            break
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/admin/:path*',
    ]
}

import { AdminSidebar } from '@/components/admin-sidebar'
import { createClient } from '@/utils/supabase/server'
import { ClientRedirect } from '@/components/client-redirect'
import { AdminBottomNav } from '@/components/admin-bottom-nav'
import { AdminHeader } from '@/components/admin-header'
import { PermissionProvider } from '@/contexts/permission-context'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <ClientRedirect url="/login?next=/admin" />
    }

    // Check if user has admin access permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            full_name,
            role,
            require_password_change,
            roles (
                name,
                display_name,
                permissions
            )
        `)
        .eq('id', user?.id as string)
        .single()

    if (profile?.require_password_change) {
        return <ClientRedirect url="/force-password" />
    }

    const roles = profile?.roles as any
    const roleData = Array.isArray(roles) ? roles[0] : roles
    const permissions = roleData?.permissions || []

    // Allow if user has 'admin' role OR has ANY permission
    const hasAccess =
        profile?.role === 'admin' ||
        (roleData?.name === 'admin') ||
        permissions.includes('*') ||
        permissions.length > 0

    if (!hasAccess) {
        return <ClientRedirect url="/" />
    }

    return (
        <div className="flex fixed inset-0 z-0 overflow-hidden bg-[#0a0f14] font-display text-slate-200">
            <AdminSidebar
                className="hidden lg:flex"
                preloadedPermissions={permissions}
                preloadedProfile={profile}
            />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <AdminHeader
                    permissions={permissions}
                    profile={profile}
                />
                <main className="flex-1 overflow-y-auto bg-[#0a0f14] custom-scrollbar pb-24 lg:pb-0">
                    <PermissionProvider permissions={permissions} roleName={roleData?.name || null}>
                        {children}
                    </PermissionProvider>
                </main>
                <AdminBottomNav />
            </div>
        </div>
    )
}

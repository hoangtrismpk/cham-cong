import { AdminSidebar } from '@/components/admin-sidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AdminBottomNav } from '@/components/admin-bottom-nav'
import { AdminHeader } from '@/components/admin-header'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/admin')
    }

    // Check if user has admin access permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            full_name,
            avatar_url,
            role, 
            roles (
                name,
                display_name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    const roles = profile?.roles as any
    const permissions = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || []

    // Allow if user has 'admin' role OR has 'dashboard.view' permission
    const hasAccess =
        profile?.role === 'admin' ||
        (roles?.name === 'admin') ||
        permissions.includes('*') ||
        permissions.includes('dashboard.view')

    if (!hasAccess) {
        redirect('/')
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
                    {children}
                </main>
                <AdminBottomNav />
            </div>
        </div>
    )
}

import { AdminSidebar } from '@/components/admin-sidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationBell } from '@/components/notification-bell'
import { LanguageSwitcher } from '@/components/language-switcher'

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
            role, 
            roles (
                name,
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
        <div className="flex min-h-screen bg-[#0a0f14] font-display text-slate-200">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 border-b border-[#1e293b] bg-[#0d131a]/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500 text-sm font-medium">Hệ thống quản trị Chấm Công</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <NotificationBell />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-[#0a0f14] custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    )
}

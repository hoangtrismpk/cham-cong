'use client'

import { useI18n } from '@/contexts/i18n-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/auth/actions'

interface DashboardSidebarProps {
    user: any
    onClose?: () => void
}

export function DashboardSidebar({ user, onClose }: DashboardSidebarProps) {
    const { t } = useI18n()
    const pathname = usePathname()

    return (
        <aside className="w-full h-full flex flex-col bg-sidebar border-r border-sidebar-border">
            <div className="p-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                    </div>
                    <h1 className="text-white text-xl font-bold tracking-tight">FHB</h1>
                </div>
                {onClose && (
                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) onClose()
                        }}
                        className="md:hidden text-slate-400"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                )}
            </div>
            <nav className="flex-1 px-4 space-y-1 mt-4">
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/"
                >
                    <span className="material-symbols-outlined">dashboard</span>
                    {t.nav.dashboard}
                </Link>
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/timesheets' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/timesheets"
                >
                    <span className="material-symbols-outlined">history</span>
                    {t.nav.timesheets}
                </Link>
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === '/schedule' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/schedule"
                >
                    <span className="material-symbols-outlined">calendar_month</span>
                    {t.nav.schedule}
                </Link>
                <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all" href="#">
                    <span className="material-symbols-outlined">analytics</span>
                    {t.nav.reports}
                </a>
                <div className="pt-4 pb-2 px-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.nav.account}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <Link
                        onClick={() => {
                            if (window.innerWidth < 768) onClose?.()
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/settings' ? 'text-primary bg-primary/10 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}
                        href="/settings"
                    >
                        <span className="material-symbols-outlined">settings</span>
                        {t.nav.settings}
                    </Link>
                    <form action={signout}>
                        <button className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all">
                            <span className="material-symbols-outlined">logout</span>
                            {t.nav.signOut}
                        </button>
                    </form>
                </div>
            </nav>
            <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-sidebar-border flex items-center justify-center overflow-hidden">
                        {user.user_metadata.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user.user_metadata.full_name || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.user_metadata.department || 'Employee'}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}

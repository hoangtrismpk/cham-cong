'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/contexts/i18n-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import { LanguageSwitcher } from './language-switcher'
import { useSetting } from '@/hooks/use-settings-sync'
import { getMyProfile } from '@/app/actions/profile'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardSidebarProps {
    user: any
    onClose?: () => void
}

export function DashboardSidebar({ user, onClose }: DashboardSidebarProps) {
    const { t } = useI18n()
    const pathname = usePathname()
    const { value: companyName } = useSetting('company_name', 'FHB')
    const [profile, setProfile] = useState<any>(null)
    const [loadingProfile, setLoadingProfile] = useState(true)

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await getMyProfile()
                if (res.profile) {
                    setProfile(res.profile)
                }
            } catch (err) {
                console.error('Sidebar profile load error:', err)
            } finally {
                setLoadingProfile(false)
            }
        }
        loadProfile()
    }, [])

    // Display data priority: Profile Table > Auth Metadata > Props
    const displayName = profile?.full_name || user.user_metadata.full_name || 'User'
    const displayAvatar = profile?.avatar_url || user.user_metadata.avatar_url
    const displayDept = profile?.department || user.user_metadata.department || 'Employee'

    return (
        <aside className="w-full h-full flex flex-col bg-sidebar border-r border-sidebar-border relative">
            {/* Header Section */}
            <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center shadow-lg shadow-primary/10">
                        <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                    </div>
                    <h1 className="text-white text-xl font-black tracking-tight uppercase italic">{String(companyName)}</h1>
                </div>
                {/* Language Switcher moved to new row for Mobile */}
                <div className="md:hidden w-full">
                    <LanguageSwitcher fullWidth />
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${pathname === '/' ? 'text-primary bg-primary/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/"
                >
                    <span className="material-symbols-outlined transition-transform group-hover:scale-110">dashboard</span>
                    {t.nav.dashboard}
                </Link>
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${pathname === '/timesheets' ? 'text-primary bg-primary/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/timesheets"
                >
                    <span className="material-symbols-outlined">history</span>
                    {t.nav.timesheets}
                </Link>
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${pathname === '/schedule' ? 'text-primary bg-primary/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/schedule"
                >
                    <span className="material-symbols-outlined">calendar_month</span>
                    {t.nav.schedule}
                </Link>
                <Link
                    onClick={() => {
                        if (window.innerWidth < 768) onClose?.()
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${pathname === '/reports' ? 'text-primary bg-primary/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    href="/reports"
                >
                    <span className="material-symbols-outlined">analytics</span>
                    {t.nav.reports}
                </Link>

                {/* Admin Access Link */}
                {(() => {
                    if (!profile) return false;
                    const p = profile.permissions || [];
                    const r = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
                    const isAdmin = profile.role === 'admin' || r?.name === 'admin' || p.includes('*');
                    return isAdmin || p.length > 0;
                })() && (
                        <div className="pt-2">
                            <div className="px-4 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/70 italic">Quản trị</p>
                            </div>
                            <Link
                                className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-emerald-400 hover:text-white hover:bg-emerald-500/10 transition-all duration-300 group"
                                href="/admin"
                                onClick={() => {
                                    if (window.innerWidth < 768) onClose?.()
                                }}
                            >
                                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">admin_panel_settings</span>
                                Admin Panel
                            </Link>
                        </div>
                    )}

                <div className="pt-6 pb-2 px-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">Tài khoản</p>
                </div>
                <div className="flex flex-col gap-1">
                    <Link
                        onClick={() => {
                            if (window.innerWidth < 768) onClose?.()
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${pathname === '/settings' ? 'text-primary bg-primary/10 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5 font-bold'}`}
                        href="/settings"
                    >
                        <span className="material-symbols-outlined">settings</span>
                        {t.nav.settings}
                    </Link>
                    <form action={async (formData) => {
                        try {
                            const { messaging, VAPID_KEY, getToken } = await import('@/utils/firebase')
                            const msg = await messaging()
                            if (msg) {
                                const currentToken = await getToken(msg, { vapidKey: VAPID_KEY })
                                if (currentToken) {
                                    formData.append('fcm_token', currentToken)
                                }
                            }
                        } catch (e) {
                            // Ignore Firebase errors 
                        }
                        await signout(formData)
                    }}>
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all font-bold cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-red-400/70">logout</span>
                            {t.nav.signOut}
                        </button>
                    </form>
                </div>
            </nav>

            <div className="p-4 border-t border-sidebar-border bg-sidebar/80 backdrop-blur-md">
                <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-white/5 shadow-inner">
                    {loadingProfile ? (
                        <div className="flex items-center gap-3 w-full">
                            <Skeleton className="size-11 rounded-full bg-slate-800" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24 bg-slate-800" />
                                <Skeleton className="h-3 w-16 bg-slate-800" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`size-11 rounded-full flex items-center justify-center text-white font-black bg-gradient-to-br border-2 border-slate-700 shadow-xl shrink-0 overflow-hidden transition-all duration-500 group-hover:border-primary/50 group-hover:scale-110 group-hover:rotate-3 ${!displayAvatar ? 'from-blue-600 via-indigo-700 to-purple-800' : 'bg-slate-800'}`}>
                                {displayAvatar ? (
                                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white uppercase tracking-tighter text-sm drop-shadow-2xl">
                                        {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-black text-white truncate leading-tight tracking-tight group-hover:text-primary transition-colors">{displayName}</p>
                                <p className="text-[10px] text-slate-500 truncate font-black uppercase tracking-widest mt-1 opacity-70 italic">{displayDept}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    )
}

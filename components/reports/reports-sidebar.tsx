'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getMyProfile } from '@/app/actions/profile'
import { signout } from '@/app/auth/actions'
import { Skeleton } from '@/components/ui/skeleton'
import NotificationBell from '@/components/notifications/notification-bell'

export default function ReportsSidebar() {
    const pathname = usePathname()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await getMyProfile()
                if (res.profile) {
                    setProfile(res.profile)
                }
            } catch (err) {
                console.error('Reports sidebar profile load error:', err)
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [])

    const displayName = profile?.full_name || 'Loading...'
    const displayAvatar = profile?.avatar_url
    const employeeCode = profile?.employee_code || '---'

    return (
        <aside className="w-[240px] bg-[#0d131a] border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
            {/* Logo */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-black text-lg font-black">schedule</span>
                        </div>
                        <div>
                            <h1 className="text-white font-black text-sm tracking-tighter uppercase italic">CHẤM CÔNG</h1>
                            <p className="text-cyan-500 text-[10px] font-black tracking-widest leading-none">SYSTEM V4</p>
                        </div>
                    </div>
                    <NotificationBell />
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar pt-8">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 font-bold"
                >
                    <span className="material-symbols-outlined text-xl">dashboard</span>
                    <span className="text-sm">Tổng quan</span>
                </Link>
                <Link
                    href="/timesheets"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 font-bold"
                >
                    <span className="material-symbols-outlined text-xl">history</span>
                    <span className="text-sm">Bảng chấm công</span>
                </Link>
                <Link
                    href="/schedule"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 font-bold"
                >
                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                    <span className="text-sm">Lịch làm việc</span>
                </Link>
                <Link
                    href="/reports"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold",
                        pathname.startsWith('/reports')
                            ? "bg-cyan-500/10 text-cyan-500 shadow-sm border border-cyan-500/10"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <span className="material-symbols-outlined text-xl">analytics</span>
                    <span className="text-sm">Báo cáo</span>
                </Link>

                {/* Account Section */}
                <div className="pt-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic px-4 mb-4">Tài khoản</p>
                    <div className="space-y-1">
                        <Link
                            href="/settings"
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold",
                                pathname === '/settings'
                                    ? "bg-white/10 text-white font-black"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span className="material-symbols-outlined text-xl">settings</span>
                            <span className="text-sm">Cài đặt</span>
                        </Link>
                        <form action={signout}>
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-bold cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">logout</span>
                                <span className="text-sm">Đăng xuất</span>
                            </button>
                        </form>
                    </div>
                </div>
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-slate-800 bg-sidebar/50 backdrop-blur-md">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 shadow-inner group transition-all duration-500 hover:bg-white/10">
                    {loading ? (
                        <div className="flex items-center gap-3 w-full">
                            <Skeleton className="size-11 rounded-full bg-slate-800" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24 bg-slate-800" />
                                <Skeleton className="h-3 w-16 bg-slate-800" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`size-11 rounded-full flex items-center justify-center text-white font-black bg-gradient-to-br border-2 border-slate-700 shadow-xl shrink-0 overflow-hidden transition-all duration-500 group-hover:border-cyan-500/50 group-hover:scale-110 ${!displayAvatar ? 'from-cyan-600 via-blue-700 to-indigo-800' : 'bg-slate-800'}`}>
                                {displayAvatar ? (
                                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white uppercase tracking-tighter text-sm drop-shadow-2xl">
                                        {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-black truncate leading-tight tracking-tight group-hover:text-cyan-400 transition-colors uppercase italic">{displayName}</p>
                                <p className="text-[10px] text-slate-500 truncate font-black uppercase tracking-widest mt-1 opacity-70">ID: {employeeCode}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    )
}

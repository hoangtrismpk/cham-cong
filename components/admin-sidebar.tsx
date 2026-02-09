'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SystemStatus } from './system-status'
import { signout } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { getMyProfile } from '@/app/actions/profile'
import { getWorkSettings } from '@/app/actions/settings'
import { getPendingStats } from '@/app/actions/approvals'
import { Skeleton } from './ui/skeleton'

export function AdminSidebar() {
    const pathname = usePathname()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [companyName, setCompanyName] = useState('TimeTracker')
    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        async function loadData() {
            try {
                const [profileRes, settingsRes, pendingRes] = await Promise.all([
                    getMyProfile(),
                    getWorkSettings(),
                    getPendingStats()
                ])
                if (profileRes.profile) setProfile(profileRes.profile)
                if (settingsRes?.company_name) setCompanyName(settingsRes.company_name)
                if (pendingRes?.total) setPendingCount(pendingRes.total)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const displayName = profile?.full_name || 'Admin User'
    const displayAvatar = profile?.avatar_url
    const displayRole = (profile?.roles as any)?.display_name || 'Quản trị viên'
    const userPermissions = (profile?.roles as any)?.permissions || []

    // Menu items with required permissions
    const links = [
        { href: '/admin', label: 'Overview', icon: 'dashboard', permission: 'dashboard.view' },
        { href: '/admin/employees', label: 'Employees', icon: 'group', permission: 'users.view' },
        { href: '/admin/my-team', label: 'My Team', icon: 'diversity_3', permission: 'users.view' },
        { href: '/admin/approvals', label: 'Approvals', icon: 'fact_check', permission: 'approvals.view' },
        { href: '/admin/attendance', label: 'Attendance', icon: 'schedule', permission: 'attendance.view' },
        { href: '/admin/reports', label: 'Reports', icon: 'analytics', permission: 'reports.view' },
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'history', permission: 'settings.view' },
        { href: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'settings.view' },
    ]

    // Helper to check if user has permission
    const hasPermission = (permission: string) => {
        // Safe check for null/undefined
        if (!userPermissions) return false

        // Normalize to array if needed (handle both array and single string cases if Supabase returns differently)
        const perms: string[] = Array.isArray(userPermissions) ? userPermissions : []

        if (perms.length === 0) return false
        if (perms.includes('*')) return true
        if (perms.includes(permission)) return true

        const [resource] = permission.split('.')
        if (perms.includes(`${resource}.*`)) return true

        return false
    }

    // Filter links based on permissions
    const visibleLinks = links.filter(link => hasPermission(link.permission))


    return (
        <aside className="w-64 border-r border-[#1e293b] bg-[#0d131a] flex flex-col hidden lg:flex h-screen sticky top-0">
            <div className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">timer</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white">{companyName}</h1>
                </div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">Admin Panel</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {visibleLinks.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                                isActive
                                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <span className={cn(
                                "material-symbols-outlined text-[22px] transition-transform",
                                !isActive && "group-hover:scale-110"
                            )}>{link.icon}</span>
                            <span className="text-sm font-medium flex-1">{link.label}</span>

                            {/* Pending Count Badge for Approvals */}
                            {link.href === '/admin/approvals' && pendingCount > 0 && (
                                <span className="bg-orange-500 text-white text-[10px] font-bold size-5 flex items-center justify-center rounded-full animate-pulse shadow-lg shadow-orange-500/20 leading-none">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    )
                })}
                <form action={signout} className="pt-2">
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 px-3 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium group cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform text-red-400/70">logout</span>
                        <span className="text-sm">Logout</span>
                    </button>
                </form>
            </nav>

            <div className="p-4 mt-auto">
                <SystemStatus />
                <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-white/5 shadow-sm">
                    {loading ? (
                        <div className="flex items-center gap-3 w-full animate-pulse">
                            <div className="size-10 rounded-full bg-slate-800" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-20 bg-slate-800 rounded" />
                                <div className="h-3 w-16 bg-slate-800 rounded" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`size-10 rounded-full flex items-center justify-center text-white font-black bg-gradient-to-br border-2 border-slate-700 shadow-lg shrink-0 overflow-hidden transition-all duration-300 group-hover:border-primary/50 group-hover:scale-110 ${!displayAvatar ? 'from-indigo-600 to-violet-700' : 'bg-slate-800'}`}>
                                {displayAvatar ? (
                                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white uppercase tracking-tighter text-xs">
                                        {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'AD'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{displayName}</p>
                                <p className="text-[10px] text-slate-500 truncate font-black uppercase tracking-widest mt-0.5">{displayRole}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    )
}

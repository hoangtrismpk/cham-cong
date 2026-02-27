'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/i18n-context'

interface AdminBottomNavProps {
    permissions?: string[]
    profile?: any
}

export function AdminBottomNav({ permissions = [], profile }: AdminBottomNavProps) {
    const pathname = usePathname()
    const { t } = useI18n()

    // Helper to check if user has permission (same logic as admin-sidebar)
    const hasPermission = (permission: string) => {
        // Admin role bypasses all checks
        if (profile?.role === 'admin' || (profile?.roles as any)?.name === 'admin') return true

        // Safe check for null/undefined
        if (!permissions) return false

        const perms: string[] = Array.isArray(permissions) ? permissions : []

        if (perms.length === 0) return false
        if (perms.includes('*')) return true
        if (perms.includes(permission)) return true

        const [resource] = permission.split('.')
        if (perms.includes(`${resource}.*`)) return true

        return false
    }

    const allLinks = [
        { href: '/admin', label: t.admin.overview, icon: 'space_dashboard', permission: 'dashboard.view' },
        { href: '/admin/employees', label: t.admin.employees, icon: 'group', permission: 'users.view' },
        { href: '/admin/approvals', label: t.admin.approvals, icon: 'fact_check', permission: 'approvals.view' },
        { href: '/admin/reports', label: t.admin.reports, icon: 'bar_chart', permission: 'reports.view' },
        { href: '/admin/settings/general', label: t.admin.settings, icon: 'settings', permission: 'settings.view' },
    ]

    // Filter links based on permissions
    const links = allLinks.filter(link => hasPermission(link.permission))

    // If no visible links, don't render the nav
    if (links.length === 0) return null

    // Dynamic grid columns based on visible link count
    const gridCols = `grid-cols-${Math.min(links.length, 5)}`

    return (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0d131a] backdrop-blur-xl border-t border-[#1e293b] lg:hidden pb-safe">
            <div className={`grid ${gridCols} gap-1 items-center h-16 px-2`}
                style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
            >
                {links.map((link) => {
                    let isActive = false

                    if (link.href === '/admin') {
                        isActive = pathname === '/admin'
                    } else if (link.href === '/admin/employees') {
                        isActive = pathname?.startsWith('/admin/employees') || pathname?.startsWith('/admin/my-team')
                    } else if (link.href === '/admin/settings/general') {
                        isActive = pathname?.startsWith('/admin/settings') || pathname?.startsWith('/admin/audit-logs')
                    } else {
                        isActive = pathname?.startsWith(link.href) || false
                    }

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all w-full",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <span className={cn(
                                "material-symbols-outlined text-2xl transition-transform duration-300",
                                isActive && "scale-110 fill-current"
                            )}>
                                {link.icon}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide w-full text-center truncate px-1">
                                {link.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

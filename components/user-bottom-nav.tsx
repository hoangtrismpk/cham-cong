'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/i18n-context'

export function UserBottomNav() {
    const pathname = usePathname()
    const { t } = useI18n()

    const links = [
        { href: '/', label: t.nav.dashboard, icon: 'space_dashboard' },
        { href: '/timesheets', label: t.nav.timesheets, icon: 'history' },
        { href: '/schedule', label: t.nav.schedule, icon: 'calendar_month' },
        { href: '/reports', label: t.nav.reports, icon: 'analytics' },
        { href: '/settings', label: t.nav.settings, icon: 'settings' },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0d131a]/95 backdrop-blur-xl border-t border-[#1e293b] lg:hidden pb-safe">
            <div className="grid grid-cols-5 gap-1 items-center h-16 px-2">
                {links.map((link) => {
                    let isActive = false

                    if (link.href === '/') {
                        isActive = pathname === '/'
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

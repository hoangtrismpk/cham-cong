'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SystemStatus } from './system-status'

export function AdminSidebar() {
    const pathname = usePathname()

    const links = [
        { href: '/admin', label: 'Overview', icon: 'dashboard' },
        { href: '/admin/employees', label: 'Employees', icon: 'group' },
        { href: '/admin/attendance', label: 'Attendance', icon: 'schedule' },
        { href: '/admin/reports', label: 'Reports', icon: 'analytics' },
    ]

    return (
        <aside className="w-64 border-r border-[#1e293b] bg-[#0d131a] flex flex-col hidden lg:flex h-screen sticky top-0">
            <div className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">timer</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white">TimeTracker</h1>
                </div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">Admin Panel</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {links.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                                isActive
                                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <span className={cn(
                                "material-symbols-outlined text-[22px] transition-transform",
                                !isActive && "group-hover:scale-110"
                            )}>{link.icon}</span>
                            <span className="text-sm font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 mt-auto">
                <SystemStatus />
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className="size-10 rounded-full ring-2 ring-border-dark bg-slate-700 bg-cover bg-center overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                        AD
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">Admin User</p>
                        <p className="text-[11px] text-slate-500 truncate">Administrator</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 group-hover:rotate-45 transition-transform">logout</span>
                </div>
            </div>
        </aside>
    )
}

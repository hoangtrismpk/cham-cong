'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Settings,
    Shield,
    Bell,
    ToggleLeft,
    Puzzle,
    Users,
    ChevronLeft
} from 'lucide-react'

const settingsNavItems = [
    {
        title: 'Cấu hình chung',
        href: '/admin/settings/general',
        icon: Settings,
        description: 'Thông tin công ty, giờ làm việc, vị trí',
        permission: 'settings.view'
    },
    {
        title: 'Bảo mật',
        href: '/admin/settings/security',
        icon: Shield,
        description: '2FA, reCAPTCHA, chính sách mật khẩu',
        permission: 'settings.view'
    },
    {
        title: 'Thông báo',
        href: '/admin/settings/notifications',
        icon: Bell,
        description: 'Email, Push notifications, SMTP',
        comingSoon: true,
        permission: 'settings.view'
    },
    {
        title: 'Tính năng',
        href: '/admin/settings/feature-toggles',
        icon: ToggleLeft,
        description: 'Bật/tắt các module hệ thống',
        comingSoon: true,
        permission: 'settings.view'
    },
    {
        title: 'Tích hợp',
        href: '/admin/settings/integrations',
        icon: Puzzle,
        description: 'WordPress, API, dịch vụ bên thứ ba',
        permission: 'settings.view'
    },
    {
        title: 'Phân quyền',
        href: '/admin/settings/roles',
        icon: Users,
        description: 'Quản lý vai trò và quyền hạn',
        permission: 'roles.view'
    }
]

import { useState, useEffect } from 'react'
import { getMyProfile } from '@/app/actions/profile'
import { Loader2 } from 'lucide-react'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [loading, setLoading] = useState(true)
    const [permissions, setPermissions] = useState<string[]>([])

    useEffect(() => {
        async function loadPermissions() {
            try {
                const { profile } = await getMyProfile()
                if (profile) {
                    const roles = (profile as any).roles
                    const perms = (Array.isArray(roles) ? roles[0]?.permissions : roles?.permissions) || []
                    setPermissions(perms)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadPermissions()
    }, [])

    const hasPermission = (permission: string) => {
        if (!permissions || permissions.length === 0) return false
        if (permissions.includes('*')) return true
        if (permissions.includes(permission)) return true
        const [resource] = permission.split('.')
        if (permissions.includes(`${resource}.*`)) return true
        return false
    }

    // Filter items
    const visibleItems = settingsNavItems.filter(item => !item.permission || hasPermission(item.permission))

    return (
        <div className="flex h-full">
            {/* Settings Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-[#0d1117] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-sm">Quay lại Dashboard</span>
                    </Link>
                    <h1 className="text-xl font-semibold text-white">Cấu hình hệ thống</h1>
                    <p className="text-sm text-slate-400 mt-1">Quản lý cài đặt toàn hệ thống</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                        </div>
                    ) : (
                        visibleItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                        item.comingSoon && "opacity-60 cursor-not-allowed"
                                    )}
                                    onClick={(e) => item.comingSoon && e.preventDefault()}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5 mt-0.5 flex-shrink-0",
                                        isActive ? "text-blue-400" : "text-slate-500"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{item.title}</span>
                                            {item.comingSoon && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                                                    Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {item.description}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    )
}

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
    ChevronLeft,
    PanelLeft,
    ChevronRight,
    Menu,
    Building2,
    Mail
} from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/i18n-context'

// Nav items will be defined inside component to access i18n

import { useState, useEffect } from 'react'
import { getMyProfile } from '@/app/actions/profile'
import { Loader2 } from 'lucide-react'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { t } = useI18n()
    const [loading, setLoading] = useState(true)
    const [permissions, setPermissions] = useState<string[]>([])
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(true)

    // Settings navigation items with i18n
    const settingsNavItems: {
        title: string
        href: string
        icon: any
        description: string
        permission: string
        comingSoon?: boolean
    }[] = [
            {
                title: t.adminSettings.general,
                href: '/admin/settings/general',
                icon: Settings,
                description: t.adminSettings.generalSettings.description,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.organization.navTitle,
                href: '/admin/settings/organization',
                icon: Building2,
                description: t.adminSettings.organization.navDescription,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.security,
                href: '/admin/settings/security',
                icon: Shield,
                description: t.adminSettings.securitySettings.description,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.notifications,
                href: '/admin/settings/notifications',
                icon: Bell,
                description: t.adminSettings.notificationDashboard.subtitle,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.featureToggles,
                href: '/admin/settings/feature-toggles',
                icon: ToggleLeft,
                description: t.adminSettings.featureTogglesComingSoon.description,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.integrations.title,
                href: '/admin/settings/integrations',
                icon: Puzzle,
                description: t.adminSettings.integrations.description,
                permission: 'settings.view'
            },
            {
                title: t.adminSettings.roles,
                href: '/admin/settings/roles',
                icon: Users,
                description: t.adminSettings.roleSettings.description,
                permission: 'roles.view'
            },
            {
                title: 'Email (Resend)',
                href: '/admin/settings/email',
                icon: Mail,
                description: 'Cấu hình dịch vụ gửi email tự động',
                permission: 'settings.view'
            }
        ]

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

    const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
        <div className="flex flex-col h-full bg-[#0d1117]">
            {/* Header */}
            <div className={cn("border-b border-slate-800 flex items-center", collapsed ? "p-2 justify-center" : "p-4 justify-between")}>
                {!collapsed && (
                    <div className="flex-1 overflow-hidden">
                        <h1 className="text-lg font-bold text-white truncate">{t.adminSettings.title}</h1>
                        <p className="text-xs text-slate-500 truncate">{t.nav.settings}</p>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn("p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors", collapsed && "mx-auto")}
                    title={collapsed ? t.adminSettings.settingsLayout.expanded : t.adminSettings.settingsLayout.collapsed}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className={cn("flex-1 overflow-y-auto custom-scrollbar p-2", collapsed ? "px-2" : "px-3")}>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                    </div>
                ) : (
                    <div className="space-y-1">
                        {!collapsed && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-white transition-colors mb-4 text-xs font-medium"
                            >
                                <ChevronLeft className="h-3 w-3" />
                                <span>{t.common.back} {t.nav.dashboard}</span>
                            </Link>
                        )}

                        {visibleItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    title={collapsed ? item.title : undefined}
                                    className={cn(
                                        "flex items-center rounded-lg transition-all duration-200 group relative",
                                        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                                        isActive
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                        item.comingSoon && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className={cn(
                                        "flex-shrink-0 transition-colors",
                                        collapsed ? "h-5 w-5" : "h-4 w-4 mt-0.5",
                                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white"
                                    )} />

                                    {!collapsed && (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{item.title}</span>
                                                {item.comingSoon && (
                                                    <span className="text-[9px] px-1 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                                                        {t.adminSettings.settingsLayout.soon}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5 truncate group-hover:text-slate-400">
                                                {item.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Tooltip for Collapsed State */}
                                    {collapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700 transition-opacity">
                                            {item.title}
                                        </div>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </nav>

            {!collapsed && (
                <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-600">
                    v1.0.2
                </div>
            )}
        </div>
    )

    return (
        <div className="flex flex-col min-h-full">
            {/* Desktop Horizontal Tabs */}
            <div className="hidden lg:block border-b border-slate-800 bg-[#0d1117] sticky top-0 z-30">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/admin"
                                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>{t.nav.dashboard}</span>
                            </Link>
                            <span className="text-slate-600">/</span>
                            <h1 className="text-lg font-bold text-white">{t.adminSettings.title}</h1>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Tabs */}
                    <div className="relative -mx-6 px-6">
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                            {loading ? (
                                <div className="flex gap-2 py-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" />
                                    ))}
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
                                                "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap group relative shrink-0",
                                                isActive
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/5"
                                                    : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent",
                                                item.comingSoon && "opacity-60 cursor-not-allowed"
                                            )}
                                            onClick={(e) => {
                                                if (item.comingSoon) {
                                                    e.preventDefault()
                                                    return
                                                }
                                            }}
                                        >
                                            <Icon className={cn(
                                                "h-4 w-4 transition-colors",
                                                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white"
                                            )} />
                                            <span className="font-medium text-sm">{item.title}</span>
                                            {item.comingSoon && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                                                    {t.adminSettings.settingsLayout.soon}
                                                </span>
                                            )}
                                        </Link>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Header with Drawer */}
            <div className="lg:hidden sticky top-0 z-40 border-b border-slate-800 bg-[#0d1117]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0d1117]/60">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 text-slate-400 hover:text-white">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 border-r border-slate-800 w-[280px] bg-[#0d1117]">
                                <SheetTitle className="sr-only">Menu Cấu hình</SheetTitle>
                                <div className="flex flex-col h-full bg-[#0d1117]">
                                    {/* Mobile Menu Header */}
                                    <div className="p-4 border-b border-slate-800 space-y-1.5">
                                        <Link
                                            href="/admin"
                                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            <span className="text-sm">{t.adminSettings.settingsLayout.backToDashboard}</span>
                                        </Link>
                                        <h1 className="text-xl font-semibold text-white">{t.adminSettings.settingsLayout.systemConfig}</h1>
                                        <p className="text-sm text-slate-400 leading-relaxed">{t.adminSettings.settingsLayout.manageSystemSettings}</p>
                                    </div>

                                    {/* Mobile Menu Navigation */}
                                    <nav className="flex-1 overflow-y-auto custom-scrollbar p-3">
                                        {loading ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {visibleItems.map((item) => {
                                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                                    const Icon = item.icon

                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={(e) => {
                                                                if (item.comingSoon) {
                                                                    e.preventDefault()
                                                                    return
                                                                }
                                                                setIsMobileOpen(false)
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                                                isActive
                                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                                                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                                                item.comingSoon && "opacity-60 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <Icon className={cn(
                                                                "h-4 w-4 flex-shrink-0 transition-colors",
                                                                isActive ? "text-blue-400" : "text-slate-500"
                                                            )} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-sm truncate">{item.title}</span>
                                                                    {item.comingSoon && (
                                                                        <span className="text-[9px] px-1 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                                                                            Soon
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                                    {item.description}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </nav>

                                    <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-600">
                                        v1.0.2
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-blue-500" />
                            <span className="font-bold text-white text-sm">{t.adminSettings.settingsLayout.config}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full">
                {children}
            </div>
        </div >
    )
}

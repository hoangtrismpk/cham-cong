'use client'

import { NotificationBell } from '@/components/notification-bell'
import { LanguageSwitcher } from '@/components/language-switcher'
import { AdminMobileNav } from '@/components/admin-mobile-nav'
import { useI18n } from '@/contexts/i18n-context'

interface AdminHeaderProps {
    permissions: string[]
    profile: any
}

export function AdminHeader({ permissions, profile }: AdminHeaderProps) {
    const { t } = useI18n()

    return (
        <header className="h-16 border-b border-[#1e293b] bg-[#0d131a]/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0">
            <div className="flex items-center gap-4">
                <AdminMobileNav
                    permissions={permissions}
                    profile={profile}
                />
                <span className="text-slate-500 text-sm font-medium hidden sm:inline-block">{t.admin.headerTitle}</span>
            </div>
            <div className="flex items-center gap-4">
                <LanguageSwitcher />
                <NotificationBell />
            </div>
        </header>
    )
}

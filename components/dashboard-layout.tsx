'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { DashboardSidebar } from './dashboard-sidebar'
import { LanguageSwitcher } from './language-switcher'
import { NotificationBell } from './notification-bell'
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context'
import { useI18n } from '@/contexts/i18n-context'

interface DashboardLayoutProps {
    user: any
    children: React.ReactNode
}

function DashboardLayoutContent({ user, children }: DashboardLayoutProps) {
    const { isOpen, setIsOpen } = useSidebar()
    const { locale } = useI18n()
    const [dateStr, setDateStr] = useState('')
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        if (locale === 'vi') {
            const formatted = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })
            // Capitalize the first letter (thứ ba -> Thứ ba)
            setDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1))
        } else {
            setDateStr(format(new Date(), 'EEEE, MMM d, yyyy'))
        }
    }, [locale])

    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024)
        }
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        return () => window.removeEventListener('resize', checkDesktop)
    }, [])

    return (
        <div className="flex bg-background font-display min-h-screen">
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* SIDEBAR - Fixed on Desktop */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-300 ease-in-out border-r border-sidebar-border
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:block
            `}>
                <DashboardSidebar user={user} onClose={() => setIsOpen(false)} />
            </div>

            {/* MAIN CONTENT - Pushed by Sidebar on Desktop */}
            <main
                className="flex-1 flex flex-col min-h-screen bg-background relative w-full transition-all duration-300"
                style={{
                    marginLeft: isDesktop ? '256px' : '0',
                    width: isDesktop ? 'calc(100% - 256px)' : '100%'
                }}
            >
                {/* Header - Desktop Only */}
                <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 w-full mb-0">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium hidden sm:inline-block">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4">
                        <LanguageSwitcher />
                        <NotificationBell />
                    </div>
                </header>

                <div className="flex-1 w-full relative">
                    {children}
                </div>
            </main>
        </div>
    )
}

export function DashboardLayout(props: DashboardLayoutProps) {
    return (
        <SidebarProvider>
            <DashboardLayoutContent {...props} />
        </SidebarProvider>
    )
}
// Forces rebuild

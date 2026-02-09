'use client'

import { useSidebar } from '@/contexts/sidebar-context'
import { NotificationBell } from '@/components/notification-bell'
import { ReactNode } from 'react'

interface MobileHeaderProps {
    title: string
    subtitle: ReactNode
    rightActions?: ReactNode
    className?: string
}

export function MobileHeader({ title, subtitle, rightActions, className = '' }: MobileHeaderProps) {
    const { setIsOpen } = useSidebar()

    return (
        <header className={`flex md:hidden items-center justify-between px-6 py-4 border-b border-white/10 bg-background/50 backdrop-blur-md sticky top-0 z-20 ${className}`}>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-slate-400 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-90 transition-all outline-none"
                    aria-label="Open Menu"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none flex items-center gap-1.5" suppressHydrationWarning>
                        {subtitle}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {rightActions ? rightActions : <NotificationBell />}
            </div>
        </header>
    )
}

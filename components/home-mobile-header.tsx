'use client'

import { format } from 'date-fns'
import { useSidebar } from '@/contexts/sidebar-context'

interface HomeMobileHeaderProps {
    userName: string
}

export function HomeMobileHeader({ userName }: HomeMobileHeaderProps) {
    const { setIsOpen } = useSidebar()
    const today = new Date()
    const dateStr = format(today, 'EEE, MMM d')

    return (
        <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-white/10 bg-background/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-slate-400 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-90 transition-all"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight text-white">TimeKeep</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">{dateStr}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="text-slate-400 size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                </button>
            </div>
        </header>
    )
}

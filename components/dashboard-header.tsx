'use client'

import { useI18n } from '@/contexts/i18n-context'

export function DashboardHeader({ dateStr }: { dateStr: string }) {
    const { t } = useI18n()

    return (
        <div className="flex items-center gap-4">
            <span className="text-slate-400 font-semibold tracking-widest uppercase text-[10px] bg-slate-800/40 px-3 py-1 rounded-full border border-white/5">{dateStr}</span>
        </div>
    )
}

export function LocationBadge() {
    const { t } = useI18n()

    return (
        <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-full border border-border">
            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
            <span className="text-sm">{t.dashboard.location}</span>
        </div>
    )
}

'use client'

import { useI18n } from '@/contexts/i18n-context'

interface DashboardClientWrapperProps {
    dateStr: string
    weeklyProgress: string
    weeklyPercentage: number
    dailyStats: Array<{ label: string; value: number; percentage: number }>
    history: any[]
    children: React.ReactNode
}

export function DashboardClientWrapper({
    dateStr,
    weeklyProgress,
    weeklyPercentage,
    dailyStats,
    history,
    children,
}: DashboardClientWrapperProps) {
    const { t } = useI18n()

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-display">
            {children}
        </div>
    )
}

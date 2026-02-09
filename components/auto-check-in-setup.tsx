'use client'

import { useAutoCheckIn } from '@/hooks/use-auto-check-in'

export function AutoCheckInSetup({ workSettings }: { workSettings: any }) {
    useAutoCheckIn(workSettings)
    return null
}

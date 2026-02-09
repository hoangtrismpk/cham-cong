'use client'

import { useAutoCheckOut } from '@/hooks/use-auto-check-out'

export function AutoCheckOutSetup({ workSettings }: { workSettings: any }) {
    useAutoCheckOut(workSettings)
    return null
}

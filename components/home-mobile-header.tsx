'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSetting } from '@/hooks/use-settings-sync'
import { MobileHeader } from '@/components/mobile-header'

interface HomeMobileHeaderProps {
    userName: string
}

export function HomeMobileHeader({ userName }: HomeMobileHeaderProps) {
    const today = new Date()
    const dateStr = format(today, 'EEEE, d MMMM', { locale: vi })
    const { value: companyName } = useSetting('company_name', 'Chấm công FHB')

    return (
        <MobileHeader
            title={String(companyName)}
            subtitle={dateStr}
        />
    )
}

'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSetting } from '@/hooks/use-settings-sync'
import { MobileHeader } from '@/components/mobile-header'
import { useI18n } from '@/contexts/i18n-context'


interface HomeMobileHeaderProps {
    userName: string
}

export function HomeMobileHeader({ userName }: HomeMobileHeaderProps) {
    const { locale } = useI18n()
    const today = new Date()

    let dateStr = ''
    if (locale === 'vi') {
        const formatted = format(today, 'EEEE, dd/MM/yyyy', { locale: vi })
        dateStr = formatted.charAt(0).toUpperCase() + formatted.slice(1)
    } else {
        dateStr = format(today, 'EEEE, MMM d, yyyy')
    }
    const { value: companyName } = useSetting('company_name', 'FHB Việt Nam')

    return (
        <MobileHeader
            title={String(companyName)}
            subtitle={dateStr}
        />
    )
}

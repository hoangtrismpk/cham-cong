'use client'

import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/contexts/i18n-context'

export default function NotificationsSettingsClientPage() {
    const { t } = useI18n()

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30">
                    <Bell className="h-10 w-10 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">{t.adminSettings.notificationsComingSoon.title}</h2>
                    <p className="text-slate-400 mt-2 max-w-md">
                        {t.adminSettings.notificationsComingSoon.description}
                    </p>
                </div>
                <Badge variant="outline" className="text-blue-400 border-blue-500/50">
                    {t.adminSettings.notificationsComingSoon.badge}
                </Badge>
            </div>
        </div>
    )
}

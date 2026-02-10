'use client'

import { ToggleLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/contexts/i18n-context'

export default function FeatureTogglesSettingsClientPage() {
    const { t } = useI18n()

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30">
                    <ToggleLeft className="h-10 w-10 text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">{t.adminSettings.featureTogglesComingSoon.title}</h2>
                    <p className="text-slate-400 mt-2 max-w-md">
                        {t.adminSettings.featureTogglesComingSoon.description}
                    </p>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-500/50">
                    {t.adminSettings.featureTogglesComingSoon.badge}
                </Badge>
            </div>
        </div>
    )
}

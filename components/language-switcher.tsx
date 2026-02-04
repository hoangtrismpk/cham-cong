'use client'

import { useI18n } from '@/contexts/i18n-context'

export function LanguageSwitcher() {
    const { locale, setLocale } = useI18n()

    return (
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            <button
                onClick={() => setLocale('vi')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${locale === 'vi'
                        ? 'bg-primary text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
            >
                VI
            </button>
            <button
                onClick={() => setLocale('en')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${locale === 'en'
                        ? 'bg-primary text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
            >
                EN
            </button>
        </div>
    )
}

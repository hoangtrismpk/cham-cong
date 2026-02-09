'use client'

import { useI18n } from '@/contexts/i18n-context'

interface LanguageSwitcherProps {
    fullWidth?: boolean
}

export function LanguageSwitcher({ fullWidth = false }: LanguageSwitcherProps) {
    const { locale, setLocale } = useI18n()

    return (
        <div className={`flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 ${fullWidth ? 'w-full' : ''}`}>
            <button
                onClick={() => setLocale('vi')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${locale === 'vi'
                    ? 'bg-primary text-black shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    } ${fullWidth ? 'flex-1 text-center' : ''}`}
            >
                VI
            </button>
            <button
                onClick={() => setLocale('en')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${locale === 'en'
                    ? 'bg-primary text-black shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    } ${fullWidth ? 'flex-1 text-center' : ''}`}
            >
                EN
            </button>
        </div>
    )
}

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, locales, Translations } from '@/locales'

interface I18nContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: Translations
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('vi') // Default to Vietnamese

    // Load locale from cookie on mount
    useEffect(() => {
        const savedLocale = document.cookie
            .split('; ')
            .find(row => row.startsWith('locale='))
            ?.split('=')[1] as Locale | undefined

        if (savedLocale && (savedLocale === 'vi' || savedLocale === 'en')) {
            setLocaleState(savedLocale)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        // Save to cookie (expires in 1 year)
        document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    }

    const t = locales[locale]

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider')
    }
    return context
}

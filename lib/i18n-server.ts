import { cookies } from 'next/headers'
import { Locale, locales } from '@/locales'

/**
 * Get translations for server components
 * Reads locale from cookies
 */
export async function getServerTranslations() {
    const cookieStore = await cookies()
    const locale = (cookieStore.get('locale')?.value as Locale) || 'vi'

    return {
        locale,
        t: locales[locale],
    }
}

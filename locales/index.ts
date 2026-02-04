import { vi } from './vi'
import { en } from './en'

export const locales = {
    vi,
    en,
} as const

export type Locale = keyof typeof locales
export type { Translations } from './vi'

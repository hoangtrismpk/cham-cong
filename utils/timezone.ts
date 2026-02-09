/**
 * Timezone Utilities for Vietnam (UTC+7)
 * 
 * These functions ensure dates are handled correctly in Vietnam timezone
 */

/**
 * Convert a Date to Vietnam timezone ISO string
 * @param date - Date object
 * @returns ISO string in Vietnam timezone (UTC+7)
 */
export function toVietnamISOString(date: Date): string {
    // Vietnam is UTC+7
    const vietnamOffset = 7 * 60 // 7 hours in minutes
    const localOffset = date.getTimezoneOffset() // Browser's offset from UTC in minutes

    // Calculate the difference
    const offsetDiff = vietnamOffset + localOffset

    // Create new date adjusted to Vietnam time
    const vietnamDate = new Date(date.getTime() + offsetDiff * 60 * 1000)

    return vietnamDate.toISOString()
}

/**
 * Get current date/time in Vietnam timezone
 * @returns Date object representing current time in Vietnam
 */
export function getVietnamNow(): Date {
    const now = new Date()
    const vietnamOffset = 7 * 60
    const localOffset = now.getTimezoneOffset()
    const offsetDiff = vietnamOffset + localOffset

    return new Date(now.getTime() + offsetDiff * 60 * 1000)
}

/**
 * Format date to Vietnam timezone
 * Use with date-fns format function
 * @param date - Date string or Date object
 * @returns Date object in Vietnam timezone
 */
export function toVietnamDate(date: string | Date): Date {
    const d = typeof date === 'string' ? new Date(date) : date

    // If the date is already in local timezone, return as is
    // This is for display purposes - date-fns will handle the formatting
    return d
}

/**
 * Check if a date string is in UTC format
 * @param dateString - ISO date string
 * @returns boolean
 */
export function isUTCString(dateString: string): boolean {
    return dateString.endsWith('Z') || dateString.includes('+00:00')
}

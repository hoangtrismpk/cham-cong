'use client'

import { useNotifications as useNotificationContext } from '@/contexts/notification-context'

/**
 * Legacy hook wrapper for NotificationContext.
 * Use this to avoid breaking existing imports.
 */
export function useNotifications() {
    return useNotificationContext()
}

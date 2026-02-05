'use client'

import { useLocalNotifications } from '@/hooks/use-local-notifications'

export function LocalNotificationsSetup() {
    useLocalNotifications()
    return null // This is an invisible component, just runs the hook
}

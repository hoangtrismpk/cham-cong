import { requirePermission } from '@/utils/auth-guard'
import NotificationsClientPage from './client-page'

export const metadata = {
    title: 'Notifications | Admin',
    description: 'Manage push notifications',
}

export default async function NotificationsPage() {
    await requirePermission('notifications.view', '/admin')
    return <NotificationsClientPage />
}

import NotificationsSettingsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Notification Settings | Admin',
    description: 'Configure notification preferences',
}

export default async function NotificationsSettingsPage() {
    await requirePermission('settings.view', '/admin')

    return <NotificationsSettingsClientPage />
}

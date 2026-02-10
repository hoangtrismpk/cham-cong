import SecuritySettingsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Security Settings | Admin',
    description: 'Manage security configurations',
}

export default async function SecuritySettingsPage() {
    await requirePermission('settings.view', '/admin')

    return <SecuritySettingsClientPage />
}

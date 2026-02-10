import IntegrationsSettingsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Integrations | Admin',
    description: 'Configure external integrations',
}

export default async function IntegrationsSettingsPage() {
    await requirePermission('settings.view', '/admin')

    return <IntegrationsSettingsClientPage />
}

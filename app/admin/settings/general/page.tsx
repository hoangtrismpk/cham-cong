import GeneralSettingsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'General Settings | Admin',
    description: 'Configure general application settings',
}

export default async function GeneralSettingsPage() {
    await requirePermission('settings.view', '/admin')

    return <GeneralSettingsClientPage />
}

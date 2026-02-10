import FeatureTogglesSettingsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Feature Toggles | Admin',
    description: 'Manage feature flags',
}

export default async function FeatureTogglesSettingsPage() {
    await requirePermission('settings.view', '/admin')

    return <FeatureTogglesSettingsClientPage />
}

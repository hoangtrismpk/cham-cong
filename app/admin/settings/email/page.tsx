import { requirePermission } from '@/utils/auth-guard'
import ResendSettingsClientPage from './client-page'

export const metadata = {
    title: 'Email (Resend) | Settings',
    description: 'Configure Resend email service API',
}

export default async function ResendSettingsPage() {
    await requirePermission('settings.view', '/admin')
    return <ResendSettingsClientPage />
}

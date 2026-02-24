import { requirePermission } from '@/utils/auth-guard'
import EmailTemplatesClientPage from './client-page'

export const metadata = {
    title: 'Email Templates | Admin',
    description: 'Manage system email templates',
}

export default async function EmailTemplatesPage() {
    await requirePermission('settings.view', '/admin')
    return <EmailTemplatesClientPage />
}

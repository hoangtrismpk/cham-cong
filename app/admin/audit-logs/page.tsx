import AuditLogsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Audit Logs | Admin',
    description: 'System audit logs',
}

export default async function AuditLogsPage() {
    await requirePermission('settings.view', '/admin')

    return <AuditLogsClientPage />
}

import AuditLogsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Audit Logs | Admin',
    description: 'System audit logs',
}

export default async function AuditLogsPage() {
    await requirePermission('audit_logs.view', '/admin')

    return <AuditLogsClientPage />
}

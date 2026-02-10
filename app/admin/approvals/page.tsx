import ApprovalsClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Approvals | Admin',
    description: 'Manage employee requests and approvals',
}

export default async function ApprovalsPage() {
    await requirePermission('approvals.view', '/admin')

    return <ApprovalsClientPage />
}

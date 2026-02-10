import EmployeesClientPage from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Quản lý Nhân sự | Admin',
    description: 'Danh sách và quản lý thông tin nhân viên',
}

export default async function EmployeesPage() {
    await requirePermission('users.view', '/admin')

    return <EmployeesClientPage />
}

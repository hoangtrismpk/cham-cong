import { getOrganizationSettings } from '@/app/actions/organization'
import OrganizationSettingsClient from './client-page'
import { requirePermission } from '@/utils/auth-guard'

export const metadata = {
    title: 'Cấu hình Tổ chức | Admin',
    description: 'Quản lý danh sách phòng ban và chức vụ',
}

export default async function OrganizationSettingsPage() {
    await requirePermission('settings.view', '/admin')

    const settings = await getOrganizationSettings()

    return (
        <OrganizationSettingsClient
            initialDepartments={settings.departments || []}
            initialJobTitles={settings.job_titles || []}
        />
    )
}

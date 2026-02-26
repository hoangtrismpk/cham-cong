import { requirePermission } from '@/utils/auth-guard'
import EditEmailTemplateClientPage from './client-page'

export const metadata = {
    title: 'Edit Email Template | Admin',
    description: 'Edit email template content',
}

export default async function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    await requirePermission('email_templates.view', '/admin')
    const { id } = await params
    return <EditEmailTemplateClientPage templateId={id} />
}

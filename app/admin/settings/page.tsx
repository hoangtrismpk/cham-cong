import { redirect } from 'next/navigation'

// Redirect to general settings by default
export default async function SettingsPage() {
    redirect('/admin/settings/general')
}

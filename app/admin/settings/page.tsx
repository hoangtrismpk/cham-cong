import { redirect } from 'next/navigation'

// Redirect to general settings by default
export default function SettingsPage() {
    redirect('/admin/settings/general')
}


import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SettingsClient } from './settings-client'
import { format } from 'date-fns'
import { DashboardLayout } from '@/components/dashboard-layout'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <DashboardLayout user={user}>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <SettingsClient user={user} />
            </div>
        </DashboardLayout>
    )
}

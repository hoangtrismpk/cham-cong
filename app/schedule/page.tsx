import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleClient } from './schedule-client'
import { DashboardLayout } from '@/components/dashboard-layout'
import { format } from 'date-fns'
import { getDepartmentMemberCount } from '@/app/actions/profile'

import { getWorkSettings } from '@/app/actions/settings'

export default async function SchedulePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const departmentCount = await getDepartmentMemberCount()
    const workSettings = await getWorkSettings()

    return (
        <DashboardLayout user={user}>
            <div className="flex-1 overflow-hidden h-full">
                <ScheduleClient
                    user={user}
                    departmentCount={departmentCount}
                    workSettings={workSettings}
                />
            </div>
        </DashboardLayout>
    )
}

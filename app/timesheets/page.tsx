
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { TimesheetsClient } from './timesheets-client'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAttendanceLogsRange } from '@/app/actions/attendance'
import { getWorkSettings } from '@/app/actions/settings'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TimesheetsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const now = new Date()
    const initialData = await getAttendanceLogsRange(
        startOfMonth(now).toISOString(),
        endOfMonth(now).toISOString(),
        1, // Page 1
        10 // Limit 10
    )

    const workSettings = await getWorkSettings()

    return (
        <DashboardLayout user={user}>
            <div className="flex-1 overflow-hidden h-full md:p-0">
                <TimesheetsClient user={user} initialData={initialData} workSettings={workSettings} />
            </div>
        </DashboardLayout>
    )
}

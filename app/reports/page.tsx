import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getMyReports } from '@/app/actions/work-reports'
import ClientOnly from '@/components/client-only'
import ReportsContainer from '@/components/reports/reports-container'
import { DashboardLayout } from '@/components/dashboard-layout'
import { MobileHeader } from '@/components/mobile-header'

export const metadata: Metadata = {
    title: 'Báo cáo công việc | Chấm công',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch reports for history
    const { reports } = await getMyReports(1, 100) // Fetch last 100 reports for history

    return (
        <DashboardLayout user={user}>
            <div className="flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <MobileHeader
                    title="Báo cáo công việc"
                    subtitle="Báo cáo tiến độ & kế hoạch"
                />

                <ClientOnly>
                    {/* 
                      Wrap in ClientOnly to avoid hydration mismatch if date parsing 
                      differs between server/client.
                    */}
                    <ReportsContainer initialReports={reports} userId={user.id} />
                </ClientOnly>
            </div>
        </DashboardLayout>
    )
}

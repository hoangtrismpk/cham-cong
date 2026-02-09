import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getMyReports } from '@/app/actions/work-reports'
import ClientOnly from '@/components/client-only'
import ReportsContainer from '@/components/reports/reports-container'

export const metadata: Metadata = {
    title: 'Báo cáo công việc | Chấm công',
}

export default async function ReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch reports for history
    const { reports, total } = await getMyReports(1, 100) // Fetch last 100 reports for history

    return (
        <ClientOnly>
            {/* 
              Wrap everything in ClientOnly to avoid hydration mismatch if date parsing 
              differs between server/client, although we handle UTC manually now.
            */}
            <ReportsContainer initialReports={reports} userId={user.id} />
        </ClientOnly>
    )
}

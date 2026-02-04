import { LanguageSwitcher } from '@/components/language-switcher'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { RealtimeClock } from '@/components/realtime-clock'
import { CheckInButton } from '@/components/check-in-button'
import { getTodayStatus, getAttendanceHistory, getAttendanceStats } from '@/app/actions/attendance'
import { AttendanceProgressCard, RecentHistoryCard } from '@/components/dashboard-cards'
import { getTodayShift } from '@/app/actions/schedule'
import { PwaHandler } from '@/components/pwa-handler'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DashboardHeader, LocationBadge } from '@/components/dashboard-header'
import { HomeMobileHeader } from '@/components/home-mobile-header'


export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()
  const dateStr = format(today, 'EEEE, MMM d, yyyy')

  // Fetch data
  const todayLog = await getTodayStatus()
  const history = await getAttendanceHistory()
  const attendanceStats = await getAttendanceStats('week')
  const todayShift = await getTodayShift()

  // Multi-session Logic
  const isCheckedIn = !!todayLog?.check_in_time && !todayLog?.check_out_time
  const isCheckedOut = !!todayLog?.check_out_time

  return (
    <DashboardLayout user={user}>
      <PwaHandler todayShift={todayShift} todayLog={todayLog} />

      {/* MOBILE HEADER */}
      <HomeMobileHeader userName={user.user_metadata.full_name || 'Bạn'} />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Check-in Card */}
        <div className="bg-card rounded-[2rem] border border-border p-6 md:p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center md:items-start space-y-4">
              <DashboardHeader dateStr={dateStr} />
              <RealtimeClock />
              <LocationBadge />
            </div>
            <div className="flex flex-col items-center">
              <CheckInButton
                isCheckedIn={isCheckedIn}
                isCheckedOut={isCheckedOut}
                userName={user.user_metadata.full_name || 'Bạn'}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hours Breakdown */}
          <div className="lg:col-span-2">
            <AttendanceProgressCard initialData={attendanceStats} />
          </div>

          {/* Recent History */}
          <div className="lg:col-span-1">
            <RecentHistoryCard history={history} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

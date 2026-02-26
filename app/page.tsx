import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { RealtimeClock } from '@/components/realtime-clock'
import { CheckInButton } from '@/components/check-in-button'
import { getTodayStatus, getAttendanceHistory, getAttendanceStats } from '@/app/actions/attendance'
import { AttendanceProgressCard, RecentHistoryCard } from '@/components/dashboard-cards'
import { getTodayShift } from '@/app/actions/schedule'
import { getWorkSettings } from '@/app/actions/settings'
import { PwaHandler } from '@/components/pwa-handler'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DashboardHeader, LocationBadge } from '@/components/dashboard-header'
import { HomeMobileHeader } from '@/components/home-mobile-header'
import { LocalNotificationsSetup } from '@/components/local-notifications-setup'
import { AutoCheckInSetup } from '@/components/auto-check-in-setup'
import { AutoCheckOutSetup } from '@/components/auto-check-out-setup'


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
  const cookieStore = await cookies()
  const currentLocale = cookieStore.get('locale')?.value || 'vi'
  const dateLocale = currentLocale === 'vi' ? vi : enUS
  const dateStr = format(today, 'EEEE, MMM d, yyyy', { locale: dateLocale })

  // Fetch ALL data in parallel (Promise.all) instead of sequential awaits
  // This reduces load time from ~1.2s to ~400ms (only waits for the slowest query)
  const [
    todayLog,
    history,
    attendanceStats,
    todayShift,
    workSettings,
    profileSettingsResult
  ] = await Promise.all([
    getTodayStatus(),
    getAttendanceHistory(),
    getAttendanceStats('week'),
    getTodayShift(),
    getWorkSettings(),
    supabase
      .from('profiles')
      .select('clock_in_remind_minutes, require_password_change')
      .eq('id', user.id)
      .single()
  ])

  const profileSettings = profileSettingsResult.data

  if (profileSettings?.require_password_change) {
    redirect('/force-password')
  }

  const clockInRemindMinutes = profileSettings?.clock_in_remind_minutes ?? 5

  // Multi-session Logic
  const isCheckedIn = !!todayLog?.check_in_time && !todayLog?.check_out_time
  const isCheckedOut = !!todayLog?.check_out_time

  return (
    <DashboardLayout user={user}>
      <PwaHandler todayShift={todayShift} todayLog={todayLog} clockInRemindMinutes={clockInRemindMinutes} />

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
                workSettings={workSettings}
                todayShift={todayShift}
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

      {/* Setup local notifications (invisible component) */}
      <LocalNotificationsSetup />
      <AutoCheckInSetup workSettings={workSettings} />
      <AutoCheckOutSetup workSettings={workSettings} />
    </DashboardLayout>
  )
}

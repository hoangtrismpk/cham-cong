import { NextResponse } from 'next/server'
import { sendDailyAttendanceReport } from '@/app/actions/email-triggers'

/**
 * Handle cron job execution for Daily Attendance Report.
 * Vercel Cron will send GET requests to this route.
 */
export async function GET(request: Request) {
    try {
        // Option 1: Vercel Cron verification
        const authHeader = request.headers.get('authorization')
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            console.warn('Unauthorized request to /api/cron/daily-report')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Send out the daily attendance report to admins
        const res = await sendDailyAttendanceReport()
        if (!res.success) {
            return NextResponse.json({ error: res.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Daily report sent successfully' })
    } catch (error: any) {
        console.error('API Cron Daily Report Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

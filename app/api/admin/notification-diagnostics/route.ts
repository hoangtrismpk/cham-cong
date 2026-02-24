import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 1. Verify admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSb = createAdminClient()
        const { data: profile } = await adminSb
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single()

        const roleName = Array.isArray(profile?.roles) ? profile.roles[0]?.name : (profile?.roles as any)?.name
        if (!roleName || !['admin', 'super_admin'].includes(roleName)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Diagnostic checks
        const diagnostics: Record<string, any> = {}

        // 2a. Check FCM tokens
        const { data: tokenStats, error: tokenErr } = await adminSb
            .from('fcm_tokens')
            .select('user_id, device_type, updated_at')

        diagnostics.fcm_tokens = {
            total: tokenStats?.length || 0,
            error: tokenErr?.message || null,
            unique_users: new Set(tokenStats?.map(t => t.user_id)).size,
            by_device: tokenStats?.reduce((acc: Record<string, number>, t) => {
                const type = t.device_type || 'unknown'
                acc[type] = (acc[type] || 0) + 1
                return acc
            }, {}),
        }

        // 2b. Check recent notification logs
        const { data: recentLogs, error: logErr } = await adminSb
            .from('notification_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(20)

        diagnostics.recent_logs = {
            count: recentLogs?.length || 0,
            error: logErr?.message || null,
            logs: recentLogs?.map(l => ({
                user_id: l.user_id,
                shift_id: l.shift_id,
                type: l.notification_type,
                status: l.status,
                sent_at: l.sent_at,
                clicked_at: l.clicked_at,
            })),
        }

        // 2c. Check environment variables
        diagnostics.env = {
            FIREBASE_SERVICE_ACCOUNT_B64: !!process.env.FIREBASE_SERVICE_ACCOUNT_B64 ? '✅ Set' : '❌ Missing',
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
        }

        // 2d. Check today's shifts to preview
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        const { data: todayShifts, error: shiftErr } = await adminSb
            .from('work_schedules')
            .select('id, user_id, start_time, end_time, work_date, title')
            .eq('work_date', today)
            .order('start_time', { ascending: true })

        diagnostics.today_shifts = {
            date: today,
            total: todayShifts?.length || 0,
            error: shiftErr?.message || null,
            shifts: todayShifts?.map(s => ({
                id: s.id,
                user_id: s.user_id,
                title: s.title,
                start_time: s.start_time,
                end_time: s.end_time,
            })),
        }

        // 2e. Check users with tokens vs all users
        const { data: allUsers } = await adminSb
            .from('profiles')
            .select('id, full_name')

        const usersWithTokens = new Set(tokenStats?.map(t => t.user_id))
        diagnostics.user_coverage = {
            total_users: allUsers?.length || 0,
            users_with_tokens: usersWithTokens.size,
            users_without_tokens: (allUsers?.length || 0) - usersWithTokens.size,
            missing_users: allUsers?.filter(u => !usersWithTokens.has(u.id)).map(u => ({
                id: u.id,
                name: u.full_name,
            })),
        }

        return NextResponse.json({
            status: 'OK',
            checked_at: new Date().toISOString(),
            diagnostics,
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

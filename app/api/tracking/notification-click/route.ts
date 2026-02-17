import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { shiftId, campaignId, type } = await req.json()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let error = null

        if (campaignId) {
            // Update Campaign Logs
            const { error: logError } = await supabase
                .from('notification_logs')
                .update({ clicked_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('campaign_id', campaignId)

            // Also update Notifications
            const { error: notifError } = await supabase
                .from('notifications')
                .update({ is_read: true, clicked_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('campaign_id', campaignId)

            if (logError || notifError) error = logError || notifError
        } else if (shiftId) {
            // Update Shift Logs
            const { error: shiftError } = await supabase
                .from('notification_logs')
                .update({ clicked_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('shift_id', shiftId)
            error = shiftError
        }

        if (error) {
            console.error('Error tracking click:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Tracking API Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

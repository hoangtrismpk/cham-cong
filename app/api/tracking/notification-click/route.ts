import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { shiftId, type } = await req.json()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Update the notification log
        const { error } = await supabase
            .from('notification_logs')
            .update({ clicked_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('shift_id', shiftId)
        // If we know the type (local/server_push), we could be more specific,
        // but updating the most recent log for this shift is usually sufficient.
        // Order by sent_at desc to get the latest one.
        // NOTE: Supabase update logic applies to all matching rows unless limited.
        // Since a user might have both local and server logs, we try to update both or specific if 'notification_type' was passed,
        // but 'type' from payload is 'shift_reminder' or similar, not strict 'local'/'server_push'.

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

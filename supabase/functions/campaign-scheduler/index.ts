
import { createClient } from 'jsr:@supabase/supabase-js@2'

const LOG_PREFIX = '[campaign-scheduler]';

Deno.serve(async (req) => {
    // 1. Auth Check (Must be Service Role OR Admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const log = (msg: string) => console.log(`${LOG_PREFIX} ${msg}`);

    try {
        // 2. Find Due Campaigns
        const now = new Date().toISOString();
        const { data: campaigns, error } = await supabase
            .from('notification_campaigns')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now);

        if (error) throw error;

        if (!campaigns || campaigns.length === 0) {
            log('No scheduled campaigns due.');
            return new Response(JSON.stringify({ message: 'No campaigns due' }), { status: 200 });
        }

        log(`Found ${campaigns.length} campaigns due.`);

        const results = [];

        for (const campaign of campaigns) {
            log(`Processing campaign ${campaign.id}: ${campaign.title}`);

            // 3. Construct Payload
            const payload: any = {
                title: campaign.title,
                body: campaign.message,
                link: campaign.link,
                campaignId: campaign.id,
                saveToDb: true
            };

            const type = campaign.target_type;
            const value = campaign.target_value;

            if (type === 'all') {
                payload.targetType = 'all';
            } else if (type === 'role') {
                payload.role = value;
            } else if (type === 'department') {
                payload.departmentId = value;
            } else if (type === 'specific_users') {
                // value is JSON array of IDs (or should be)
                // In DB it's stored as jsonb. Supabase client parses it? Yes.
                // If it's stored as string in older versions, might need check.
                // But my create logic stores it as array if specific_users.
                payload.userIds = Array.isArray(value) ? value : [];
            }

            // 4. Update Status to Processing (Prevent double send if next run overlaps)
            await supabase.from('notification_campaigns')
                .update({ status: 'processing' })
                .eq('id', campaign.id);

            // 5. Call Dispatcher
            // We call it via fetch to the other Edge Function
            const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-dispatcher`;
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            // Fire and forget? Or wait?
            // Better to wait to log result. Dispatcher should return quickly after kicking off or finishing.
            // Actually dispatcher loops through users. If thousands, it might take time.
            // But usually edge function has limits.

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const resJson = await response.json();
            results.push({ id: campaign.id, status: response.status, data: resJson });
        }

        return new Response(JSON.stringify({ success: true, processed: results }), { status: 200 });

    } catch (e: any) {
        log(`Error: ${e.message}`);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});

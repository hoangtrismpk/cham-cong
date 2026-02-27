
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
        // 2. Find Due Campaigns (both 'scheduled' AND stuck 'processing' for > 5 mins)
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

        // Query scheduled campaigns that are due
        const { data: scheduledCampaigns, error: schErr } = await supabase
            .from('notification_campaigns')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now.toISOString());

        if (schErr) throw schErr;

        // Also find stuck processing campaigns (stuck for more than 5 minutes)
        const { data: stuckCampaigns, error: stuckErr } = await supabase
            .from('notification_campaigns')
            .select('*')
            .eq('status', 'processing')
            .eq('total_recipients', 0)
            .lte('created_at', fiveMinutesAgo);

        // Combine both lists
        const campaigns = [
            ...(scheduledCampaigns || []),
            ...(stuckCampaigns || [])
        ];

        if (campaigns.length === 0) {
            log('No scheduled or stuck campaigns found.');
            return new Response(JSON.stringify({ message: 'No campaigns due' }), { status: 200 });
        }

        log(`Found ${campaigns.length} campaigns to process (${scheduledCampaigns?.length || 0} scheduled, ${stuckCampaigns?.length || 0} stuck).`);

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
                payload.userIds = Array.isArray(value) ? value : [];
            }

            // 4. Update Status to Processing (Prevent double send if next run overlaps)
            await supabase.from('notification_campaigns')
                .update({ status: 'processing' })
                .eq('id', campaign.id);

            // 5. Call Dispatcher
            const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-dispatcher`;
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            try {
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const resJson = await response.json();

                // Check if dispatcher actually succeeded
                if (!response.ok) {
                    log(`Dispatcher returned error ${response.status} for campaign ${campaign.id}: ${JSON.stringify(resJson)}`);
                    // Mark campaign as failed so it doesn't stay stuck in processing
                    await supabase.from('notification_campaigns')
                        .update({
                            status: 'failed',
                            metadata: { error: `Dispatcher returned ${response.status}: ${resJson?.error || 'Unknown error'}` }
                        })
                        .eq('id', campaign.id);
                }

                results.push({ id: campaign.id, status: response.status, data: resJson });
            } catch (fetchErr: any) {
                log(`Failed to call dispatcher for campaign ${campaign.id}: ${fetchErr.message}`);
                // Mark campaign as failed
                await supabase.from('notification_campaigns')
                    .update({
                        status: 'failed',
                        metadata: { error: `Fetch error: ${fetchErr.message}` }
                    })
                    .eq('id', campaign.id);
                results.push({ id: campaign.id, status: 'error', error: fetchErr.message });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), { status: 200 });

    } catch (e: any) {
        log(`Error: ${e.message}`);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});

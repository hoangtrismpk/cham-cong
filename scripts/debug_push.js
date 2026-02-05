
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const email = 'hoangtri@fhbvietnam.com';

    // 1. Get User
    const { data: user, error: userError } = await supabase
        .from('profiles') // Assuming profiles table matches auth.users logic
        .select('id')
        .eq('email', email)
        .single();

    if (userError) {
        // Try auth users via potentially direct query or just check tokens by email if we had it
        console.log('User profile fetch error (might not exist):', userError.message);
    }

    // Use the ID from the previous SQL result if we had it, but let's just count ALL tokens to see if anyone is registered
    const { count, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('*', { count: 'exact', head: true });

    if (tokenError) {
        console.error('Error fetching tokens:', tokenError.message);
    } else {
        console.log('Total FCM tokens in DB:', count);
    }

    // Check shifts for 16:45
    const { data: shifts, error: shiftError } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('work_date', '2026-02-04')
        .eq('start_time', '16:45');

    console.log('Shifts for 16:45:', shifts?.length || 0);
}

check();

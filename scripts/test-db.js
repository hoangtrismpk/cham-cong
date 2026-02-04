
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uffyhbinfvivqnjrhvvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnloYmluZnZpdnFuanJodnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjI2ODYsImV4cCI6MjA4NTYzODY4Nn0.0ejBmF2xzMAsX4S7v52rLIhMxW-kLiu4nM3rPkHSqJY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Checking Database Consistency ---');

    // Check work_schedules
    const { data: shifts, error: shiftError } = await supabase
        .from('work_schedules')
        .select('*')
        .limit(5);

    if (shiftError) {
        console.error('Error fetching work_schedules:', shiftError.message);
    } else {
        console.log(`Found ${shifts.length} shifts.`);
        shifts.forEach(s => {
            console.log(`User: ${s.user_id}, Date: ${s.work_date}, Time: ${s.start_time}`);
        });
    }

    // Check fcm_tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('*')
        .limit(5);

    if (tokenError) {
        console.error('Error fetching fcm_tokens:', tokenError.message);
    } else {
        console.log(`Found ${tokens.length} tokens.`);
    }
}

checkData();

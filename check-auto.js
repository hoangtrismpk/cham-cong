const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: profiles, error } = await supabase.from('profiles').select('id, email, auto_checkin_enabled, clock_in_remind_minutes');
    if (error) return console.error(error);

    const user = profiles.find(p => p.email === 'hoangtri@fhbvietnam.com');
    if (!user) return console.log('User not found.');

    console.log('Target User:', user);

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const { data: schedules } = await supabase.from('work_schedules').select('*').eq('user_id', user.id).eq('work_date', today);
    console.log('Today schedules:', schedules);

    const { data: logs } = await supabase.from('attendance_logs').select('*').eq('user_id', user.id).eq('work_date', today);
    console.log('Today logs:', logs);
}

run();

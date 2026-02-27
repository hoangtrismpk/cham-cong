import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321', // Use actual env var, actually I should read from .env.local
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function test() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, manager_id, manager:manager_id (full_name)')
        .limit(5);

    console.log(JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

test();

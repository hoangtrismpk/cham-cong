import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Fetch all roles to create a map
    const { data: roles } = await supabase.from('roles').select('id, name');
    const roleMap = {};
    if (roles) {
        roles.forEach(r => roleMap[r.id] = r.name);
    }

    // 2. Fetch all profiles
    const { data: profiles, error } = await supabase.from('profiles').select('id, role, role_id');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    // 3. Update profiles where role != roles.name
    for (const p of profiles) {
        if (!p.role_id) continue;
        const correctRoleName = roleMap[p.role_id] || 'employee';
        if (p.role !== correctRoleName) {
            console.log(`Updating ${p.id} from ${p.role} to ${correctRoleName}`);
            await supabase.from('profiles').update({ role: correctRoleName }).eq('id', p.id);
        }
    }
    console.log('Done syncing roles.');
}

main();

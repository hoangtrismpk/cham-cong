import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { const [k, v] = line.split('='); if (k && v) acc[k.trim()] = v.trim(); return acc; }, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    const { data: allData } = await supabase
        .from('profiles')
        .select('id, first_name, manager_id, manager:manager_id (full_name)')
        .limit(3);

    const exportData = allData.map((emp) => {
        return {
            manager: emp.manager ? (Array.isArray(emp.manager) ? emp.manager[0]?.full_name : emp.manager.full_name) || 'N/A' : 'N/A',
            manager_raw: emp.manager
        };
    });

    console.log(JSON.stringify(exportData, null, 2));
}
run();

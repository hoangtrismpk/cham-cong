/**
 * Verify Migration Script
 * Check if all tables and columns were created successfully
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
    console.log('\n🔍 Verifying Migration: Employment Types & Leaves\n');
    console.log('='.repeat(60));

    try {
        // 1. Check if employment_type column exists in profiles
        console.log('\n1️⃣  Checking profiles.employment_type column...');
        const { data: profilesCheck, error: profilesError } = await supabase
            .from('profiles')
            .select('employment_type')
            .limit(1);

        if (profilesError && !profilesError.message.includes('column')) {
            console.log('   ✅ Column exists');
        } else if (profilesError) {
            console.log('   ❌ Column NOT found:', profilesError.message);
        } else {
            console.log('   ✅ Column exists and queryable');
        }

        // 2. Check employee_default_schedules table
        console.log('\n2️⃣  Checking employee_default_schedules table...');
        const { data: schedulesCheck, error: schedulesError } = await supabase
            .from('employee_default_schedules')
            .select('*')
            .limit(1);

        if (!schedulesError || schedulesError.message.includes('no rows')) {
            console.log('   ✅ Table exists');
        } else {
            console.log('   ❌ Table NOT found:', schedulesError.message);
        }

        // 3. Check leave_requests table (updated)
        console.log('\n3️⃣  Checking leave_requests table (with new columns)...');
        const { data: leavesCheck, error: leavesError } = await supabase
            .from('leave_requests')
            .select('leave_type, start_time, end_time, duration_hours, approved_by')
            .limit(1);

        if (!leavesError || leavesError.message.includes('no rows')) {
            console.log('   ✅ Table updated successfully');
        } else {
            console.log('   ⚠️  Some columns missing:', leavesError.message);
        }

        // 4. Check daily_work_summary table
        console.log('\n4️⃣  Checking daily_work_summary table...');
        const { data: summaryCheck, error: summaryError } = await supabase
            .from('daily_work_summary')
            .select('*')
            .limit(1);

        if (!summaryError || summaryError.message.includes('no rows')) {
            console.log('   ✅ Table exists');
        } else {
            console.log('   ❌ Table NOT found:', summaryError.message);
        }

        // 5. Check company_schedule_config table
        console.log('\n5️⃣  Checking company_schedule_config table...');
        const { data: configCheck, error: configError } = await supabase
            .from('company_schedule_config')
            .select('*');

        if (!configError) {
            console.log(`   ✅ Table exists with ${configCheck?.length || 0} config entries`);
            if (configCheck && configCheck.length > 0) {
                console.log('   📋 Default configs:');
                configCheck.forEach(c => {
                    console.log(`      - ${c.config_key}: ${JSON.stringify(c.config_value)}`);
                });
            }
        } else {
            console.log('   ❌ Table NOT found:', configError.message);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration verification completed!\n');

    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyMigration();

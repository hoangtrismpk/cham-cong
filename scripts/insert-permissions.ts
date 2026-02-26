import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Adding more granular settings permissions...");
    // Cleanup old incorrect IDs FIRST to avoid unique constraint violations
    await supabase.from('available_permissions').delete().in('id', [
        'settings_1', 'settings_2', 'settings_3', 'settings_4', 'settings_5', 'settings_6', 'my_team_1'
    ]);

    const { data, error } = await supabase.from('available_permissions').upsert([
        // Settings Categories
        { id: 'settings_organization.manage', resource: 'settings_organization', action: 'manage', display_name: 'Quản lý Cài đặt Tổ chức', category: 'settings' },
        { id: 'settings_security.manage', resource: 'settings_security', action: 'manage', display_name: 'Quản lý Cài đặt Bảo mật', category: 'settings' },
        { id: 'settings_notifications.manage', resource: 'settings_notifications', action: 'manage', display_name: 'Quản lý Cài đặt Thông báo', category: 'settings' },
        { id: 'settings_email.manage', resource: 'settings_email', action: 'manage', display_name: 'Quản lý Cài đặt Email', category: 'settings' },
        { id: 'settings_feature_toggles.manage', resource: 'settings_feature_toggles', action: 'manage', display_name: 'Bật/Tắt Tính năng hệ thống', category: 'settings' },
        { id: 'settings_integrations.manage', resource: 'settings_integrations', action: 'manage', display_name: 'Quản lý Tích hợp', category: 'settings' },
        // My Team Category
        { id: 'my_team.view', resource: 'my_team', action: 'view', display_name: 'Xem danh sách Đội ngũ (Của tôi)', category: 'users' }
    ], { onConflict: 'id' });

    if (error) {
        console.error("Error inserting permissions:", error);
    } else {
        console.log("Success!");
    }
}

main();

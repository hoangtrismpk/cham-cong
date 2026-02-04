
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

const supabaseUrl = 'https://uffyhbinfvivqnjrhvvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnloYmluZnZpdnFuanJodnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjI2ODYsImV4cCI6MjA4NTYzODY4Nn0.0ejBmF2xzMAsX4S7v52rLIhMxW-kLiu4nM3rPkHSqJY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

async function sendTestNotification() {
    console.log('--- Sending Test Notification ---');

    const email = 'hoangtri@fhbvietnam.com';

    // 1. Get User ID - Quick & Dirty Listing
    // Since 'profiles' table doesn't have email column and we are anon, we can't search by email directly.
    // Let's filter by full_name or just list them.

    // Test: Find by full_name equivalent to the likely user
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log('--- Scanning Profiles ---');
    // Manual mapping (Normally we would use Admin Auth Client to find UID by Email)
    const targetUser = profiles.find(p => p.full_name === 'Hoàng Trí' || p.full_name === 'Admin' || p.email === email);
    // Note: p.email won't exist on profile object based on previous error.

    if (!targetUser) {
        console.log('Could not automatically find user with that name. Here are available users:');
        profiles.forEach(p => console.log(`- ${p.full_name} (${p.id})`));
        console.log('Please update script with correct UUID.');
        return;
    }

    console.log(`Found Target User: ${targetUser.full_name} (${targetUser.id})`);
    const userId = targetUser.id;


    // 2. Get FCM Tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', userId);

    if (tokenError) {
        console.error('Error fetching tokens:', tokenError.message);
        return;
    }

    if (!tokens || tokens.length === 0) {
        console.log('No FCM tokens found for this user. Has he logged in on mobile yet?');
        return;
    }

    console.log(`Found ${tokens.length} tokens.`);

    // 3. Send Notification
    const message = {
        notification: {
            title: '🔥 Test Notification',
            body: `Xin chào ${targetUser.full_name}, đây là tin nhắn test từ Tiger!`,
        },
        data: {
            url: '/',
            test: 'true'
        },
        tokens: tokens.map(t => t.token),
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent message: ${response.successCount} success, ${response.failureCount} failure`);
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Error sending to token ${idx}:`, resp.error);
                }
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

sendTestNotification();

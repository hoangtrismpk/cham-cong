
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const supabaseUrl = 'https://uffyhbinfvivqnjrhvvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnloYmluZnZpdnFuanJodnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA2MjY4NiwiZXhwIjoyMDg1NjM4Njg2fQ.Acmo_YlyR6Si1p6e9M_3OmuwyBism-w6b36ooYycubg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirect() {
    const userId = '5c318832-de71-40ff-acbd-d8ada7888119';

    console.log("Fetching latest token for user...");
    const { data: tokens } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!tokens || tokens.length === 0) {
        console.error("No tokens found!");
        return;
    }

    const targetToken = tokens[0].token;
    console.log("Target Token:", targetToken);

    const message = {
        notification: {
            title: '🐯 Tiger Test (Direct)',
            body: 'Nếu bạn thấy tin nhắn này, Firebase và Token của bạn HOÀN HẢO!',
        },
        token: targetToken,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Successfully sent message:', response);
    } catch (error) {
        console.error('❌ Error sending message:', error);
    }
}

testDirect();

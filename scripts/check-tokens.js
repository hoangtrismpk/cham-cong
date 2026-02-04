
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uffyhbinfvivqnjrhvvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnloYmluZnZpdnFuanJodnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjI2ODYsImV4cCI6MjA4NTYzODY4Nn0.0ejBmF2xzMAsX4S7v52rLIhMxW-kLiu4nM3rPkHSqJY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokens() {
    console.log('--- Checking ALL FCM Tokens ---');

    const { data: tokens, error } = await supabase
        .from('fcm_tokens')
        .select('*');

    if (error) {
        console.error('Error fetching tokens:', error.message);
        return;
    }

    console.log(`Total tokens found: ${tokens.length}`);
    if (tokens.length > 0) {
        console.log('Tokens:', tokens);
    } else {
        console.log('Table is empty.');
    }
}

checkTokens();

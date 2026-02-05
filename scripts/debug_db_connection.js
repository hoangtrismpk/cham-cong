
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:%40dminc76a111c0119@db.uffyhbinfvivqnjrhvvq.supabase.co:5432/postgres',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to Database');

        // Check FCM tokens
        const tokenRes = await client.query("SELECT count(*) FROM fcm_tokens");
        console.log('Total FCM tokens:', tokenRes.rows[0].count);

        // Check the specific user's token
        const userTokens = await client.query(`
        SELECT count(*) FROM fcm_tokens 
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hoangtri@fhbvietnam.com')
    `);
        console.log('Tokens for hoangtri@fhbvietnam.com:', userTokens.rows[0].count);

        // Check shifts for today
        const shiftRes = await client.query("SELECT * FROM work_schedules WHERE work_date = '2026-02-04' AND start_time = '16:45'");
        console.log('Shifts found for 16:45:', shiftRes.rows.length);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();


const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:%40dminc76a111c0119@db.uffyhbinfvivqnjrhvvq.supabase.co:5432/postgres',
});

async function debug() {
    try {
        await client.connect();
        console.log('--- DATABASE DEBUG ---');

        // 1. Check User
        const userRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'hoangtri@fhbvietnam.com'");
        if (userRes.rows.length === 0) {
            console.log('User not found in auth.users');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log('User ID:', userId);

        // 2. Check Tokens
        const tokenRes = await client.query("SELECT * FROM fcm_tokens WHERE user_id = $1", [userId]);
        console.log('FCM Tokens found:', tokenRes.rows.length);
        if (tokenRes.rows.length > 0) {
            tokenRes.rows.forEach(t => console.log(`- Token: ${t.token.substring(0, 20)}... (${t.device_type})`));
        }

        // 3. Check Shift for the current scanning window
        // Now is 16:52. The function checks for [now+5min, now+10min] -> 16:57 to 17:02
        // If shift is at 17:00, it SHOULD be found.
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
        const startTimeStart = formatter.format(new Date(now.getTime() + 5 * 60000));
        const startTimeEnd = formatter.format(new Date(now.getTime() + 10 * 60000));
        const targetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

        console.log(`Current Window: ${startTimeStart} - ${startTimeEnd} on ${targetDateStr}`);

        const shiftRes = await client.query(
            "SELECT * FROM work_schedules WHERE work_date = $1 AND start_time >= $2 AND start_time <= $3 AND user_id = $4",
            [targetDateStr, startTimeStart, startTimeEnd, userId]
        );
        console.log('Matching shifts:', shiftRes.rows.length);
        if (shiftRes.rows.length > 0) {
            shiftRes.rows.forEach(s => console.log(`- Shift ID: ${s.id} at ${s.start_time}`));
        }

    } catch (err) {
        console.error('Debug Error:', err.message);
    } finally {
        await client.end();
    }
}

debug();

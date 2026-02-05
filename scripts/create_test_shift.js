
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:@dminc76a111c0119@db.uffyhbinfvivqnjrhvvq.supabase.co:5432/postgres',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to Database');

        // 1. Get User ID
        const userRes = await client.query("SELECT id FROM auth.users WHERE email = 'hoangtri@fhbvietnam.com'");

        if (userRes.rows.length === 0) {
            console.error('User not found!');
            process.exit(1);
        }

        const userId = userRes.rows[0].id;
        console.log('Found User ID:', userId);

        // 2. Insert Shift
        // Time: 16:45 Today (2026-02-04)
        const query = `
      INSERT INTO work_schedules (user_id, work_date, start_time, end_time, shift_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, work_date, start_time;
    `;

        const values = [
            userId,
            '2026-02-04', // Today
            '16:45:00',   // Start Time
            '17:45:00',   // End Time
            'Test Push Notification'
        ];

        const res = await client.query(query, values);
        console.log('Shift created successfully:', res.rows[0]);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();

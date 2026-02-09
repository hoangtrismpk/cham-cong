require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase connection
});

async function run() {
    await client.connect();
    try {
        console.log(' applying migration...');
        const query = `
      ALTER TABLE public.work_reports DROP CONSTRAINT IF EXISTS work_reports_status_check;
      
      ALTER TABLE public.work_reports ADD CONSTRAINT work_reports_status_check 
          CHECK (status IN ('submitted', 'reviewed', 'approved', 'changes_requested', 'rejected'));
      
      ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
    `;

        await client.query(query);
        console.log('Migration applied successfully');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await client.end();
    }
}

run();

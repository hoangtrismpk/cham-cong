/**
 * Apply Migration Script using PostgreSQL client
 * Run: node scripts/apply-migration-pg.js <migration-file>
 * Example: node scripts/apply-migration-pg.js 20260207_employment_types_and_leaves.sql
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse Supabase URL to get connection string
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

// Extract project ref from URL (e.g., https://uffyhbinfvivqnjrhvvq.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

async function applyMigration(migrationFileName) {
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false // Supabase requires SSL
        }
    });

    try {
        console.log(`\n🚀 Applying migration: ${migrationFileName}\n`);
        console.log('🔌 Connecting to database...');

        await client.connect();
        console.log('✅ Connected successfully!\n');

        // Read migration file
        const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFileName);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration file loaded');
        console.log(`📊 SQL size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
        console.log('\n⏳ Executing migration...\n');

        // Execute the entire migration as a single transaction
        await client.query('BEGIN');

        try {
            await client.query(migrationSQL);
            await client.query('COMMIT');

            console.log('\n' + '='.repeat(50));
            console.log('✅ Migration applied successfully!');
            console.log('='.repeat(50) + '\n');

            return true;
        } catch (execError) {
            await client.query('ROLLBACK');
            console.error('\n❌ Error executing migration:', execError.message);
            console.error('\n🔄 Transaction rolled back\n');
            throw execError;
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        return false;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Main
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ Error: Please provide migration file name');
    console.error('Usage: node scripts/apply-migration-pg.js <migration-file.sql>');
    console.error('Example: node scripts/apply-migration-pg.js 20260207_employment_types_and_leaves.sql');
    process.exit(1);
}

applyMigration(migrationFile)
    .then((success) => {
        process.exit(success ? 0 : 1);
    });

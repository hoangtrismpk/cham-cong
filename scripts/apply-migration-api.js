/**
 * Apply Migration using Supabase Management API
 * Run: node scripts/apply-migration-api.js <migration-file>
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Management API credentials - Moved to environment variables for security
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.error('❌ Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in environment variables.');
    process.exit(1);
}

async function applyMigration(migrationFileName) {
    try {
        console.log(`\n🚀 Applying migration: ${migrationFileName}\n`);

        // Read migration file
        const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFileName);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration file loaded');
        console.log(`📊 SQL size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
        console.log('\n⏳ Executing migration via Supabase API...\n');

        // Execute SQL using Supabase Management API
        const response = await fetch(
            `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: migrationSQL
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error('\n❌ Error executing migration:');
            console.error(JSON.stringify(result, null, 2));
            return false;
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Migration applied successfully!');
        console.log('='.repeat(50) + '\n');

        if (result.result) {
            console.log('📊 Result:', result.result);
        }

        return true;

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        if (error.response) {
            console.error('Response:', await error.response.text());
        }
        return false;
    }
}

// Main
const migrationFile = process.argv[2] || '20260207_employment_types_and_leaves.sql';

console.log('🔑 Using Supabase Management API');
console.log(`📦 Project: ${PROJECT_REF}\n`);

applyMigration(migrationFile)
    .then((success) => {
        process.exit(success ? 0 : 1);
    });

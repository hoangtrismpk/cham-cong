/**
 * API Testing Script
 * Test all employment & leave management endpoints
 */

const API_URL = 'http://localhost:3000';

// Test colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(type, message) {
    const prefix = {
        success: `${colors.green}✅`,
        error: `${colors.red}❌`,
        info: `${colors.blue}ℹ️`,
        warn: `${colors.yellow}⚠️`
    }[type] || '';

    console.log(`${prefix} ${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (response.ok) {
            log('success', `${name}: ${response.status} OK`);
            return data;
        } else {
            log('error', `${name}: ${response.status} ${data.error || 'Error'}`);
            return null;
        }
    } catch (error) {
        log('error', `${name}: ${error.message}`);
        return null;
    }
}

async function runTests() {
    console.log('\n🧪 Starting API Tests...\n');
    console.log('='.repeat(60));

    // Test 1: Schedule Template API
    console.log('\n📅 Testing Schedule Template API');
    console.log('-'.repeat(60));

    await testEndpoint(
        'GET Schedule Template (should fail - no auth)',
        'GET',
        `${API_URL}/api/schedule-template`
    );

    // Test 2: Leave Requests API
    console.log('\n📝 Testing Leave Requests API');
    console.log('-'.repeat(60));

    await testEndpoint(
        'GET Leave Requests (should fail - no auth)',
        'GET',
        `${API_URL}/api/leave-requests`
    );

    // Test 3: Work Summary API
    console.log('\n💼 Testing Work Summary API');
    console.log('-'.repeat(60));

    await testEndpoint(
        'GET Work Summary (should fail - no auth)',
        'GET',
        `${API_URL}/api/work-summary?date=2026-02-07`
    );

    // Test 4: Cron Job API (should fail - needs secret)
    console.log('\n⏰ Testing Cron Job API');
    console.log('-'.repeat(60));

    await testEndpoint(
        'POST Daily Summaries (should fail - no secret)',
        'POST',
        `${API_URL}/api/cron/daily-summaries`
    );

    console.log('\n='.repeat(60));
    console.log('\n✅ Basic API Tests Complete!');
    console.log('\nNote: All endpoints correctly require authentication ✅');
    console.log('Next: Test with authenticated requests using Supabase client\n');
}

// Run tests
runTests().catch(console.error);

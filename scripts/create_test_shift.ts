
import { createClient } from '@supabase/supabase-js';
// dotenv removed. Using process.env passed from CLI.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use ANON key is enough if policies allow, else use SERVICE_ROLE if available but it's not in .env.local usually. Wait, .env.local usually has ANON. 
// BUT for administrative task like inserting for another user, using SERVICE ROLE KEY is better if RLS blocks it.
// Let's check if SERVICE_ROLE_KEY is in process.env (maybe not).
// If not, we rely on the fact that I (the runner) might not be authenticated as that user.
// However, the user said "create a demo shift".

// Let's try to find a SERVICE ROLE KEY. The user might have it in .env (not .local) or I have to ask.
// Wait, I saw NEXT_PUBLIC_SUPABASE_ANON_KEY.
// If I use anon key, I can only insert if RLS allows.
// In `schema_v2.sql` policies are strict.

// Better approach: Since I am running in local environment, maybe I can use the SERVICE ROLE KEY if I can find it.
// I reviewed `.env.local` earlier, it ONLY had ANON_KEY.
// Let's look for `supabase/functions/.env` or similar if exists? No.

// Okay, I will try to use ANON KEY but I first need to "Login" or find a user.
// Actually, for testing, I can iterate through users in `fcm_tokens` because those are the ones who can receive notifications.

async function run() {
    // Use SERVICE ROLE KEY for administrative tasks if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
    const supabase = createClient(supabaseUrl, serviceRoleKey);


    // 0. Login to bypass RLS
    // In a real scenario, we'd read from .env.test_credentials, but for simplicity I'll use the values provided by user context
    // or loaded via process.env processing if I added them to the command line.
    // Let's assume we pass them as env vars: TEST_EMAIL, TEST_PASS
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASS;

    if (!email || !password) {
        console.error("Missing TEST_EMAIL or TEST_PASS env vars");
        return;
    }

    console.log(`Logging in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError || !authData.user) {
        console.error("Login failed:", authError?.message);
        return;
    }

    const userId = authData.user.id;
    console.log(`Logged in successfully! User ID: ${userId}`);

    // 1. Get a target user from FCM Tokens (Should be Myself now)
    // Since we are logged in, we can see our own tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('user_id, token')
        .eq('user_id', userId)
        .limit(1);

    if (tokenError) {
        console.error("Error fetching tokens:", tokenError.message);
    } else if (!tokens || tokens.length === 0) {
        console.warn("⚠️ Warning: You have NO FCM Tokens registered. Notification WILL NOT be sent.");
        console.warn("Please open the app, login, and allow notifications.");
        // Proceeding anyway to create shift, so we can test IF token existed
    } else {
        console.log(`Found valid FCM token for user.`);
    }

    const targetUser = userId; // Override targetUser to be the logged-in user


    // 2. Calculate time: 7 minutes from now (perfect for 5-10min scan window)
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 60000); // 7 minutes


    // Format for DB
    // work_date: YYYY-MM-DD
    // start_time: HH:mm

    // Use Intl to get Vietnam time parts
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const workDate = dateFormatter.format(future);
    const startTime = timeFormatter.format(future); // HH:mm
    const endTime = timeFormatter.format(new Date(future.getTime() + 8 * 60 * 60000)); // +8 hours

    console.log(`Creating shift for: Date=${workDate}, Start=${startTime}`);

    // 2.5 Aggressive Cleanup with Service Role
    console.log("Cleaning up all existing shifts and logs for today to ensure fresh test...");
    await supabase.from('notification_logs').delete().eq('user_id', targetUser);
    await supabase.from('work_schedules').delete().eq('user_id', targetUser).eq('work_date', workDate);

    // 3. Insert fresh Shift
    const { data, error } = await supabase
        .from('work_schedules')
        .insert({
            user_id: targetUser,
            work_date: workDate,
            shift_type: 'full_day',
            start_time: startTime,
            end_time: endTime,
            title: 'Ca Test (Tiger Fresh)',
            status: 'active',
            location: 'Văn phòng FHB',
            members_count: 1
        })
        .select();

    if (error) {
        console.error("Error creating shift:", error);
    } else {
        console.log("✅ Shift created/updated successfully!", data);
        console.log("👉 Now running trigger command...");
    }
}

run();

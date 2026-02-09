import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TestNotificationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div className="p-10">Please login first</div>
    }

    // 1. Get notifications as USER (RLS applies)
    const { data: userNotifications, error: userError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

    // 2. Get notifications as ADMIN (Bypass RLS)
    const adminSupabase = createAdminClient()
    const { data: allNotifications, error: adminError } = await adminSupabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    // 3. Env Check
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // Action to test insert - Defined inside component scope to access 'user'
    async function testInsert() {
        'use server'

        if (!user) return // Safety check

        console.log('🧪 Testing Insert...')
        const sb = createAdminClient()

        // Try to insert with ALL columns including 'message'
        const { data, error } = await sb.from('notifications').insert({
            user_id: user.id, // Send to self
            type: 'report_updated', // Must match allowed types
            title: 'Test Notification ' + new Date().toLocaleTimeString(),
            message: 'This is a INSERT test to verify column message exists',
            content: 'This is a INSERT test (content column)', // REQUIRED: Add content
            is_read: false
        }).select().single()

        if (error) {
            console.error('❌ Insert Failed:', error)
            // If error is about missing column "message", we know the issue!
            throw new Error(`Insert Failed: ${error.message}`)
        }
        console.log('✅ Insert Success:', data)
    }

    return (
        <div className="p-10 space-y-8 bg-slate-950 min-h-screen text-slate-200 font-mono">
            <header className="flex items-center justify-between border-b border-slate-800 pb-6">
                <h1 className="text-2xl font-bold text-cyan-400">🕵️ Notification Debug Center</h1>
                <form action={async () => {
                    'use server'
                    await testInsert()
                    redirect('/test-notifications')
                }}>
                    <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                        <span>🧪 TEST INSERT WITH MESSAGE</span>
                    </button>
                </form>
            </header>

            <div className="grid grid-cols-2 gap-8">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h2 className="text-xl font-bold mb-4 text-emerald-400">👤 Current User Context</h2>
                    <div className="space-y-2 text-sm">
                        <p>User ID: <span className="text-orange-400">{user.id}</span></p>
                        <p>Email: <span className="text-orange-400">{user.email}</span></p>
                    </div>

                    <h3 className="mt-6 font-bold text-lg mb-2">My Notifications (RLS)</h3>
                    {userError ? (
                        <div className="text-red-500">Error: {userError.message}</div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-slate-500">Found: {userNotifications?.length || 0}</p>
                            {userNotifications?.map(n => (
                                <div key={n.id} className="bg-slate-800 p-2 rounded text-xs border border-slate-700">
                                    <p className="font-bold text-cyan-300">{n.title}</p>
                                    <p>{n.message || '(no message)'}</p>
                                    <p className="text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
                                    <p className="text-[10px] mt-1 text-slate-400">ID: {n.id}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 text-xs bg-red-900/50 text-red-200 font-bold">ADMIN VIEW</div>
                    <h2 className="text-xl font-bold mb-4 text-red-400">🛡️ System/Database View</h2>

                    <div className="mb-4">
                        <p>Has Service Key: {hasServiceKey ? '✅ YES' : '❌ NO'}</p>
                    </div>

                    <h3 className="mt-6 font-bold text-lg mb-2">Latest 20 Notifications (All Users)</h3>
                    {adminError ? (
                        <div className="text-red-500 bg-red-950 p-4 rounded">
                            Error: {adminError.message} <br />
                            Suggest: Check SUPABASE_SERVICE_ROLE_KEY in .env
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-slate-500">Total Visible: {allNotifications?.length || 0}</p>
                            {allNotifications?.map(n => (
                                <div key={n.id} className={`p-2 rounded text-xs border ${n.user_id === user.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>
                                    <div className="flex justify-between">
                                        <p className="font-bold text-cyan-300">{n.title}</p>
                                        <p className="text-[10px] bg-slate-700 px-1 rounded">{n.type}</p>
                                    </div>
                                    <p>{n.message || '(no message)'}</p>
                                    <p className="text-slate-500 mt-1">To User: <span className="text-orange-300">{n.user_id}</span></p>
                                    {n.user_id === user.id && <p className="text-emerald-400 font-bold">👈 THIS IS YOU</p>}
                                    <p className="text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

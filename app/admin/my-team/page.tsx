import { getMyTeamData } from '@/app/actions/my-team'
import { createClient } from '@/utils/supabase/server'
import MyTeamClient from './client-page'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/utils/auth-guard'

export default async function MyTeamPage() {
    await requirePermission('users.view', '/admin')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { team, stats, error } = await getMyTeamData()

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Không thể tải dữ liệu đội nhóm</h2>
                <p className="text-slate-400 mb-6 max-w-md">{error}</p>
                <div className="text-sm text-slate-600 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                    Error Code: FETCH_TEAM_FAILED
                </div>
            </div>
        )
    }

    return <MyTeamClient team={team} stats={stats} currentUserId={user.id} />
}

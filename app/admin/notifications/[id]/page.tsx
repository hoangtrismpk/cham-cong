
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
    Clock, CheckCircle, XCircle, ArrowLeft, Send, Users, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CampaignDetail {
    id: string
    title: string
    message: string
    link?: string
    status: string
    total_recipients: number
    success_count: number
    failure_count: number
    created_at: string
    scheduled_at?: string
    target_type: string
}

interface NotificationLog {
    id: string
    user: {
        id: string
        full_name: string
        department: string
    }
    status: string
    sent_at: string
    viewed_at?: string // In-app viewed
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
    const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
    const [logs, setLogs] = useState<NotificationLog[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()
    const { id } = params

    useEffect(() => {
        const load = async () => {
            setLoading(true)

            // 1. Get Campaign
            const { data: cData } = await supabase
                .from('notification_campaigns')
                .select('*')
                .eq('id', id)
                .single()

            if (cData) setCampaign(cData as CampaignDetail)

            // 2. Get Logs (Push Status) & In-App Status
            // This is tricky because logs are for push, notifications table is for in-app.
            // We want to see who received it.
            // Best is to join 'notification_logs' with 'profiles'

            const { data: lData } = await supabase
                .from('notification_logs')
                .select(`
                    id,
                    status,
                    sent_at,
                    user:profiles!inner(id, full_name, department)
                `)
                .eq('campaign_id', id)

            // Also check 'notifications' table for 'is_read' status if we want "Viewed" stats.
            // But notification_logs doesn't have "viewed".
            // We can fetch notifications table separately and merge by user_id?

            const { data: nData } = await supabase
                .from('notifications')
                .select('user_id, is_read, created_at')
                .eq('campaign_id', id)

            const readMap = new Map()
            nData?.forEach(n => {
                if (n.is_read) readMap.set(n.user_id, true)
            })

            const mergedLogs = lData?.map((l: any) => ({
                ...l,
                viewed_at: readMap.has(l.user.id) ? 'Yes' : undefined
            }))

            if (mergedLogs) setLogs(mergedLogs)

            setLoading(false)
        }
        load()
    }, [id])

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Đang tải...</div>

    if (!campaign) return <div className="min-h-screen flex items-center justify-center text-white">Không tìm thấy chiến dịch</div>

    return (
        <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
            <Button
                variant="ghost"
                className="mb-6 text-slate-400 hover:text-white pl-0 hover:bg-transparent"
                onClick={() => router.back()}
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Quay lại danh sách
            </Button>

            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="col-span-2 bg-[#0f1219] p-6 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
                        <StatusBadge status={campaign.status} />
                    </div>
                    <p className="text-slate-400 mb-6">{campaign.message}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <span className="text-slate-500 block mb-1">Mục tiêu</span>
                            <span className="text-white font-medium capitalize">{campaign.target_type}</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <span className="text-slate-500 block mb-1">Thời gian</span>
                            <span className="text-white font-medium">
                                {campaign.scheduled_at
                                    ? format(new Date(campaign.scheduled_at), 'HH:mm dd/MM/yyyy', { locale: vi })
                                    : format(new Date(campaign.created_at), 'HH:mm dd/MM/yyyy', { locale: vi })
                                }
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0f1219] p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4">Thống kê</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Tổng gửi
                            </span>
                            <span className="text-white font-mono text-lg">{campaign.total_recipients}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Thành công
                            </span>
                            <span className="text-emerald-400 font-mono text-lg">{campaign.success_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" /> Thất bại
                            </span>
                            <span className="text-red-400 font-mono text-lg">{campaign.failure_count}</span>
                        </div>
                        <div className="h-px bg-slate-800 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-blue-500" /> Đã xem (In-App)
                            </span>
                            <span className="text-blue-400 font-mono text-lg">
                                {logs.filter(l => l.viewed_at).length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0f1219] rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="font-bold text-white">Danh sách người nhận</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-[#161b2c] text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-3">Nhân viên</th>
                            <th className="px-6 py-3">Phòng ban</th>
                            <th className="px-6 py-3">Trạng thái gửi</th>
                            <th className="px-6 py-3">Đã xem</th>
                            <th className="px-6 py-3 text-right">Thời gian</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-800/30">
                                <td className="px-6 py-3 text-white font-medium text-sm">{log.user.full_name}</td>
                                <td className="px-6 py-3 text-slate-400 text-sm">{log.user.department}</td>
                                <td className="px-6 py-3">
                                    <Badge variant={log.status === 'sent' ? 'secondary' : 'destructive'} className={log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : ''}>
                                        {log.status === 'sent' ? 'Thành công' : 'Thất bại'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-3">
                                    {log.viewed_at ? (
                                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">Đã xem</Badge>
                                    ) : (
                                        <span className="text-slate-600 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-500 text-xs font-mono">
                                    {format(new Date(log.sent_at), 'HH:mm:ss', { locale: vi })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'draft': return <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 font-medium">Nháp</span>
        case 'scheduled': return <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 font-medium">Đã hẹn giờ</span>
        case 'processing': return <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 animate-pulse font-medium">Đang gửi</span>
        case 'completed': return <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 font-medium">Hoàn thành</span>
        case 'sent': return <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 font-medium">Đã gửi</span>
        case 'failed': return <span className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 font-medium">Lỗi</span>
        default: return <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 font-medium">{status}</span>
    }
}

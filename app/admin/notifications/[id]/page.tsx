'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
    ArrowLeft, Users, CheckCircle, XCircle, Eye, MousePointerClick, Smartphone, Loader2, Search, Download, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts'


// --- Interfaces ---
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
    target_type: 'all' | 'role' | 'department' | 'specific_users'
    target_value?: any
}

interface UserProfile {
    id: string
    full_name: string
    department: string
    avatar_url?: string
    employee_code?: string
    job_title?: string
}

interface LogEntry {
    user_id: string
    user?: UserProfile
    status: 'sent' | 'failed' | 'pending' | 'no_token'
    sent_at?: string
    viewed_at?: string // From In-App Read
    clicked_at?: string // From Push Click or In-App Click
    device?: string // From FCM tokens
    failure_reason?: string
}

// --- Colors ---
const COLORS = {
    sent: '#10b981', // emerald-500
    failed: '#ef4444', // red-500
    pending: '#64748b', // slate-500
    viewed: '#3b82f6', // blue-500
    clicked: '#8b5cf6', // violet-500
    ignored: '#334155', // slate-700,
    no_token: '#f59e0b' // amber-500
}

const ITEMS_PER_PAGE = 20

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
    const [details, setDetails] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const router = useRouter()
    const supabase = createClient()

    // Unwrap params
    const [campaignId, setCampaignId] = useState<string>('')
    useEffect(() => {
        params.then(p => setCampaignId(p.id))
    }, [params])

    useEffect(() => {
        if (!campaignId) return

        const loadData = async () => {
            setLoading(true)
            try {
                // 1. Fetch Campaign Info
                const { data: cData, error: cError } = await supabase
                    .from('notification_campaigns')
                    .select('*')
                    .eq('id', campaignId)
                    .single()

                if (cError) throw cError
                const campaignInfo = cData as CampaignDetail
                setCampaign(campaignInfo)

                // 2. Determine Intended Recipients
                let recipients: UserProfile[] = []

                let query = supabase.from('profiles').select('id, full_name, department, employee_code, job_title, avatar_url').eq('status', 'active')

                if (campaignInfo.target_type === 'all') {
                    // Fetch all active profiles
                } else if (campaignInfo.target_type === 'role') {
                    // Check if target_value is role string or ID. Assuming role name string based on options logic.
                    // Or role_id if new logic. Let's assume 'role' column match for now.
                    if (campaignInfo.target_value) {
                        query = query.eq('role', campaignInfo.target_value)
                    }
                } else if (campaignInfo.target_type === 'department') {
                    if (campaignInfo.target_value) {
                        query = query.eq('department', campaignInfo.target_value)
                    }
                } else if (campaignInfo.target_type === 'specific_users') {
                    const userIds = Array.isArray(campaignInfo.target_value) ? campaignInfo.target_value : []
                    if (userIds.length > 0) {
                        query = query.in('id', userIds)
                    } else {
                        // Empty specific users?
                        recipients = []
                    }
                }

                const { data: profilesData, error: pError } = await query
                if (pError) throw pError
                recipients = (profilesData as UserProfile[]) || []


                // 3. Parallel Fetch: Logs, Notifications, FCM Tokens
                const [logsRes, notifRes, tokensRes] = await Promise.all([
                    supabase
                        .from('notification_logs')
                        .select('user_id, status, sent_at, clicked_at')
                        .eq('campaign_id', campaignId),
                    supabase
                        .from('notifications')
                        .select('user_id, is_read, created_at, clicked_at')
                        .eq('campaign_id', campaignId),
                    supabase
                        .from('fcm_tokens')
                        .select('user_id, device_type')
                        .in('user_id', recipients.map(r => r.id))
                ])

                if (logsRes.error) throw logsRes.error
                if (notifRes.error) throw notifRes.error

                // 4. Process Data Mappings
                const logsMap = new Map(logsRes.data?.map((l: any) => [l.user_id, l]))
                const notifMap = new Map(notifRes.data?.map((n: any) => [n.user_id, n]))

                const deviceMap = new Map<string, string[]>()
                tokensRes.data?.forEach((t: any) => {
                    if (!t.device_type) return;
                    const devices = deviceMap.get(t.user_id) || []
                    if (!devices.includes(t.device_type)) {
                        devices.push(t.device_type)
                    }
                    deviceMap.set(t.user_id, devices)
                })

                // 5. Construct Final List
                const combinedDetails: LogEntry[] = recipients.map(user => {
                    const log = logsMap.get(user.id)
                    const notif = notifMap.get(user.id)
                    const userDevices = deviceMap.get(user.id)

                    // Default Status
                    // If log exists, use its status
                    // If no log, but campaign is completed -> 'failed' (likely no token)
                    // If no log, campaign processing -> 'pending'
                    let status: LogEntry['status'] = 'pending'
                    let failureReason = ''

                    if (log) {
                        status = log.status as any
                    } else {
                        if (campaignInfo.status === 'completed') {
                            status = 'failed' // Or 'no_token' specifically
                            if (!userDevices || userDevices.length === 0) failureReason = 'Không tìm thấy Token thiết bị'
                            else failureReason = 'Lỗi không xác định (Không có log)'
                        } else if (campaignInfo.status === 'failed') {
                            status = 'failed'
                        }
                    }

                    const deviceString = userDevices && userDevices.length > 0
                        ? userDevices.join(', ')
                        : (status === 'sent' ? 'Thiết bị không xác định' : 'N/A')

                    return {
                        user_id: user.id,
                        user: user,
                        status: status,
                        sent_at: log?.sent_at,
                        clicked_at: log?.clicked_at || notif?.clicked_at,
                        viewed_at: notif?.is_read ? notif.created_at : undefined, // Proxy read time
                        device: deviceString,
                        failure_reason: failureReason
                    }
                })

                setDetails(combinedDetails)

            } catch (error) {
                console.error("Error loading campaign details:", error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [campaignId])

    // --- Derived Stats ---
    const stats = useMemo(() => {
        const total = details.length
        const success = details.filter(d => d.status === 'sent').length
        const failed = details.filter(d => d.status === 'failed' || d.status === 'no_token').length
        const viewed = details.filter(d => d.viewed_at || d.clicked_at).length // Click implies view
        const clicked = details.filter(d => d.clicked_at).length

        // Accurate totals for charts
        return { total, success, failed, viewed, clicked }
    }, [details])

    // --- Charts Data ---
    const pieDataStatus = [
        { name: 'Thành công', value: stats.success, color: COLORS.sent },
        { name: 'Thất bại (Lỗi/Không Token)', value: stats.failed, color: COLORS.failed },
        { name: 'Đang xử lý', value: stats.total - stats.success - stats.failed, color: COLORS.pending }
    ].filter(d => d.value > 0)

    const pieDataInteraction = [
        { name: 'Đã click', value: stats.clicked, color: COLORS.clicked },
        { name: 'Đã xem', value: stats.viewed - stats.clicked, color: COLORS.viewed },
        { name: 'Chưa xem', value: stats.success - stats.viewed, color: COLORS.ignored },
    ].filter(d => d.value > 0)


    // --- Filtering & Pagination ---
    const filteredDetails = useMemo(() => {
        return details.filter(d =>
            d.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.user?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [details, searchTerm])

    const totalPages = Math.ceil(filteredDetails.length / ITEMS_PER_PAGE)
    const paginatedDetails = filteredDetails.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    // --- Export Excel ---

    const handleExport = () => {
        if (!campaign) return

        const exportData = details.map(d => ({
            empCode: d.user?.employee_code || '',
            fullName: d.user?.full_name || '',
            department: d.user?.department || '',
            status: d.status === 'sent' ? 'Thành công' : 'Thất bại',
            reason: d.failure_reason || '',
            device: d.device || 'N/A',
            viewed: d.viewed_at || d.clicked_at ? 'Có' : 'Không',
            clicked: d.clicked_at ? 'Có' : 'Không',
            sentTime: d.sent_at ? format(new Date(d.sent_at), 'HH:mm:ss dd/MM/yyyy') : '',
            viewTime: d.viewed_at ? format(new Date(d.viewed_at), 'HH:mm:ss dd/MM/yyyy') : '',
        }))

        const columns = [
            { header: 'Mã NV', key: 'empCode', width: 15 },
            { header: 'Họ và tên', key: 'fullName', width: 25 },
            { header: 'Phòng ban', key: 'department', width: 20 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Lý do lỗi', key: 'reason', width: 30 },
            { header: 'Thiết bị', key: 'device', width: 15 },
            { header: 'Đã xem', key: 'viewed', width: 10 },
            { header: 'Đã Click', key: 'clicked', width: 10 },
            { header: 'Thời gian Gửi', key: 'sentTime', width: 20 },
            { header: 'Thời gian Xem', key: 'viewTime', width: 20 }
        ]

        import('@/lib/export-utils').then(({ exportToExcel }) => {
            exportToExcel(exportData, `Report_${campaign.title}_${format(new Date(), 'yyyyMMdd')}.xlsx`, 'Baocao_ChienDich', columns)
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f1219]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-slate-400">Đang tải dữ liệu chiến dịch...</p>
                </div>
            </div>
        )
    }

    if (!campaign) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1219] text-white gap-4">
                <p>Không tìm thấy chiến dịch (ID: {campaignId})</p>
                <Button onClick={() => router.back()}>Quay lại</Button>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                    <Button
                        variant="ghost"
                        className="text-slate-400 hover:text-white pl-0 -ml-2 hover:bg-transparent"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại danh sách
                    </Button>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{campaign.title}</h1>
                    <div className="flex items-center gap-3 text-slate-400 text-sm flex-wrap">
                        <StatusBadge status={campaign.status} />
                        <span>•</span>
                        <span>{format(new Date(campaign.created_at), 'HH:mm dd/MM/yyyy', { locale: vi })}</span>
                        <span>•</span>
                        <span className="capitalize">
                            {campaign.target_type === 'all' ? 'Tất cả nhân viên' :
                                campaign.target_type === 'specific_users' ? 'Nhân viên cụ thể' :
                                    `${campaign.target_type}: ${campaign.target_value}`}
                        </span>
                    </div>
                </div>
                <Button onClick={handleExport} variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white gap-2">
                    <Download className="w-4 h-4" />
                    Xuất Báo Cáo
                </Button>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Tổng đã gửi"
                    value={stats.total}
                    subValue={`${((stats.success / (stats.total || 1)) * 100).toFixed(1)}% Thành công`}
                    icon={<Users className="w-4 h-4 text-slate-400" />}
                />
                <StatsCard
                    title="Đã xem (Open Rate)"
                    value={stats.viewed}
                    subValue={`${((stats.viewed / (stats.success || 1)) * 100).toFixed(1)}%`}
                    icon={<Eye className="w-4 h-4 text-blue-400" />}
                    trend="active"
                />
                <StatsCard
                    title="Đã Click (CTR)"
                    value={stats.clicked}
                    subValue={`${((stats.clicked / (stats.viewed || 1)) * 100).toFixed(1)}% của người xem`}
                    icon={<MousePointerClick className="w-4 h-4 text-violet-400" />}
                    trend="positive"
                />
                <StatsCard
                    title="Thất bại (Bounce)"
                    value={stats.failed}
                    subValue="Lỗi gửi Push / Không Token"
                    icon={<XCircle className="w-4 h-4 text-red-400" />}
                    trend="negative"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#161b2c] border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Trạng thái Gửi</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieDataStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieDataStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-[#161b2c] border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Tương tác Người dùng</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieDataInteraction}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieDataInteraction.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed List */}
            <Card className="bg-[#161b2c] border-slate-800">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <CardTitle className="text-white text-lg">Chi tiết Người nhận ({filteredDetails.length})</CardTitle>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm nhân viên..."
                            className="pl-9 bg-slate-900 border-slate-700 text-white h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow className="hover:bg-slate-900 border-slate-800">
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider w-[250px]">Nhân viên</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider">Trạng thái</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider">Thiết bị</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider text-center">Đã Xem</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider text-center">Click Link</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider text-right">Thời gian Gửi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedDetails.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            Không tìm thấy kết quả phù hợp.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedDetails.map((item) => (
                                        <TableRow key={item.user_id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                                                        {item.user?.avatar_url ? (
                                                            <img src={item.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            item.user?.full_name?.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white text-sm truncate">{item.user?.full_name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{item.user?.employee_code} • {item.user?.department}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge
                                                        variant="secondary"
                                                        className={item.status === 'sent'
                                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 w-fit'
                                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 w-fit'}
                                                    >
                                                        {item.status === 'sent' ? 'Thành công' : 'Thất bại'}
                                                    </Badge>
                                                    {item.failure_reason && (
                                                        <span className="text-[10px] text-red-400 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> {item.failure_reason}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    <Smartphone className="w-3.5 h-3.5" />
                                                    <span className="capitalize">{item.device}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.viewed_at || item.clicked_at ? (
                                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.clicked_at ? (
                                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/10 text-violet-400" title={format(new Date(item.clicked_at), 'HH:mm dd/MM')}>
                                                        <MousePointerClick className="w-3.5 h-3.5" />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-slate-400 font-mono">
                                                {item.sent_at ? format(new Date(item.sent_at), 'HH:mm:ss dd/MM', { locale: vi }) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="bg-slate-900 border-slate-700 text-white"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-slate-400">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="bg-slate-900 border-slate-700 text-white"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
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

function StatsCard({ title, value, subValue, icon, trend }: any) {
    return (
        <Card className="bg-[#161b2c] border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className={`text-xs mt-1 ${trend === 'positive' ? 'text-emerald-400' :
                    trend === 'negative' ? 'text-red-400' :
                        trend === 'active' ? 'text-blue-400' :
                            'text-slate-500'
                    }`}>
                    {subValue}
                </p>
            </CardContent>
        </Card>
    )
}

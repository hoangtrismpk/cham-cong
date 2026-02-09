'use client'

import { WorkReport } from '@/app/actions/work-reports'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useState, useEffect, useMemo } from 'react'
import {
    FileText, TrendingUp, CheckCircle, AlertCircle,
    Eye, Download, ChevronDown, Filter, Search,
    MoreVertical, ChevronLeft, ChevronRight,
    Calendar, User, Clock, Tag, Layers
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { getGlobalReportExport } from '@/app/actions/work-reports-admin'
import ReportDetailModal from './report-detail-modal'
import { createClient } from '@/utils/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface Props {
    reports: WorkReport[]
    total: number
    stats: {
        totalReports: number
        completionRate: number
        onTimeRate: number
        lateRate: number
        dailyTrend?: any[]
    }
    currentPage: number
    filters: {
        month: number
        year: number
        status?: string
        type?: string
    }
}

const PAGE_SIZE = 10

export default function AdminReportsDashboard({ reports: initialReports, total, stats, currentPage, filters }: Props) {
    const router = useRouter()
    const [reports, setReports] = useState<WorkReport[]>(initialReports)
    const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Realtime subscription
    useEffect(() => {
        const supabase = createClient()
        setReports(initialReports)

        const channel = supabase
            .channel('admin-reports-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'work_reports' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updatedRecord = payload.new as WorkReport
                        setReports(prev => prev.map(r =>
                            r.id === updatedRecord.id
                                ? { ...r, ...updatedRecord, user: r.user } // Keep user info
                                : r
                        ))
                    } else if (payload.eventType === 'INSERT') {
                        router.refresh()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [initialReports, router])

    // Logic for local filtering and sorting
    // This ensures Realtime updates immediately hide/resort items based on active filters
    const processedReports = useMemo(() => {
        let result = [...reports]

        // 1. Local filtering by status (mirroring server logic)
        if (filters.status) {
            switch (filters.status) {
                case 'unread':
                    result = result.filter(r => !r.admin_viewed)
                    break
                case 'updated':
                    result = result.filter(r => r.is_resubmitted)
                    break
                case 'viewed':
                    result = result.filter(r => r.admin_viewed && !r.is_resubmitted)
                    break
                default:
                    result = result.filter(r => r.status === filters.status)
            }
        }

        // 2. Local filtering by type
        if (filters.type) {
            result = result.filter(r => r.report_type === filters.type)
        }

        // 3. Local search
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(r =>
                r.user?.full_name?.toLowerCase().includes(q) ||
                r.content?.toLowerCase().includes(q)
            )
        }

        // 4. Sorting logic: Unread > Updated > Newest
        return result.sort((a, b) => {
            if (a.admin_viewed !== b.admin_viewed) {
                return a.admin_viewed ? 1 : -1
            }
            if (a.is_resubmitted !== b.is_resubmitted) {
                return a.is_resubmitted ? -1 : 1
            }
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        })
    }, [reports, filters, searchQuery])

    const handleExport = async () => {
        try {
            const data = await getGlobalReportExport(filters.month, filters.year)
            if (data.length === 0) return

            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Bao Cao")

            // Set column widths
            const wscols = [
                { wch: 15 }, // Mã NV
                { wch: 25 }, // Họ tên
                { wch: 20 }, // Phòng ban
                { wch: 20 }, // Số báo cáo phải nộp
                { wch: 15 }, // Báo cáo ngày
                { wch: 15 }, // Báo cáo tuần
                { wch: 15 }, // Báo cáo tháng
                { wch: 20 }  // Tỉ lệ đúng hạn
            ]
            worksheet['!cols'] = wscols

            XLSX.writeFile(workbook, `Bao_Cao_Tong_Hop_Thang_${filters.month}_${filters.year}.xlsx`)
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    const getStatusLabel = (status: string | undefined) => {
        if (!status) return 'Trạng thái'
        switch (status) {
            case 'unread': return 'Chưa xem'
            case 'updated': return 'Có cập nhật'
            case 'viewed': return 'Đã xem'
            case 'approved': return 'Đã duyệt'
            case 'changes_requested': return 'Yêu cầu sửa'
            default: return status
        }
    }

    const getTypeLabel = (type: string | undefined) => {
        if (!type) return 'Loại báo cáo'
        switch (type) {
            case 'daily': return 'Báo cáo Ngày'
            case 'weekly': return 'Báo cáo Tuần'
            case 'monthly': return 'Báo cáo Tháng'
            case 'makeup': return 'Báo cáo Bù'
            default: return type
        }
    }

    const setStatusFilter = (status: string | null) => {
        const params = new URLSearchParams(window.location.search)
        if (status) params.set('status', status)
        else params.delete('status')
        params.set('page', '1')
        router.push(`/admin/reports?${params.toString()}`, { scroll: false })
    }

    const setTypeFilter = (type: string | null) => {
        const params = new URLSearchParams(window.location.search)
        if (type) params.set('type', type)
        else params.delete('type')
        params.set('page', '1')
        router.push(`/admin/reports?${params.toString()}`, { scroll: false })
    }

    const navigateToPage = (pageNum: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', pageNum.toString())
        router.push(`/admin/reports?${params.toString()}`, { scroll: false })
    }

    const handleMonthYearChange = (m: string, y: string) => {
        const params = new URLSearchParams(window.location.search)
        params.set('month', m)
        params.set('year', y)
        params.set('page', '1')
        router.push(`/admin/reports?${params.toString()}`, { scroll: false })
    }

    const chartData = stats.dailyTrend || []

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Quản lý Báo cáo</h1>
                    <p className="text-slate-400 font-medium tracking-wide">Phân tích hiệu suất và phê duyệt báo cáo công việc nhân viên.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="h-12 bg-[#1a1f2e] border-slate-700 text-slate-300 hover:bg-slate-800 rounded-2xl px-6 font-bold shadow-xl transition-all"
                    >
                        <Download className="w-4 h-4 mr-2 text-primary" />
                        Xuất báo cáo
                    </Button>
                    <div className="relative group">
                        <select
                            value={`${filters.month}-${filters.year}`}
                            onChange={(e) => {
                                const [m, y] = e.target.value.split('-')
                                handleMonthYearChange(m, y)
                            }}
                            className="h-12 px-6 bg-[#1a1f2e] border border-slate-700 text-white rounded-2xl focus:outline-none focus:border-primary font-black shadow-xl appearance-none cursor-pointer pr-12 transition-all hover:bg-slate-800"
                        >
                            <option value={`${new Date().getMonth() + 1}-${new Date().getFullYear()}`}>Tháng này</option>
                            <option value={`${new Date().getMonth()}-${new Date().getFullYear()}`}>Tháng trước</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tổng báo cáo', value: stats.totalReports, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'Monthly Total' },
                    { label: 'Hoàn thành', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: '+2.4% vs last mo' },
                    { label: 'Đúng hạn', value: `${stats.onTimeRate}%`, icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/20', trend: 'Consistency Level' },
                    { label: 'Gửi muộn', value: `${stats.lateRate}%`, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 'Review needed' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-[#1a1f2e] border-slate-800/80 p-6 rounded-[32px] overflow-hidden relative group hover:border-primary/40 transition-all shadow-2xl">
                        <div className={`absolute -top-4 -right-4 w-20 h-20 ${stat.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity`} />
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">{stat.label}</p>
                                <p className="text-3xl font-black text-white">{stat.value}</p>
                                <p className="text-[10px] text-slate-500 mt-2 font-bold">{stat.trend}</p>
                            </div>
                            <div className={`p-3 ${stat.bg} rounded-2xl`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Chart Area */}
            <Card className="bg-[#1a1f2e] border-slate-800/80 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">Thống kê gửi báo cáo</h3>
                        <p className="text-slate-400 text-sm font-medium mt-1">Xu hướng hoàn thành công việc theo từng ngày</p>
                    </div>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} opacity={0.2} />
                            <XAxis dataKey="day" stroke="#475569" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis stroke="#475569" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} dx={-10} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e293b', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                            />
                            <Bar dataKey="onTime" fill="#00d694" radius={[6, 6, 0, 0]} barSize={16} />
                            <Bar dataKey="late" fill="#475569" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* List Section */}
            <div className="space-y-4">
                {/* Search & Filter Bar */}
                <Card className="bg-[#1a1f2e] border-slate-800/80 p-5 rounded-[28px] shadow-xl">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Tìm kiếm theo tên hoặc nội dung báo cáo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-12 bg-[#0d1117] border-slate-700/80 text-white rounded-2xl focus:ring-primary/20 focus:border-primary/50 transition-all font-medium py-6"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* Type Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-12 bg-[#0d1117] border-slate-700 text-slate-300 hover:text-white hover:border-primary/50 rounded-2xl px-6 min-w-[160px] justify-between shadow-lg group">
                                        <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-wider">
                                            <Layers className="w-4 h-4 text-purple-500" />
                                            {getTypeLabel(filters.type)}
                                        </div>
                                        <ChevronDown className="w-4 h-4 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2 bg-[#1a1f2e] border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden" align="end" sideOffset={10}>
                                    <p className="text-[10px] font-bold text-slate-500 px-4 py-3 border-b border-slate-800/50 mb-1 uppercase tracking-widest">Loại báo cáo</p>
                                    <div className="space-y-1">
                                        <button onClick={() => setTypeFilter(null)} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium cursor-pointer">Tất cả</button>
                                        <button onClick={() => setTypeFilter('daily')} className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors font-semibold cursor-pointer">Báo cáo Ngày</button>
                                        <button onClick={() => setTypeFilter('weekly')} className="w-full text-left px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors font-semibold cursor-pointer">Báo cáo Tuần</button>
                                        <button onClick={() => setTypeFilter('monthly')} className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-xl transition-colors font-semibold cursor-pointer">Báo cáo Tháng</button>
                                        <button onClick={() => setTypeFilter('makeup')} className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 rounded-xl transition-colors font-semibold cursor-pointer">Báo cáo Bù</button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Status Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-12 bg-[#0d1117] border-slate-700 text-slate-300 hover:text-white hover:border-primary/50 rounded-2xl px-6 min-w-[180px] justify-between shadow-lg group">
                                        <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-wider">
                                            <Filter className="w-4 h-4 text-primary" />
                                            {getStatusLabel(filters.status)}
                                        </div>
                                        <ChevronDown className="w-4 h-4 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2 bg-[#1a1f2e] border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden" align="end" sideOffset={10}>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-blue-500/50" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-3 border-b border-slate-800/50 mb-1">Trạng thái xử lý</p>
                                    <div className="space-y-1">
                                        <button onClick={() => setStatusFilter(null)} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium cursor-pointer">Tất cả báo cáo</button>
                                        <button onClick={() => setStatusFilter('unread')} className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors flex items-center justify-between font-semibold cursor-pointer">Chưa xem <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" /></button>
                                        <button onClick={() => setStatusFilter('updated')} className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors flex items-center justify-between font-semibold cursor-pointer">Có cập nhật <span className="h-2 w-2 rounded-full bg-amber-500" /></button>
                                        <button onClick={() => setStatusFilter('viewed')} className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 rounded-xl transition-colors font-medium cursor-pointer italic">Đã xem ổn định</button>
                                        <div className="h-px bg-slate-800/50 my-1 mx-2" />
                                        <button onClick={() => setStatusFilter('approved')} className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-green-500/10 rounded-xl transition-colors font-semibold cursor-pointer">Đã phê duyệt</button>
                                        <button onClick={() => setStatusFilter('changes_requested')} className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold cursor-pointer">Cần chỉnh sửa</button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </Card>

                {/* Main Table Content */}
                <Card className="bg-[#1a1f2e] border-slate-800/80 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800/50 bg-[#161b26]">
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-500 tracking-wider w-[80px]">User</th>
                                    <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-500 tracking-wider">Họ tên & Phòng ban</th>
                                    <th className="px-8 py-5 text-center text-[11px] font-bold text-slate-500 tracking-wider">Ngày & Loại</th>
                                    <th className="px-8 py-5 text-center text-[11px] font-bold text-slate-500 tracking-wider">Tình trạng</th>
                                    <th className="px-8 py-5 text-center text-[11px] font-bold text-slate-500 tracking-wider">Giờ nộp</th>
                                    <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-500 tracking-wider w-[100px]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {processedReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center text-slate-500 font-black italic uppercase tracking-widest opacity-50">
                                            Không có báo cáo nào khả dụng
                                        </td>
                                    </tr>
                                ) : (
                                    processedReports.map((report) => (
                                        <tr
                                            key={report.id}
                                            className={`transition-all border-l-4 ${!report.admin_viewed
                                                ? 'bg-blue-600/[0.04] border-l-blue-600 hover:bg-blue-600/[0.1] active:bg-blue-600/[0.15]'
                                                : 'hover:bg-slate-800/30 border-l-transparent active:bg-slate-800/50'
                                                } group cursor-pointer`}
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#2a2f3e] to-[#1a1f2e] border border-slate-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-slate-800 group-hover:ring-primary/50 transition-all overflow-hidden">
                                                    {report.user?.avatar_url ? (
                                                        <img src={report.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        report.user?.full_name?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5 group">
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/reports/employee/${report.user_id}`); }}
                                                        className="text-sm font-black text-white group-hover:text-primary transition-colors tracking-tight cursor-pointer hover:underline decoration-primary/30 underline-offset-4"
                                                    >
                                                        {report.user?.full_name || 'Hệ thống'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold italic tracking-wide">
                                                        {(report.user as any)?.department || 'Phòng ban trống'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-1 text-slate-300 font-bold text-xs uppercase tracking-tighter">
                                                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                                                        {format(new Date(report.report_date), 'dd/MM/yyyy')}
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border ${report.report_type === 'daily' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        report.report_type === 'weekly' ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' :
                                                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                        }`}>
                                                        {report.report_type === 'daily' ? 'Báo cáo ngày' : report.report_type === 'weekly' ? 'Báo cáo tuần' : 'Báo cáo bù'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-wide border ${new Date(report.created_at).toDateString() === new Date(report.report_date).toDateString()
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${new Date(report.created_at).toDateString() === new Date(report.report_date).toDateString() ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                                                        {new Date(report.created_at).toDateString() === new Date(report.report_date).toDateString() ? 'Đúng hạn' : 'Nộp bù'}
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {report.is_resubmitted && (
                                                            <span className="text-[8px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase border border-blue-500/20 shadow-sm animate-pulse-slow">Update</span>
                                                        )}
                                                        {!report.admin_viewed && (
                                                            <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-sans tracking-tight">Mới</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1.5 text-sm font-black text-slate-400 italic">
                                                    <Clock className="w-3.5 h-3.5 opacity-40" />
                                                    {format(new Date(report.created_at), 'HH:mm')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" className="h-10 w-10 p-0 text-slate-400 hover:text-white hover:bg-[#1a1f2e] rounded-xl transition-all">
                                                            <MoreVertical className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-800 text-slate-300 w-56 p-2 rounded-2xl shadow-2xl">
                                                        <DropdownMenuLabel className="text-[10px] text-slate-500 font-bold px-3 py-2 uppercase tracking-widest">Quản trị báo cáo</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-slate-800/60" />
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/reports/employee/${report.user_id}`); }}
                                                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-semibold text-primary"
                                                        >
                                                            <TrendingUp className="w-4 h-4" />
                                                            Phân tích báo cáo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                                                            className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-medium"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Xem chi tiết
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-800/60" />
                                                        <DropdownMenuItem
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 cursor-pointer py-3 px-3 rounded-xl m-1 transition-colors flex items-center gap-3 font-bold text-sm"
                                                        >
                                                            <AlertCircle className="w-4 h-4" />
                                                            Từ chối báo cáo
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Pagination */}
                    <div className="px-8 py-6 border-t border-slate-800/40 flex items-center justify-between bg-[#1a1f2e]">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest hidden md:block">
                            Hiển thị <span className="text-white">{processedReports.length > 0 ? ((currentPage - 1) * PAGE_SIZE) + 1 : 0}</span>-
                            <span className="text-white">{Math.min(currentPage * PAGE_SIZE, total)}</span> / <span className="text-primary">{total}</span> báo cáo
                        </div>
                        <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
                            <Button
                                variant="outline"
                                onClick={() => navigateToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-10 w-10 p-0 border-slate-700 bg-[#0d1117] hover:bg-slate-800 text-white disabled:opacity-20 transition-all rounded-xl"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex space-x-1.5">
                                {[...Array(Math.min(5, Math.ceil(total / PAGE_SIZE)))].map((_, i) => {
                                    const p = i + 1;
                                    return (
                                        <Button
                                            key={p}
                                            variant={currentPage === p ? "default" : "outline"}
                                            onClick={() => navigateToPage(p)}
                                            className={`h-10 w-10 p-0 font-black text-xs transition-all rounded-xl ${currentPage === p
                                                ? "bg-primary hover:bg-primary-hover text-white border-transparent shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] scale-110"
                                                : "border-slate-800 bg-[#0d1117] hover:bg-slate-800 text-slate-400 hover:text-white"
                                                }`}
                                        >
                                            {p}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => navigateToPage(currentPage + 1)}
                                disabled={currentPage * PAGE_SIZE >= total}
                                className="h-10 w-10 p-0 border-slate-700 bg-[#0d1117] hover:bg-slate-800 text-white disabled:opacity-20 transition-all rounded-xl"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div >

            <ReportDetailModal
                report={selectedReport}
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
            />
        </div >
    )
}

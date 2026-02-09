'use client'

import { useState, useEffect } from 'react'
import { WorkReport } from '@/app/actions/work-reports'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Clock, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Filter, ChevronDown, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Props {
    reports: WorkReport[]
    onSelectReport?: (report: WorkReport) => void
}

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly'
type DateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'custom'

const ITEMS_PER_PAGE = 7

export default function ReportHistory({ reports, onSelectReport }: Props) {
    const [currentPage, setCurrentPage] = useState(1)
    const [typeFilter, setTypeFilter] = useState<FilterType>('all')
    const [dateFilter, setDateFilter] = useState<DateFilter>('all')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [filteredReports, setFilteredReports] = useState<WorkReport[]>([])
    const [showFilters, setShowFilters] = useState(false)

    // Apply filters + FORCE SORT (in case server data is cached)
    useEffect(() => {
        let filtered = [...reports]

        // Type filter
        if (typeFilter !== 'all') {
            if (typeFilter === 'daily') {
                // Daily reports include regular daily reports AND makeup reports
                filtered = filtered.filter(r => r.report_type === 'daily' || r.report_type === 'makeup')
            } else {
                filtered = filtered.filter(r => r.report_type === typeFilter)
            }
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date()
            filtered = filtered.filter(r => {
                const reportDate = new Date(r.report_date) // report_date is yyyy-mm-dd (local date string from form)

                switch (dateFilter) {
                    case 'today':
                        return reportDate >= startOfDay(now) && reportDate <= endOfDay(now)
                    case 'this_week':
                        return reportDate >= startOfWeek(now, { locale: vi }) && reportDate <= endOfWeek(now, { locale: vi })
                    case 'this_month':
                        return reportDate >= startOfMonth(now) && reportDate <= endOfMonth(now)
                    case 'custom':
                        if (!startDate && !endDate) return true
                        const start = startDate ? new Date(startDate) : new Date('1970-01-01')
                        const end = endDate ? new Date(endDate) : new Date('2100-01-01')
                        // Adjust end date to end of day
                        end.setHours(23, 59, 59, 999)
                        return reportDate >= start && reportDate <= end
                    default:
                        return true
                }
            })
        }

        // FORCE SORT - Newest first (Sort by created_at for precision)
        filtered.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime()
            const timeB = new Date(b.created_at).getTime()
            return timeB - timeA // Descending (newest first)
        })

        setFilteredReports(filtered)
        setCurrentPage(1) // Reset to first page when filters change
    }, [reports, typeFilter, dateFilter, startDate, endDate])

    // Pagination
    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentReports = filteredReports.slice(startIndex, endIndex)

    // Group reports by month for display
    const groupedReports = currentReports.reduce((acc, report) => {
        const date = new Date(report.report_date)
        const monthKey = format(date, 'MM/yyyy')
        if (!acc[monthKey]) acc[monthKey] = []
        acc[monthKey].push(report)
        return acc
    }, {} as Record<string, WorkReport[]>)

    const hasActiveFilters = typeFilter !== 'all' || dateFilter !== 'all' || startDate !== '' || endDate !== ''

    return (
        <div className="space-y-4">
            {/* Compact Filter Toggle */}
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm font-medium text-white">Bộ lọc</span>
                        {hasActiveFilters && (
                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                                Đang lọc
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setTypeFilter('all')
                                    setDateFilter('all')
                                    setStartDate('')
                                    setEndDate('')
                                }}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2"
                            >
                                Xóa
                            </button>
                        )}
                        <ChevronDown className={cn(
                            "h-4 w-4 text-slate-500 transition-transform",
                            showFilters && "rotate-180"
                        )} />
                    </div>
                </button>

                {/* Expandable Filters */}
                {showFilters && (
                    <div className="p-4 pt-0 space-y-4 border-t border-slate-800">
                        {/* Type Filter */}
                        <div>
                            <label className="text-xs text-slate-500 mb-2 block">Loại báo cáo</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'all', label: 'Tất cả' },
                                    { value: 'daily', label: 'Ngày' },
                                    { value: 'weekly', label: 'Tuần' },
                                    { value: 'monthly', label: 'Tháng' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setTypeFilter(option.value as FilterType)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                            typeFilter === option.value
                                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Filter */}
                        <div>
                            <label className="text-xs text-slate-500 mb-2 block">Thời gian</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[
                                    { value: 'all', label: 'Tất cả' },
                                    { value: 'today', label: 'Hôm nay' },
                                    { value: 'this_week', label: 'Tuần này' },
                                    { value: 'this_month', label: 'Tháng này' },
                                    { value: 'custom', label: 'Tùy chọn' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setDateFilter(option.value as DateFilter)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                            dateFilter === option.value
                                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Date Range Inputs */}
                            {dateFilter === 'custom' && (
                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 ml-1">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-[#0d131a] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 ml-1">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-[#0d131a] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results count */}
                        <div className="pt-2 border-t border-slate-800">
                            <p className="text-xs text-slate-500">
                                <span className="text-cyan-400 font-bold">{filteredReports.length}</span> báo cáo
                                {filteredReports.length > ITEMS_PER_PAGE && (
                                    <span> • Trang {currentPage}/{totalPages}</span>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Reports List */}
            {currentReports.length === 0 ? (
                <div className="bg-[#161b22] border border-slate-800 rounded-xl p-8 text-center">
                    <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Không có báo cáo nào</p>
                    <p className="text-slate-600 text-xs mt-1">
                        {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Hãy tạo báo cáo đầu tiên'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    {Object.entries(groupedReports).map(([month, reportsInMonth]) => (
                        <div key={month}>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">calendar_month</span>
                                Tháng {month}
                            </h4>
                            <div className="space-y-2">
                                {reportsInMonth.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => onSelectReport?.(report)}
                                        className="relative bg-[#161b22] border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-all group cursor-pointer hover:shadow-lg hover:shadow-cyan-500/5 select-none active:scale-[0.99]"
                                    >
                                        {/* View Count Badge */}
                                        {report.views && report.views.length > 0 && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 px-2 py-1 rounded-full text-[10px] font-medium transition-colors border border-slate-700/50"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            <span>{report.views.length}</span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-64 p-3 bg-[#161b22] border-slate-700 shadow-xl" align="end" sideOffset={5}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Người đã xem</h4>
                                                            <span className="text-[10px] text-slate-600">{report.views.length} lượt xem</span>
                                                        </div>
                                                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                                            {report.views.map((view, i) => (
                                                                <div key={i} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors">
                                                                    <Avatar className="h-6 w-6 border border-slate-700">
                                                                        <AvatarImage src={view.viewer_avatar || ''} />
                                                                        <AvatarFallback className="text-[10px] bg-slate-800 text-slate-400">
                                                                            {view.viewer_name.charAt(0).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-xs font-medium text-slate-200 truncate max-w-[140px]">{view.viewer_name}</span>
                                                                        <span className="text-[10px] text-slate-500">
                                                                            {format(new Date(view.viewed_at), 'HH:mm dd/MM/yyyy', { locale: vi })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${report.report_type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                                                report.report_type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                                                    report.report_type === 'monthly' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-pink-500/20 text-pink-400'
                                                }`}>
                                                {report.report_type === 'daily' ? 'Ngày' :
                                                    report.report_type === 'weekly' ? 'Tuần' :
                                                        report.report_type === 'monthly' ? 'Tháng' : 'Bù'}
                                            </span>
                                        </div>
                                        <h5 className="text-sm font-bold text-slate-200 mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors leading-snug">
                                            {report.content.replace(/<[^>]+>/g, '').substring(0, 150)}
                                        </h5>
                                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                            {report.next_plan ? `Kế hoạch: ${report.next_plan.substring(0, 60)}...` : 'Chưa có kế hoạch'}
                                        </p>

                                        <div className="mt-2 flex items-center gap-2 pt-3 border-t border-slate-800/50">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                                                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                                                    {format(new Date(report.created_at), 'HH:mm - EEEE, dd/MM/yyyy', { locale: vi })}
                                                </span>
                                                {report.report_type === 'makeup' && (
                                                    <span className="text-[11px] text-orange-400 flex items-center gap-1 mt-0.5 font-medium">
                                                        <span className="material-symbols-outlined text-[12px]">history</span>
                                                        Bù cho: {format(new Date(report.report_date), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-1 text-[10px] font-bold ${report.status === 'approved' ? 'text-green-400' :
                                                report.status === 'changes_requested' ? 'text-yellow-400' :
                                                    report.status === 'rejected' ? 'text-red-400' :
                                                        report.status === 'reviewed' ? 'text-blue-400' : 'text-slate-500'
                                                }`}>
                                                {report.status === 'approved' ? <CheckCircle className="h-3 w-3" /> :
                                                    report.status === 'changes_requested' ? <AlertCircle className="h-3 w-3" /> :
                                                        <Clock className="h-3 w-3" />}
                                                {report.status === 'approved' ? 'Đã duyệt' :
                                                    report.status === 'changes_requested' ? 'Yêu cầu sửa' :
                                                        report.status === 'rejected' ? 'Từ chối' :
                                                            report.status === 'reviewed' ? 'Đã xem' : 'Đang chờ'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-[#161b22] border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed h-8 text-xs"
                        >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Trước
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                // Show first 5 pages or pages around current
                                let page = i + 1
                                if (totalPages > 5 && currentPage > 3) {
                                    page = currentPage - 2 + i
                                    if (page > totalPages) return null
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "w-7 h-7 rounded-lg text-xs font-medium transition-all",
                                            currentPage === page
                                                ? "bg-cyan-500 text-black"
                                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        )}
                                    >
                                        {page}
                                    </button>
                                )
                            })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed h-8 text-xs"
                        >
                            Sau
                            <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import React, { useState, useMemo } from 'react'
import { Search, Loader2, Download, Plus, RefreshCw, XCircle, CheckCircle2, AlertCircle, Clock, Calendar, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { vi as viLocale, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/i18n-context'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface EmployeeData {
    id: string
    employeeId: string
    name: string
    email: string
    avatar: string | null
    department: string
    status: string
    isLate: boolean
    checkIn: string | null
    checkOut: string | null
    totalHours: number | null
    activeSessionStartTime: string | null
}

interface AttendancePageProps {
    initialEmployees: EmployeeData[]
    stats: {
        totalEmployees: number
        present: number
        late: number
        onLeave: number
    }
    todayStr: string
}

export function AttendanceClient({ initialEmployees, stats, todayStr }: AttendancePageProps) {
    const { t, locale } = useI18n()
    const dateLocale = locale === 'vi' ? viLocale : enUS

    const [searchQuery, setSearchQuery] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // --- Derived Data ---
    const departments = useMemo(() => {
        const depts = new Set(initialEmployees.map(e => e.department))
        return Array.from(depts).filter(Boolean).sort()
    }, [initialEmployees])

    const filteredEmployees = useMemo(() => {
        return initialEmployees.filter(emp => {
            const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) || false

            const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'late' && emp.isLate) ||
                (statusFilter === 'present' && (emp.status === 'clocked_in' || emp.status === 'clocked_out')) ||
                (statusFilter === 'absent' && emp.status === 'absent') ||
                (statusFilter === 'on_leave' && emp.status === 'on_leave')

            return matchesSearch && matchesDept && matchesStatus
        })
    }, [initialEmployees, searchQuery, departmentFilter, statusFilter])

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // --- Helpers ---
    const getStatusConfig = (status: string, isLate: boolean) => {
        if (isLate) return { label: t.admin.attendancePage.filters.late.toUpperCase(), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: AlertCircle }
        if (status === 'on_leave') return { label: t.admin.attendancePage.filters.onLeave.toUpperCase(), color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Calendar }
        if (status === 'absent') return { label: t.admin.attendancePage.filters.absent.toUpperCase(), color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: XCircle }
        if (status === 'clocked_out') return { label: t.admin.checkedOut.toUpperCase(), color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 }
        if (status === 'clocked_in') return { label: t.admin.clockedIn.toUpperCase(), color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: Clock }
        return { label: 'UNKNOWN', color: 'bg-slate-500/10 text-slate-500', icon: AlertCircle }
    }

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--'
        // Handle timezone properly or just format time part
        return format(new Date(isoString), 'hh:mm a')
    }

    const formatHours = (hours: number | null) => {
        if (hours === null || hours === undefined || isNaN(hours)) return '0h 0m'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}h ${m}m`
    }


    const handleExportReport = async () => {
        try {
            toast.loading('Đang tạo báo cáo, vui lòng đợi...', { id: 'export-report' })

            const monthStr = todayStr.substring(0, 7)
            const res = await fetch(`/api/admin/reports/attendance?month=${monthStr}`)
            if (!res.ok) throw new Error('Failed to fetch report data')

            const data = await res.json()
            const { profiles, logs, leaves } = data

            const sheet1Data: any[] = []
            const summaryData: any[] = []

            const year = parseInt(monthStr.split('-')[0])
            const month = parseInt(monthStr.split('-')[1])
            const numDays = new Date(year, month, 0).getDate()

            profiles.forEach((emp: any) => {
                let totalWorkDays = 0
                let totalLeaveDays = 0
                let totalOnTimeDays = 0
                let totalLateDays = 0
                let totalLateMinutes = 0
                let totalOvertimeHours = 0

                for (let d = 1; d <= numDays; d++) {
                    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`

                    // Stop checking future dates
                    if (dateStr > todayStr) continue

                    const dayLogs = logs.filter((l: any) => l.user_id === emp.id && l.work_date === dateStr)
                    dayLogs.sort((a: any, b: any) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime())
                    const leave = leaves.find((l: any) => l.user_id === emp.id && l.leave_date === dateStr)

                    const firstLog = dayLogs[0]
                    const lastLog = dayLogs[dayLogs.length - 1]

                    let status = 'VẮNG MẶT'
                    if (leave) status = 'NGHỈ PHÉP'
                    else if (firstLog) {
                        status = firstLog.status === 'late' ? 'ĐI TRỄ' : 'ĐÚNG GIỜ'
                    }

                    if (firstLog) {
                        totalWorkDays++
                        totalLateMinutes += (firstLog.late_minutes || 0)
                        totalOvertimeHours += dayLogs.reduce((sum: number, lg: any) => sum + (lg.overtime_hours || 0), 0)
                        if (firstLog.status === 'late') {
                            totalLateDays++
                        } else {
                            totalOnTimeDays++
                        }
                    }
                    if (leave) totalLeaveDays++

                    let employeeIdStr = `#EMP-${emp.id.substring(0, 4)}`

                    // Calculate total day hours
                    let dailyHours = 0
                    dayLogs.forEach((lg: any) => {
                        if (lg.check_in_time && lg.check_out_time) {
                            dailyHours += (new Date(lg.check_out_time).getTime() - new Date(lg.check_in_time).getTime()) / (1000 * 60 * 60)
                        } else if (lg.check_in_time && dateStr === todayStr) {
                            dailyHours += (new Date().getTime() - new Date(lg.check_in_time).getTime()) / (1000 * 60 * 60)
                        }
                    })

                    sheet1Data.push({
                        'Ngày': dateStr,
                        'Nhân viên': emp.full_name || 'Chưa cập nhật',
                        'ID': employeeIdStr,
                        'Phòng ban': emp.department || 'Chưa phân bổ',
                        'Trạng thái': status,
                        'Giờ vào': formatTime(firstLog?.check_in_time),
                        'Giờ ra': formatTime(lastLog?.check_out_time),
                        'Đi trễ (phút)': firstLog?.late_minutes || 0,
                        'Tăng ca (giờ)': dayLogs.reduce((sum: number, lg: any) => sum + (lg.overtime_hours || 0), 0),
                        'Tổng giờ': formatHours(dailyHours)
                    })
                }

                summaryData.push({
                    'Nhân viên': emp.full_name || 'Chưa cập nhật',
                    'ID': `#EMP-${emp.id.substring(0, 4)}`,
                    'Phòng ban': emp.department || 'Chưa phân bổ',
                    'Tổng ngày chấm công': totalWorkDays,
                    'Tổng ngày nghỉ phép': totalLeaveDays,
                    'Số ngày đi đúng giờ': totalOnTimeDays,
                    'Số ngày đi trễ': totalLateDays,
                    'Tổng thời gian đi trễ (phút)': totalLateMinutes,
                    'Tổng thời gian tăng ca (giờ)': totalOvertimeHours
                })
            })

            // Sort sheet1 by Date then Name
            sheet1Data.sort((a, b) => a['Ngày'].localeCompare(b['Ngày']) || a['Nhân viên'].localeCompare(b['Nhân viên']))

            const ws1 = XLSX.utils.json_to_sheet(sheet1Data)
            const ws2 = XLSX.utils.json_to_sheet(summaryData)

            // Auto fit column widths
            if (sheet1Data.length > 0) {
                const ws1Cols = Object.keys(sheet1Data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }))
                ws1['!cols'] = ws1Cols
            }
            if (summaryData.length > 0) {
                const ws2Cols = Object.keys(summaryData[0]).map(k => ({ wch: Math.max(k.length + 2, 16) }))
                ws2['!cols'] = ws2Cols
            }

            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws1, "Chi tiết chấm công")
            XLSX.utils.book_append_sheet(wb, ws2, "Tổng quan tháng")

            XLSX.writeFile(wb, `BaoCao_ChamCong_${monthStr}.xlsx`)

            toast.success('Xuất báo cáo thành công!', { id: 'export-report' })
        } catch (error) {
            console.error('Error exporting CSV:', error)
            toast.error('Lỗi khi lấy dữ liệu xuất báo cáo', { id: 'export-report' })
        }
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200">
            {/* --- HEADER --- */}
            <div className="bg-[#161b22] border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{t.admin.attendancePage.title}</h1>
                        <div className="flex items-center gap-2 mt-1 text-slate-400 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{t.admin.attendancePage.subtitle}, {format(new Date(todayStr), 'MMM dd, yyyy', { locale: dateLocale })}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={handleExportReport}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t.admin.attendancePage.exportReport}
                        </Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            {t.admin.attendancePage.manualEntry}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-6 space-y-6">

                {/* --- STATS CARDS --- */}
                {/* --- STATS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Employees */}
                    {/* Total Employees */}
                    {/* Total Employees */}
                    <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-blue-500/50 transition-all">
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">groups_3</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg text-emerald-500 bg-emerald-500/10">
                                +12 {t.admin.attendancePage.stats.thisMonth}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t.admin.attendancePage.stats.totalEmployees}</p>
                        <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalEmployees.toLocaleString()}</p>
                        <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* Present Today */}
                    <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-emerald-500/50 transition-all">
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">login</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg text-emerald-500 bg-emerald-500/10">
                                {stats.totalEmployees > 0 ? Math.round((stats.present / stats.totalEmployees) * 100) : 0}% {t.admin.attendancePage.stats.rate}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t.admin.attendancePage.stats.presentToday}</p>
                        <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.present.toLocaleString()}</p>
                        <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${stats.totalEmployees > 0 ? (stats.present / stats.totalEmployees) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    {/* Late Arrivals */}
                    <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-amber-500/50 transition-all">
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">schedule_send</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg text-amber-500 bg-amber-500/10">
                                {stats.present > 0 ? ((stats.late / stats.present) * 100).toFixed(1) : 0}% {t.admin.attendancePage.stats.late}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t.admin.attendancePage.stats.lateArrivals}</p>
                        <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.late}</p>
                        <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${stats.present > 0 ? (stats.late / stats.present) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    {/* On Leave */}
                    <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-rose-500/50 transition-all">
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">logout</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg text-slate-400 bg-slate-800">
                                {t.admin.attendancePage.stats.today}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t.admin.attendancePage.stats.onLeave}</p>
                        <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.onLeave}</p>
                        <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${stats.totalEmployees > 0 ? (stats.onLeave / stats.totalEmployees) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN TABLE SECTION --- */}
                <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    {/* Filters Toolbar */}
                    <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#161b22]/50 backdrop-blur-sm">
                        <div className="relative w-full sm:w-96 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
                            <Input
                                placeholder={t.admin.attendancePage.filters.searchPlaceholder}
                                className="pl-10 bg-[#0d1117] border-slate-700 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select value={departmentFilter} onValueChange={(val) => { setDepartmentFilter(val); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-[#0d1117] border-slate-700 text-slate-300 font-medium">
                                    <SelectValue placeholder={t.admin.attendancePage.filters.allDepartments} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#161b22] border-slate-700 text-slate-300">
                                    <SelectItem value="all">{t.admin.attendancePage.filters.allDepartments}</SelectItem>
                                    {departments.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[160px] bg-[#0d1117] border-slate-700 text-slate-300 font-medium">
                                    <SelectValue placeholder={t.admin.attendancePage.filters.allStatuses} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#161b22] border-slate-700 text-slate-300">
                                    <SelectItem value="all">{t.admin.attendancePage.filters.allStatuses}</SelectItem>
                                    <SelectItem value="present">{t.admin.attendancePage.filters.present}</SelectItem>
                                    <SelectItem value="late">{t.admin.attendancePage.filters.late}</SelectItem>
                                    <SelectItem value="absent">{t.admin.attendancePage.filters.absent}</SelectItem>
                                    <SelectItem value="on_leave">{t.admin.attendancePage.filters.onLeave}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                className="border-slate-700 bg-[#0d1117] text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                                onClick={() => {
                                    setSearchQuery('')
                                    setDepartmentFilter('all')
                                    setStatusFilter('all')
                                    setCurrentPage(1)
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-[#0d1117]/50">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.employee}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.id}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.department}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.status}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{t.admin.attendancePage.table.clockIn}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{t.admin.attendancePage.table.clockOut}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{t.admin.attendancePage.table.totalHours}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">{t.admin.attendancePage.table.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#161b22]">
                                {paginatedEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            {t.admin.attendancePage.table.noData}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedEmployees.map((emp) => {
                                        const statusConfig = getStatusConfig(emp.status, emp.isLate)
                                        return (
                                            <tr key={emp.id} className="group hover:bg-[#0d1117]/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-10 h-10 border border-slate-700 shadow-sm">
                                                            <AvatarImage src={emp.avatar || ''} />
                                                            <AvatarFallback className="bg-slate-800 text-slate-400 font-bold text-xs">
                                                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">{emp.name}</div>
                                                            <div className="text-xs text-slate-500 font-medium">{emp.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                                                    {emp.employeeId}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300">
                                                    {emp.department}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap w-fit flex items-center gap-1.5", statusConfig.color)}>
                                                        <statusConfig.icon className="w-3 h-3" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-300 text-right tabular-nums">
                                                    {formatTime(emp.checkIn)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500 text-right tabular-nums">
                                                    {formatTime(emp.checkOut)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-white text-right tabular-nums">
                                                    {formatHours((emp.totalHours || 0) + (emp.activeSessionStartTime ? (Date.now() - new Date(emp.activeSessionStartTime).getTime()) / (1000 * 60 * 60) : 0))}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-full">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-slate-800 bg-[#0d1117]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-medium text-slate-500">
                            {t.admin.attendancePage.pagination.showing} <span className="font-bold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> {t.admin.employeeManagement.pagination.of} <span className="font-bold text-white">{filteredEmployees.length}</span> {t.admin.employeeManagement.pagination.employees}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-slate-700 bg-[#0d1117] text-slate-400 hover:text-white disabled:opacity-30"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            {Array.from({ length: totalPages }).map((_, idx) => {
                                const page = idx + 1
                                // Show first, last, current, and surrounding pages
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "h-8 w-8 p-0 text-xs font-bold transition-all",
                                                currentPage === page
                                                    ? "bg-cyan-500 hover:bg-cyan-600 text-white border-transparent shadow-lg shadow-cyan-500/20"
                                                    : "border-slate-700 bg-[#0d1117] text-slate-400 hover:text-white hover:bg-slate-800"
                                            )}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    )
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="text-slate-600 text-xs">...</span>
                                }
                                return null
                            })}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-slate-700 bg-[#0d1117] text-slate-400 hover:text-white disabled:opacity-30"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM BANNER --- */}
                <div className="bg-gradient-to-r from-[#0f2430] to-[#161b22] border border-cyan-900/30 rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 z-10">
                        <span className="material-symbols-outlined text-cyan-400">trending_up</span>
                    </div>
                    <div className="z-10">
                        <h3 className="text-white font-bold text-sm mb-1">{t.admin.attendancePage.insight.title}</h3>
                        <p className="text-slate-400 text-xs">{t.admin.attendancePage.insight.description.replace('{percent}', '2.4%')}</p>
                    </div>
                </div>

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        height: 8px;
                        width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #0d1117; 
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #30363d; 
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #484f58; 
                    }
                `}</style>
            </div>
        </div>
    )
}

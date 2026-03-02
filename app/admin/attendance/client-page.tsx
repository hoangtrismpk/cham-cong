'use client'

import React, { useState, useMemo } from 'react'
import { Search, Loader2, Download, Plus, RefreshCw, XCircle, CheckCircle2, AlertCircle, Clock, Calendar, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { usePermissions } from '@/contexts/permission-context'

interface EmployeeData {
    id: string
    employeeId: string
    name: string
    email: string
    avatar: string | null
    department: string
    workDays: number
    lateDays: number
    leaveDays: number
    totalHours: number
    totalOvertimeHours: number
}

interface AttendancePageProps {
    initialEmployees: EmployeeData[]
    stats: {
        totalEmployees: number
        totalWorkDays: number
        totalLateDays: number
        totalLeaveDays: number
    }
    startDateStr: string
    endDateStr: string
    viewScope?: 'all' | 'team'
}

export function AttendanceClient({ initialEmployees, stats, startDateStr, endDateStr, viewScope = 'all' }: AttendancePageProps) {
    const router = useRouter()
    const { t, locale } = useI18n()
    const { can } = usePermissions()
    const dateLocale = locale === 'vi' ? viLocale : enUS

    const [searchQuery, setSearchQuery] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('all')
    const [localStartDate, setLocalStartDate] = useState(startDateStr)
    const [localEndDate, setLocalEndDate] = useState(endDateStr)
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

            return matchesSearch && matchesDept
        })
    }, [initialEmployees, searchQuery, departmentFilter])

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // --- Helpers ---
    const formatHours = (hours: number | null) => {
        if (hours === null || hours === undefined || isNaN(hours)) return '0h 0m'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}h ${m}m`
    }


    const handleExportReport = async () => {
        try {
            toast.loading('Đang tạo báo cáo, vui lòng đợi...', { id: 'export-report' })

            const res = await fetch(`/api/admin/reports/attendance?startDate=${startDateStr}&endDate=${endDateStr}&scope=${viewScope}`)
            if (!res.ok) throw new Error('Failed to fetch report data')

            const data = await res.json()
            const { profiles, logs, leaves } = data

            const sheet1Data: any[] = []
            const summaryData: any[] = []

            const todayStr = new Date().toISOString().split('T')[0]

            const parseDate = (dStr: string) => {
                const [y, m, d] = dStr.split('-').map(Number)
                return new Date(y, m - 1, d, 12, 0, 0) // Parse as midday to avoid timezone shifts
            }

            profiles.forEach((emp: any) => {
                let totalWorkDays = 0
                let totalLeaveDays = 0
                let totalOnTimeDays = 0
                let totalLateDays = 0
                let totalLateMinutes = 0
                let totalOvertimeHours = 0

                let currentDate = parseDate(startDateStr)
                const endD = parseDate(endDateStr)

                while (currentDate <= endD) {
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

                    // Stop checking future dates
                    if (dateStr > todayStr) break

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
                        'Đi trễ (phút)': firstLog?.late_minutes || 0,
                        'Tăng ca (giờ)': dayLogs.reduce((sum: number, lg: any) => sum + (lg.overtime_hours || 0), 0),
                        'Tổng giờ': formatHours(dailyHours)
                    })

                    currentDate.setDate(currentDate.getDate() + 1)
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
            XLSX.utils.book_append_sheet(wb, ws2, "Tổng quan")

            XLSX.writeFile(wb, `BaoCao_ChamCong_${startDateStr}_to_${endDateStr}.xlsx`)

            toast.success('Xuất báo cáo thành công!', { id: 'export-report' })
        } catch (error) {
            console.error('Error exporting CSV:', error)
            toast.error('Lỗi khi lấy dữ liệu xuất báo cáo', { id: 'export-report' })
        }
    }

    return (
        <div className="p-6 w-full max-w-[1600px] mx-auto min-h-screen bg-[#0d1117] space-y-6 overflow-x-hidden md:overflow-visible">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Clock className="w-8 h-8 text-primary" />
                        {t.admin.attendancePage.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{locale === 'vi' ? 'Từ' : 'From'} {format(new Date(startDateStr), 'dd/MM/yyyy')} {locale === 'vi' ? 'đến' : 'to'} {format(new Date(endDateStr), 'dd/MM/yyyy')}</span>
                        {viewScope === 'team' && (
                            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider ml-2">
                                <span className="material-symbols-outlined text-[12px] mr-1">diversity_3</span>
                                {locale === 'vi' ? 'Nhóm của tôi' : 'My Team'}
                            </Badge>
                        )}
                        {viewScope === 'all' && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold uppercase tracking-wider ml-2">
                                <span className="material-symbols-outlined text-[12px] mr-1">groups_3</span>
                                {locale === 'vi' ? 'Toàn công ty' : 'Company-wide'}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {can('attendance.export') && (
                        <Button
                            variant="outline"
                            className="bg-[#1a1f2e] border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={handleExportReport}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t.admin.attendancePage.exportReport}
                        </Button>
                    )}
                    {can('attendance.edit') && (
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                            <Plus className="w-4 h-4 mr-2" />
                            {t.admin.attendancePage.manualEntry}
                        </Button>
                    )}
                </div>
            </header>

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Employees */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-blue-500/50 transition-all">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">groups_3</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{locale === 'vi' ? 'Tổng nhân sự' : 'Total Employees'}</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalEmployees.toLocaleString()}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* Total Work Days */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-emerald-500/50 transition-all">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">fact_check</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{locale === 'vi' ? 'Tổng ngày công' : 'Total Work Days'}</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalWorkDays.toLocaleString()}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* Late Arrivals */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-amber-500/50 transition-all">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">schedule_send</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{locale === 'vi' ? 'Tổng lượt đi trễ' : 'Total Late Events'}</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalLateDays}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* On Leave */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-rose-500/50 transition-all">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="p-1.5 md:p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">logout</span>
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{locale === 'vi' ? 'Tổng ngày phép' : 'Total Leave Days'}</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{stats.totalLeaveDays}</p>
                    <div className="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: '100%' }}></div>
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
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <Select value={departmentFilter} onValueChange={(val) => { setDepartmentFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[150px] bg-[#0d1117] border-slate-700 text-slate-300 font-medium">
                                <SelectValue placeholder={t.admin.attendancePage.filters.allDepartments} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#161b22] border-slate-700 text-slate-300">
                                <SelectItem value="all">{t.admin.attendancePage.filters.allDepartments}</SelectItem>
                                {departments.map(dept => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-slate-400 text-sm hidden sm:inline">{locale === 'vi' ? 'Từ' : 'From'}:</span>
                            <Input
                                type="date"
                                className="w-full sm:w-[130px] bg-[#0d1117] border-slate-700 text-slate-300 font-medium"
                                value={localStartDate}
                                onChange={(e) => setLocalStartDate(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-slate-400 text-sm hidden sm:inline">{locale === 'vi' ? 'Đến' : 'To'}:</span>
                            <Input
                                type="date"
                                className="w-full sm:w-[130px] bg-[#0d1117] border-slate-700 text-slate-300 font-medium"
                                value={localEndDate}
                                onChange={(e) => setLocalEndDate(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white"
                            onClick={() => {
                                if (localStartDate && localEndDate) {
                                    router.push(`/admin/attendance?from=${localStartDate}&to=${localEndDate}`)
                                }
                            }}
                        >
                            {locale === 'vi' ? 'Lọc' : 'Filter'}
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="border-slate-700 bg-[#0d1117] text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                            onClick={() => {
                                setSearchQuery('')
                                setDepartmentFilter('all')
                                setCurrentPage(1)
                            }}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar w-full">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-800 bg-[#0d1117]/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.employee}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.id}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors">{t.admin.attendancePage.table.department}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{locale === 'vi' ? 'Ngày công' : 'Work Days'}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{locale === 'vi' ? 'Đi trễ' : 'Late Days'}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{locale === 'vi' ? 'Nghỉ phép' : 'Leave Days'}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors text-right">{locale === 'vi' ? 'Tăng ca' : 'Overtime'}</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 tabular-nums">
                                                    {emp.workDays} {locale === 'vi' ? 'ngày' : 'days'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500 text-right tabular-nums">
                                                {emp.lateDays} {locale === 'vi' ? 'ngày' : 'days'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-500 text-right tabular-nums">
                                                {emp.leaveDays} {locale === 'vi' ? 'ngày' : 'days'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-cyan-400 text-right tabular-nums">
                                                {formatHours(emp.totalOvertimeHours)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-white text-right tabular-nums">
                                                {formatHours(emp.totalHours)}
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
    )
}

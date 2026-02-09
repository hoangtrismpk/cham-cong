'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft,
    Download,
    Calendar,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import * as XLSX from 'xlsx'

interface Props {
    data: any // The result from getEmployeeReportAnalytics
    month: number
    year: number
    userId: string
}

export default function EmployeeReportAnalytics({ data, month, year, userId }: Props) {
    const router = useRouter()
    const { profile, stats, submissionLog, reports } = data

    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)

    const setDateFilter = (newMonth: number, newYear: number) => {
        router.push(`/admin/reports/employee/${userId}?month=${newMonth}&year=${newYear}`)
    }

    const monthName = format(new Date(year, month - 1), 'MMMM', { locale: vi })

    const handleDownload = () => {
        try {
            const dailyCount = reports.filter((r: any) => r.report_type === 'daily' || r.report_type === 'makeup').length
            const weeklyCount = reports.filter((r: any) => r.report_type === 'weekly').length
            const monthlyCount = reports.filter((r: any) => r.report_type === 'monthly').length

            const exportData = [{
                'Tháng': `${month}/${year}`,
                'Mã nhân viên': profile.employee_code,
                'Họ và tên': profile.full_name,
                'Số báo cáo phải nộp': stats.totalRequired,
                'Báo cáo ngày': dailyCount,
                'Báo cáo tuần': weeklyCount,
                'Báo cáo tháng': monthlyCount,
                'Tỉ lệ đúng hạn (%)': `${stats.onTimeRate}%`
            }]

            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Bao Cao Ca Nhan")

            // Set column widths
            const wscols = [
                { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
            ]
            worksheet['!cols'] = wscols

            XLSX.writeFile(workbook, `Bao_Cao_${profile.full_name}_Thang_${month}_${year}.xlsx`)
        } catch (error) {
            console.error('Download error:', error)
        }
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-300 p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/50">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 p-0.5 border border-primary/20">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover rounded-[14px]" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white font-bold text-xl bg-slate-800 rounded-[14px]">
                                    {profile.full_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">{profile.full_name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/30 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText className="w-3 h-3" /> {profile.employee_code}
                                </span>
                                <span className="text-[10px] font-bold text-primary/80 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest italic">
                                    {profile.job_title || profile.department || 'Nhân viên'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-800/40 p-1.5 rounded-2xl border border-slate-700/50">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all gap-2">
                                    {monthName} <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2 bg-[#1a1f2e] border-slate-800 rounded-2xl shadow-2xl z-50">
                                <div className="grid grid-cols-1 gap-1">
                                    {months.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setDateFilter(m, year)}
                                            className={`px-4 py-2 text-left text-sm rounded-lg transition-all ${m === month ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            {format(new Date(2024, m - 1), 'MMMM', { locale: vi })}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all gap-2 border-l border-slate-700/50 ml-1">
                                    {year} <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-32 p-2 bg-[#1a1f2e] border-slate-800 rounded-2xl shadow-2xl z-50">
                                <div className="grid grid-cols-1 gap-1">
                                    {years.map(y => (
                                        <button
                                            key={y}
                                            onClick={() => setDateFilter(month, y)}
                                            className={`px-4 py-2 text-left text-sm rounded-lg transition-all ${y === year ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="h-12 w-12 rounded-2xl bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 p-0 text-slate-400 hover:text-white transition-all shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#1a1f2e] border-slate-800/80 p-6 rounded-[32px] overflow-hidden relative group hover:border-blue-500/40 transition-all shadow-2xl">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity" />
                    <div className="relative flex flex-col justify-between h-full">
                        <p className="text-xs font-bold text-slate-500 mb-2">Tổng báo cáo</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-white">{stats.totalRequired}</h2>
                            <span className="text-xs text-slate-500 font-medium tracking-tight">Ngày làm việc</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full w-full opacity-30"></div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#1a1f2e] border-slate-800/80 p-6 rounded-[32px] overflow-hidden relative group hover:border-emerald-500/40 transition-all shadow-2xl">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity" />
                    <div className="relative flex flex-col justify-between h-full">
                        <p className="text-xs font-bold text-slate-500 mb-2">Đã nộp</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-emerald-500">{stats.submitted}</h2>
                            <span className="text-xs text-slate-500 font-medium tracking-tight">/ {stats.totalRequired} Total</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(stats.submitted / stats.totalRequired) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#1a1f2e] border-slate-800/80 p-6 rounded-[32px] overflow-hidden relative group hover:border-primary/40 transition-all shadow-2xl">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity" />
                    <div className="relative flex flex-col justify-between h-full">
                        <p className="text-xs font-bold text-slate-500 mb-2">Đúng hạn</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-primary">{stats.onTime}</h2>
                            <span className="text-xs text-slate-500 font-medium tracking-tight">{stats.onTimeRate}% Rate</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${stats.onTimeRate}%` }}
                            ></div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-[#1a1f2e] border-slate-800/80 p-6 rounded-[32px] overflow-hidden relative group hover:border-amber-500/40 transition-all shadow-2xl">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity" />
                    <div className="relative flex flex-col justify-between h-full">
                        <p className="text-xs font-bold text-slate-500 mb-2">Nộp trễ</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-amber-500">{stats.late}</h2>
                            <span className="text-xs text-slate-500 font-medium tracking-tight italic">Needs Review</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(stats.late / stats.submitted) * 100 || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Calendar Log */}
            <Card className="bg-[#161b22] border-slate-800/80 rounded-[32px] overflow-hidden border border-slate-800/50 shadow-2xl">
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-800/50 bg-[#0d1117]/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight italic capitalize">Lịch nộp báo cáo {monthName} {year}</h3>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đúng hạn</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nộp trễ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chưa nộp</span>
                        </div>
                    </div>
                </div>

                <div className="p-1">
                    <div className="grid grid-cols-7 border-b border-slate-800/30">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {/* Empty padding for days before month start */}
                        {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-28 border-r border-b border-slate-800/30 bg-slate-900/20 last:border-r-0"></div>
                        ))}

                        {submissionLog.map((log: any, i: number) => {
                            const isToday = format(new Date(), 'yyyy-MM-dd') === log.date

                            return (
                                <div key={i} className={`h-28 border-r border-b border-slate-800/30 p-3 last:border-r-0 hover:bg-slate-800/20 transition-all relative group shadow-inner ${isToday ? 'bg-primary/5 ring-1 ring-primary/30 z-10' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-slate-400'}`}>{log.day}</span>
                                        {isToday && <span className="text-[8px] font-black bg-primary text-black px-1.5 py-0.5 rounded italic">TODAY</span>}
                                    </div>

                                    <div className="mt-auto flex flex-col gap-2">
                                        {log.status !== 'off-day' && (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${log.status === 'on-time' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                    log.status === 'late' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                        'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                    }`}></div>
                                                {log.time && <span className="text-[10px] font-bold text-slate-500 group-hover:text-white transition-colors">{log.time}</span>}
                                                {log.status === 'missing' && <span className="text-[10px] font-bold text-slate-600 italic">Missing</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Fill remaining space */}
                        {Array.from({ length: (7 - (new Date(year, month - 1, submissionLog.length).getDay() + 1)) % 7 }).map((_, i) => (
                            <div key={`empty-end-${i}`} className="h-28 border-r border-b border-slate-800/30 bg-slate-900/20 last:border-r-0"></div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Summaries */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-bold text-white tracking-tight">Tóm tắt báo cáo {monthName}</h3>
                    </div>
                    <button className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest italic cursor-pointer">
                        Xem tất cả lịch sử <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {reports.length > 0 ? reports.map((report: any, i: number) => (
                        <Card
                            key={i}
                            onClick={() => router.push(`/admin/reports?id=${report.id}`)}
                            className="bg-[#1a1f2e] border-slate-800 p-5 rounded-3xl hover:border-slate-700 hover:bg-[#1e2436] transition-all cursor-pointer group animate-in slide-in-from-bottom-5 duration-300"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${new Date(report.created_at).toDateString() === new Date(report.report_date).toDateString()
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>
                                            {new Date(report.created_at).toDateString() === new Date(report.report_date).toDateString() ? 'Đúng hạn' : 'Nộp trễ'}
                                        </span>
                                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                                            {report.report_type === 'daily' ? 'Daily Progress' :
                                                report.report_type === 'weekly' ? 'Weekly Sprint Review' :
                                                    report.report_type === 'monthly' ? 'Monthly Performance Report' : 'Makeup Report'}: {report.content.substring(0, 40)}...
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                                        "{report.content.substring(0, 150)}..."
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">{format(new Date(report.report_date), 'MMM dd, yyyy')}</p>
                                    <p className="text-[10px] font-medium text-slate-600">{format(new Date(report.created_at), 'hh:mm a')}</p>
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <div className="py-20 flex flex-col items-center justify-center bg-[#1a1f2e] border border-dashed border-slate-800 rounded-3xl text-slate-600">
                            <FileText className="w-12 h-12 mb-4 opacity-10" />
                            <p className="text-sm font-medium italic">Không có dữ liệu báo cáo trong tháng này</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

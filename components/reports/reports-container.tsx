'use client'

import { useState } from 'react'
import { WorkReport } from '@/app/actions/work-reports'
import ReportForm from './report-form'
import ReportHistory from './report-history'
import MissingReports from './missing-reports'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
interface Props {
    initialReports: WorkReport[]
    userId: string
}

export default function ReportsContainer({ initialReports, userId }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedType, setSelectedType] = useState<'daily' | 'weekly' | 'monthly' | 'makeup' | undefined>(undefined)
    const [refreshKey, setRefreshKey] = useState(0)
    const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())
    const [viewingReport, setViewingReport] = useState<WorkReport | null>(null)
    const [mobileTab, setMobileTab] = useState<'form' | 'history'>('form')

    // Handle initial selection from URL params (e.g. from notification)
    useEffect(() => {
        const reportId = searchParams.get('report_id')
        // We can check 'action' too if needed, but selecting report is enough to show edit form

        if (reportId && initialReports.length > 0) {
            const report = initialReports.find(r => r.id === reportId)
            if (report) {
                // Delay slightly to ensure UI is ready
                setTimeout(() => {
                    handleSelectReport(report)
                    setMobileTab('form')
                }, 100)
            }
        }
    }, [searchParams, initialReports])

    const handleSelectMissingDate = (date: Date) => {
        setSelectedDate(date)
        setSelectedType('makeup')
        setViewingReport(null) // Reset viewing report
        setMobileTab('form')

        // Scroll to top of form smoothly
        const formElement = document.getElementById('report-form-container')
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const handleSelectReport = (report: WorkReport) => {
        setViewingReport(report)
        // Also update selected date/type for consistency
        setSelectedDate(new Date(report.report_date))
        setSelectedType(report.report_type)
        setMobileTab('form')

        // Scroll to top
        const formElement = document.getElementById('report-form-container')
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden border-b border-slate-800 bg-[#0d131a] shrink-0 p-2 gap-2">
                <button
                    onClick={() => setMobileTab('form')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mobileTab === 'form' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 border border-transparent hover:bg-slate-800'
                        }`}
                >
                    Viết báo cáo
                </button>
                <button
                    onClick={() => setMobileTab('history')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${mobileTab === 'history' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 border border-transparent hover:bg-slate-800'
                        }`}
                >
                    Lịch sử & Chưa nộp
                </button>
            </div>

            {/* Main Content - Report Form */}
            <div className={`flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`} id="report-main-scroll">
                <div className="max-w-4xl mx-auto pb-20" id="report-form-container">
                    <ReportForm
                        initialDate={selectedDate}
                        initialType={selectedType}
                        initialData={viewingReport}
                        onSuccess={(date) => {
                            // Optimistic update: Temporarily hide this date
                            const dateStr = format(date, 'yyyy-MM-dd')
                            setExcludedDates(prev => {
                                const next = new Set(prev)
                                next.add(dateStr)
                                return next
                            })
                            // Refresh list
                            setRefreshKey(prev => prev + 1)
                            setViewingReport(null) // Reset viewing after success
                            router.refresh() // Refresh Server Component data
                        }}
                    />
                </div>
            </div>

            {/* Right Sidebar - Report History & Missing Reports */}
            <aside className={`w-full lg:w-[400px] bg-[#0d131a] lg:border-l border-slate-800 p-6 flex-col h-full shrink-0 ${mobileTab === 'history' ? 'flex' : 'hidden lg:flex'}`}>

                {/* Section: Missing Reports (Action Items) */}
                <div className="mb-6">
                    <MissingReports
                        userId={userId}
                        onSelectDate={handleSelectMissingDate}
                        refreshTrigger={refreshKey}
                        excludedDates={excludedDates}
                    />
                </div>

                {/* Section: History Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-500">history</span>
                        Lịch sử report
                    </h3>
                </div>

                {/* Section: History List */}
                <div className="flex-1 custom-scrollbar overflow-y-auto min-h-0 -mr-2 pr-2">
                    {initialReports.length > 0 ? (
                        <ReportHistory
                            reports={initialReports}
                            onSelectReport={handleSelectReport}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">inbox</span>
                            <p className="text-slate-500 text-sm">Chưa có báo cáo nào</p>
                            <p className="text-slate-600 text-xs mt-1">Hãy tạo báo cáo đầu tiên của bạn</p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    )
}

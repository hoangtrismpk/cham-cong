'use client'

import React, { useEffect, useState } from 'react'
import { WorkReport, markReportAsViewed } from '@/app/actions/work-reports'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { X, Check, Edit3, MessageSquare, FileText, Download } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
    report: WorkReport | null
    isOpen: boolean
    onClose: () => void
}

export default function ReportDetailModal({ report, isOpen, onClose }: Props) {
    const [fetchedReport, setFetchedReport] = useState<WorkReport | null>(null)
    const [action, setAction] = useState<'comment' | 'request_changes' | 'approve' | null>(null)
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen && report) {
            // Reset state
            setFetchedReport(report) // Show initial data first
            setAction(null)

            // Fetch fresh data from server
            const fetchLatest = async () => {
                setIsLoading(true)
                try {
                    const { getReportById } = await import('@/app/actions/work-reports-admin')
                    const latest = await getReportById(report.id)
                    if (latest) {
                        setFetchedReport(latest)
                        setNote(latest.reviewer_note || '')

                        // Mark as viewed if needed
                        const { markReportAsViewed } = await import('@/app/actions/work-reports')
                        markReportAsViewed(latest.id)
                    }
                } catch (error) {
                    console.error('Failed to fetch report detail:', error)
                } finally {
                    setIsLoading(false)
                }
            }
            fetchLatest()
        }
    }, [isOpen, report])

    // Use fetchedReport for rendering, fallback to prop report
    const displayReport = fetchedReport || report

    if (!isOpen || !displayReport) return null

    const handleSubmit = async () => {
        if (!report) return
        console.log('🔵 [CLIENT] handleSubmit started', { action, reportId: report.id, noteLength: note?.length })
        setIsSubmitting(true)

        try {
            let result;

            if (action === 'approve') {
                console.log('✅ [CLIENT] Calling approveReport...')
                const { approveReport } = await import('@/app/actions/work-reports-admin')
                result = await approveReport(report.id, note.trim() || undefined)
                console.log('📧 [CLIENT] approveReport result:', result)
            } else if (action === 'request_changes') {
                console.log('✅ [CLIENT] Calling requestReportChanges...')
                const { requestReportChanges } = await import('@/app/actions/work-reports-admin')
                result = await requestReportChanges(report.id, note)
                console.log('📧 [CLIENT] requestReportChanges result:', result)
            } else if (action === 'comment') {
                console.log('✅ [CLIENT] Calling addReportFeedback...')
                const { addReportFeedback } = await import('@/app/actions/work-reports-admin')
                result = await addReportFeedback(report.id, note)
                console.log('📧 [CLIENT] addReportFeedback result:', result)
            } else {
                result = { success: false, message: 'Invalid action' }
            }

            console.log('🎯 [CLIENT] Final result:', result)

            if (result.success) {
                console.log('✅ [CLIENT] Success! Showing toast and reloading...')
                toast.success(result.message || 'Cập nhật thành công')
                onClose()
                // Refresh page to show updated data
                window.location.reload()
            } else {
                console.error('❌ [CLIENT] Failed!', result.message)
                toast.error(result.message || 'Có lỗi xảy ra')
            }
        } catch (error) {
            console.error('❌ [CLIENT] Exception caught:', error)
            toast.error('Có lỗi xảy ra')
        } finally {
            setIsSubmitting(false)
            console.log('🏁 [CLIENT] handleSubmit finished')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="bg-[#161b22] w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0d131a]">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600">
                            {displayReport.user?.avatar_url ? (
                                <img src={displayReport.user.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white font-bold text-lg">
                                    {displayReport.user?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{displayReport.user?.full_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{format(new Date(displayReport.report_date), 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-500"></span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${displayReport.report_type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                                    displayReport.report_type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {displayReport.report_type === 'daily' ? 'Báo cáo ngày' :
                                        displayReport.report_type === 'weekly' ? 'Báo cáo tuần' :
                                            displayReport.report_type === 'monthly' ? 'Báo cáo tháng' : 'Báo cáo bù'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Main Content */}
                    <div className="prose prose-invert max-w-none">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Báo cáo hôm nay</h4>
                        <div dangerouslySetInnerHTML={{ __html: displayReport.content }} />
                    </div>

                    {/* Plans Section */}
                    {(displayReport.next_day_plan || displayReport.next_week_plan || displayReport.next_month_plan || displayReport.next_plan) && (
                        <div className="mt-8 pt-6 border-t border-slate-800 space-y-6">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Kế hoạch</h4>

                            {displayReport.next_plan && !displayReport.next_day_plan && !displayReport.next_week_plan && !displayReport.next_month_plan && (
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Kế hoạch tiếp theo
                                    </h5>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: displayReport.next_plan }} />
                                    </div>
                                </div>
                            )}

                            {displayReport.next_day_plan && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Kế hoạch ngày mai
                                    </h5>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: displayReport.next_day_plan }} />
                                    </div>
                                </div>
                            )}

                            {displayReport.next_week_plan && (
                                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                    <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Kế hoạch tuần tới
                                    </h5>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: displayReport.next_week_plan }} />
                                    </div>
                                </div>
                            )}

                            {displayReport.next_month_plan && (
                                <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                    <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Kế hoạch tháng tới
                                    </h5>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: displayReport.next_month_plan }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reviewer Note Display */}
                    {displayReport.reviewer_note && (
                        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Ghi chú từ quản lý
                            </h4>
                            <p className="text-sm text-slate-300">{displayReport.reviewer_note}</p>
                        </div>
                    )}

                    {/* Attachments */}
                    {displayReport.attachments && displayReport.attachments.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-800">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Tệp đính kèm</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {displayReport.attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 group hover:border-slate-500 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center shrink-0">
                                                <FileText className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm text-slate-200 font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-[#0d131a]">
                    {!action ? (
                        <div className="flex justify-between items-center gap-4">
                            <div className="text-xs text-slate-500 italic">
                                Trạng thái: <span className={`font-bold ${displayReport.status === 'approved' ? 'text-green-400' :
                                    displayReport.status === 'changes_requested' ? 'text-orange-400' :
                                        displayReport.status === 'rejected' ? 'text-red-400' :
                                            displayReport.status === 'reviewed' ? 'text-blue-400' : 'text-yellow-400'
                                    }`}>
                                    {displayReport.status === 'approved' ? 'Đã phê duyệt' :
                                        displayReport.status === 'changes_requested' ? 'Yêu cầu sửa' :
                                            displayReport.status === 'rejected' ? 'Đã từ chối' :
                                                displayReport.status === 'reviewed' ? 'Đã xem' : 'Đang chờ'}
                                </span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all"
                                    onClick={() => setAction('comment')}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Góp ý
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 transition-all"
                                    onClick={() => setAction('request_changes')}
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Yêu cầu sửa
                                </button>
                                <button
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black font-bold shadow-lg shadow-green-500/20 transition-all"
                                    onClick={() => setAction('approve')}
                                >
                                    <Check className="h-4 w-4" />
                                    Phê duyệt
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-5 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-white">
                                    {action === 'approve' ? 'Xác nhận phê duyệt' :
                                        action === 'request_changes' ? 'Yêu cầu chỉnh sửa' : 'Gửi góp ý'}
                                </h4>
                                <button onClick={() => setAction(null)} className="text-xs text-slate-500 hover:text-white">Hủy bỏ</button>
                            </div>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={action === 'approve' ? 'Nhập ghi chú (tùy chọn)...' : 'Nhập nội dung...'}
                                className="w-full bg-[#161b22] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary min-h-[80px]"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-3">
                                <button
                                    onClick={() => setAction(null)}
                                    className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-400 text-sm"
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (action !== 'approve' && !note.trim())}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${action === 'approve' ? 'bg-green-500 hover:bg-green-600 text-black' :
                                        action === 'request_changes' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                                            'bg-primary hover:bg-primary/90 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isSubmitting ? 'Đang xử lý...' : 'Gửi xác nhận'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

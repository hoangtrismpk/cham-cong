'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, X, Send, FileText, UserCheck, Search, Check, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { submitReport, updateReportContent, WorkReport } from '@/app/actions/work-reports'
import { MediaPicker } from '@/components/wordpress/media-picker'
import { createClient } from '@/utils/supabase/client'

// Placeholder text based on report type
const PLACEHOLDERS = {
    daily: {
        content: 'Hôm nay bạn đã làm được những gì? (VD: Hoàn thành task X, họp với team Y, fix bug Z...)',
        nextPlan: 'Ngày mai bạn dự định làm gì? (VD: Tiếp tục phát triển tính năng A, review code B...)'
    },
    weekly: {
        content: 'Tuần này bạn đã hoàn thành những gì? (VD: Sprint goals, các task chính, thành tựu nổi bật...)',
        nextPlan: 'Tuần tới bạn sẽ tập trung vào gì? (VD: Mục tiêu chính, deadline quan trọng...)'
    },
    monthly: {
        content: 'Tháng này bạn đã đạt được những gì? (VD: Các dự án hoàn thành, KPI đạt được, kỹ năng mới...)',
        nextPlan: 'Tháng tới bạn có kế hoạch gì? (VD: Mục tiêu lớn, dự án mới, cải tiến quy trình...)'
    },
    makeup: {
        content: 'Mô tả công việc bạn đã làm trong thời gian bù (VD: Ngày nào, làm gì, tại sao...)',
        nextPlan: 'Kế hoạch tiếp theo sau khi bù? (VD: Trở lại công việc thường ngày, hoàn thành task còn lại...)'
    }
}

interface Manager {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role_display: string
    job_title?: string
}

interface ReportFormProps {
    initialDate?: Date
    initialType?: 'daily' | 'weekly' | 'monthly' | 'makeup'
    onSuccess?: (date: Date) => void
    initialData?: WorkReport | null
}

export default function ReportForm({ initialDate, initialType = 'daily', onSuccess, initialData }: ReportFormProps) {
    const [date, setDate] = useState<Date>(new Date())
    const [content, setContent] = useState('')
    const [nextPlan, setNextPlan] = useState('')
    const [reportType, setReportType] = useState<string>('daily')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
    // For manager selection
    const [managers, setManagers] = useState<Manager[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    // Load initial data for viewing/editing
    useEffect(() => {
        if (initialData) {
            setDate(new Date(initialData.report_date))
            setContent(initialData.content)

            // Map specific plan columns to generic nextPlan state based on report type
            let planContent = ''
            if (initialData.report_type === 'daily') planContent = initialData.next_day_plan || ''
            else if (initialData.report_type === 'weekly') planContent = initialData.next_week_plan || ''
            else if (initialData.report_type === 'monthly') planContent = initialData.next_month_plan || ''
            else planContent = initialData.next_plan || '' // Fallback for makeup or generic

            setNextPlan(planContent)
            setReportType(initialData.report_type)
            if (initialData.attachments) {
                setUploadedUrls(initialData.attachments.map(a => a.url))
            }
        }
    }, [initialData])
    const [selectedManagers, setSelectedManagers] = useState<string[]>([])
    const [isLoadingManagers, setIsLoadingManagers] = useState(true)

    // Update form when props change (e.g. clicking makeup report)
    useEffect(() => {
        if (initialDate) {
            setDate(initialDate)
        }
        if (initialType) {
            setReportType(initialType)
        }
    }, [initialDate, initialType])

    // Load managers list
    useEffect(() => {
        async function loadManagers() {
            try {
                const supabase = createClient()

                // Get all users with their roles
                const { data, error } = await supabase
                    .from('profiles')
                    .select(`
                        id, 
                        full_name, 
                        email, 
                        avatar_url,
                        job_title,
                        role_id,
                        roles (
                            name,
                            display_name,
                            permissions
                        )
                    `)
                    .not('role_id', 'is', null)
                    .order('full_name')

                if (error) {
                    console.error('Error loading managers:', error)
                    throw error
                }

                if (!data || data.length === 0) {
                    console.log('No users found with roles')
                    setManagers([])
                    return
                }

                // Filter users who can receive reports (admin or have reports.view permission)
                const managersList = data
                    .filter((profile: any) => {
                        const role = profile.roles
                        if (!role) return false

                        const permissions = role.permissions || []
                        const roleName = role.name?.toLowerCase()

                        // Admin has all permissions
                        if (permissions.includes('*')) return true

                        // Has reports.view permission
                        if (permissions.includes('reports.view')) return true
                        if (permissions.includes('reports.*')) return true

                        // Or is admin/accountant role
                        if (roleName === 'admin' || roleName === 'accountant') return true

                        return false
                    })
                    .map((profile: any) => ({
                        id: profile.id,
                        full_name: profile.full_name,
                        email: profile.email,
                        avatar_url: profile.avatar_url,
                        role_display: profile.roles?.display_name || 'N/A',
                        job_title: profile.job_title
                    }))

                console.log('Managers found:', managersList.length)
                setManagers(managersList)
            } catch (error) {
                console.error('Error loading managers:', error)
                toast.error('Không thể tải danh sách quản lý')
            } finally {
                setIsLoadingManagers(false)
            }
        }

        loadManagers()
    }, [])

    const removeUploadedFile = (index: number) => {
        setUploadedUrls(uploadedUrls.filter((_, i) => i !== index))
    }

    const toggleManager = (managerId: string) => {
        setSelectedManagers(prev =>
            prev.includes(managerId)
                ? prev.filter(id => id !== managerId)
                : [...prev, managerId]
        )
    }

    const handleSubmit = async () => {
        // Validation
        if (!content.trim()) {
            toast.error('Vui lòng nhập nội dung báo cáo')
            return
        }

        if (!nextPlan.trim()) {
            toast.error('Vui lòng nhập kế hoạch kế tiếp')
            return
        }

        if (selectedManagers.length === 0) {
            toast.error('Vui lòng chọn ít nhất một người nhận báo cáo')
            return
        }

        setIsSubmitting(true)

        try {
            const attachments = uploadedUrls.map((url, index) => ({
                name: `Attachment ${index + 1}`,
                url: url,
                type: 'uploaded',
                size: 0
            }))

            const formData = new FormData()
            formData.append('content', content)
            formData.append('next_plan', nextPlan)
            formData.append('report_date', format(date, 'yyyy-MM-dd'))
            formData.append('report_type', reportType)
            formData.append('attachments', JSON.stringify(attachments))
            formData.append('recipients', JSON.stringify(selectedManagers))

            let result;
            if (initialData) {
                result = await updateReportContent(initialData.id, formData)
            } else {
                result = await submitReport(formData)
            }

            if (result.success) {
                toast.success(initialData ? 'Cập nhật báo cáo thành công!' : 'Gửi báo cáo thành công!')
                // Reset form ONLY if creating new
                if (!initialData) {
                    setContent('')
                    setNextPlan('')
                    setUploadedUrls([])
                    setSelectedManagers([])
                }

                if (onSuccess) onSuccess(date)
            } else {
                if (result.message === 'DUPLICATE_DATE') {
                    toast.error('Hôm nay bạn đã báo cáo rồi! Vui lòng chọn báo cáo trong lịch sử để chỉnh sửa.')
                } else {
                    toast.error(result.message || 'Thao tác thất bại')
                }
            }
        } catch (error) {
            console.error(error)
            toast.error('Có lỗi xảy ra khi gửi báo cáo')
        } finally {
            setIsSubmitting(false)
        }
    }

    const currentPlaceholder = PLACEHOLDERS[reportType as keyof typeof PLACEHOLDERS]

    return (
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Báo cáo công việc</h2>
                    <p className="text-slate-500 mt-1">Cập nhật tiến độ làm việc của bạn cho quản lý.</p>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={reportType !== 'makeup'}
                            className={cn(
                                "justify-start text-left font-normal bg-[#161b22] border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-auto px-4 rounded-xl",
                                !date && "text-muted-foreground",
                                reportType !== 'makeup' && "opacity-80 cursor-default hover:bg-[#161b22] hover:text-slate-300"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                            {date ? format(date, "EEEE - dd/MM/yyyy", { locale: vi }) : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#161b22] border-slate-700" align="end">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && setDate(d)}
                            initialFocus
                            className="bg-[#161b22] text-white"
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Report Type Tabs */}
            <div className="mb-6">
                <label className="text-sm font-medium text-slate-400 mb-2 block">Loại báo cáo</label>
                <div className="flex bg-[#0d131a] p-1 rounded-xl w-fit border border-slate-800">
                    {['daily', 'weekly', 'monthly', 'makeup'].map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setReportType(t);
                                // Reset to today when switching back to main types manually
                                if (t !== 'makeup') {
                                    setDate(new Date());
                                }
                            }}
                            disabled={t === 'makeup' && reportType !== 'makeup'}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                reportType === t
                                    ? "bg-slate-700 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50",
                                t === 'makeup' && reportType !== 'makeup' && "opacity-30 cursor-not-allowed filter grayscale"
                            )}
                        >
                            {t === 'daily' ? 'Hằng ngày' :
                                t === 'weekly' ? 'Hằng tuần' :
                                    t === 'monthly' ? 'Hằng tháng' : 'Báo cáo bù'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Admin Change Request Banner */}
            {initialData?.status === 'changes_requested' && initialData?.reviewer_note && (
                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-amber-500 text-xl">error</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-amber-500 font-bold text-sm mb-2">⚠️ Yêu cầu chỉnh sửa từ quản lý</h4>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {initialData.reviewer_note}
                            </p>
                            <p className="text-amber-500/70 text-xs mt-3 italic">
                                Vui lòng cập nhật báo cáo theo yêu cầu trên và gửi lại.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content - Plain Textarea */}
            <div className="mb-6 space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    Nội dung báo cáo <span className="text-red-400">*</span>
                </label>
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={currentPlaceholder.content}
                    className="min-h-[200px] bg-[#0d131a] border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-cyan-500 resize-none rounded-xl"
                />
            </div>

            {/* Next Plan */}
            <div className="mb-6 space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    Kế hoạch kế tiếp <span className="text-red-400">*</span>
                </label>
                <Textarea
                    value={nextPlan}
                    onChange={(e) => setNextPlan(e.target.value)}
                    placeholder={currentPlaceholder.nextPlan}
                    className="min-h-[120px] bg-[#0d131a] border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-cyan-500 resize-none rounded-xl"
                />
            </div>

            {/* Report To (Recipients) - Premium Redesign */}
            <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2 tracking-tight uppercase italic">
                        <UserCheck className="h-4 w-4 text-cyan-500" />
                        Người nhận báo cáo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative w-48 md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Tìm quản lý..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0d131a] border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {isLoadingManagers ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-[#0d131a]/50 border border-dashed border-slate-800 rounded-2xl">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent" />
                            <p className="text-slate-500 text-xs mt-3 font-medium">Đang tải danh sách...</p>
                        </div>
                    ) : managers.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-[#0d131a] border border-slate-800 rounded-2xl">
                            <p className="text-slate-500 text-xs italic">Không tìm thấy quản lý phù hợp</p>
                        </div>
                    ) : (
                        managers
                            .filter(m => m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((manager) => {
                                const isSelected = selectedManagers.includes(manager.id)
                                return (
                                    <div
                                        key={manager.id}
                                        onClick={() => toggleManager(manager.id)}
                                        className={cn(
                                            "relative group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border duration-300",
                                            isSelected
                                                ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                                : "bg-[#0d131a] border-slate-800 hover:border-slate-700 hover:bg-slate-800/30"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl overflow-hidden border p-0.5 transition-all",
                                                isSelected ? "border-cyan-500/50 shadow-sm" : "border-slate-800 group-hover:border-slate-700"
                                            )}>
                                                {manager.avatar_url ? (
                                                    <img src={manager.avatar_url} alt="" className="h-full w-full object-cover rounded-[10px]" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-300 text-xs font-black rounded-[10px]">
                                                        {manager.full_name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-[#161b22] shadow-sm animate-in zoom-in duration-200">
                                                    <Check className="h-2.5 w-2.5 text-black stroke-[3px]" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-xs font-black tracking-tight transition-colors truncate",
                                                isSelected ? "text-white" : "text-slate-300 group-hover:text-white"
                                            )}>
                                                {manager.full_name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-widest transition-colors",
                                                    isSelected ? "text-cyan-500/80" : "text-slate-500 group-hover:text-slate-400"
                                                )}>
                                                    {(manager as any).role_display || 'Quản lý'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                    )}
                </div>
                {selectedManagers.length > 0 && (
                    <p className="text-[10px] font-bold text-slate-500 italic tracking-wide animate-in fade-in slide-in-from-left-2">
                        Đã chọn {selectedManagers.length} người nhận báo cáo
                    </p>
                )}
            </div>

            {/* Attachments */}
            <div className="mb-8 space-y-4">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Tệp đính kèm (không bắt buộc)
                </label>

                {/* WordPress Media Picker */}
                <MediaPicker
                    onUploadSuccess={(url) => {
                        setUploadedUrls([...uploadedUrls, url])
                        toast.success('File đã được upload lên WordPress!')
                    }}
                    accept="image/*,application/pdf,.doc,.docx"
                    maxSize={10}
                />

                {/* Uploaded Files List */}
                {uploadedUrls.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500 font-medium">Đã upload ({uploadedUrls.length} file)</p>
                        {uploadedUrls.map((url, idx) => (
                            <div key={idx} className="bg-[#161b22] border border-slate-700 rounded-xl p-3 flex items-center justify-between group">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="h-10 w-10 rounded-lg bg-[#0d131a] flex items-center justify-center shrink-0 border border-slate-800">
                                        <FileText className="h-5 w-5 text-cyan-500" />
                                    </div>
                                    <div className="truncate flex-1">
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:underline truncate block"
                                        >
                                            {url.split('/').pop() || `File ${idx + 1}`}
                                        </a>
                                        <p className="text-xs text-slate-500 mt-0.5">WordPress Media</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeUploadedFile(idx)}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors ml-2"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
                <p className="text-sm text-slate-500">
                    <span className="text-red-400">*</span> Các trường bắt buộc
                </p>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-8 py-6 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent mr-2" />
                            Đang gửi...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            {initialData ? 'Cập nhật báo cáo' : 'Gửi báo cáo'}
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}

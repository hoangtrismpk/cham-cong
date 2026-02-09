'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Activity, CheckCircle2, XCircle, Clock,
    FileText, UserCog, CalendarClock, Eye,
    MoreHorizontal, Filter
} from 'lucide-react'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { getActivities, approveActivity, rejectActivity, ActivityItem } from '@/app/actions/approvals'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function ApprovalsPage() {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending')

    // Pagination state
    const itemsPerPage = 10
    const [currentPage, setCurrentPage] = useState(1)
    const [pageInput, setPageInput] = useState('1')
    const [totalCount, setTotalCount] = useState(0)
    const totalPages = Math.ceil(totalCount / itemsPerPage)

    // Modal State
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false)
    const [isRejectOpen, setIsRejectOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const router = useRouter()

    const loadData = async () => {
        setLoading(true)
        try {
            const { activities: data, totalCount: count } = await getActivities(viewMode, currentPage, itemsPerPage)
            setActivities(data)
            setTotalCount(count)
        } catch (error) {
            console.error(error)
            toast.error('Không thể tải dữ liệu hoạt động')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [viewMode, currentPage])

    // Sync pageInput when currentPage changes via buttons
    useEffect(() => {
        setPageInput(currentPage.toString())
    }, [currentPage])

    const handleOpenDetail = (item: ActivityItem) => {
        setSelectedItem(item)
        setIsDetailOpen(true)
    }

    const handleApproveInit = () => {
        setIsApproveConfirmOpen(true)
    }

    const handleApproveConfirm = async () => {
        if (!selectedItem) return
        setProcessing(selectedItem.id)
        try {
            const res = await approveActivity(selectedItem.id, selectedItem.type)
            if (res.success) {
                toast.success('Đã duyệt yêu cầu')
                setActivities(prev => prev.filter(r => r.id !== selectedItem.id))
                setIsApproveConfirmOpen(false)
                setIsDetailOpen(false)
            } else {
                toast.error('Lỗi khi duyệt: ' + res.message)
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra')
        } finally {
            setProcessing(null)
        }
    }

    const handleRejectInit = () => {
        setIsRejectOpen(true)
    }

    const handleRejectSubmit = async () => {
        if (!selectedItem) return
        if (!rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối')
            return
        }

        setProcessing(selectedItem.id)
        try {
            const res = await rejectActivity(selectedItem.id, selectedItem.type, rejectReason)
            if (res.success) {
                toast.success('Đã từ chối yêu cầu')
                setActivities(prev => prev.filter(r => r.id !== selectedItem.id))
                setIsRejectOpen(false)
                setIsDetailOpen(false)
                setRejectReason('')
            } else {
                toast.error('Lỗi khi từ chối: ' + res.message)
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra')
        } finally {
            setProcessing(null)
        }
    }

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'leave_request':
                return {
                    label: 'Nghỉ phép',
                    badge: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
                    icon: <CalendarClock className="w-4 h-4" />
                }
            case 'attendance_edit':
                return {
                    label: 'Sửa công',
                    badge: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
                    icon: <Clock className="w-4 h-4" />
                }
            case 'profile_update':
                return {
                    label: 'Hồ sơ',
                    badge: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
                    icon: <UserCog className="w-4 h-4" />
                }
            case 'schedule_change':
                return {
                    label: 'Đổi lịch',
                    badge: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
                    icon: <CalendarClock className="w-4 h-4" />
                }
            default:
                return {
                    label: 'Khác',
                    badge: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
                    icon: <FileText className="w-4 h-4" />
                }
        }
    }

    const filteredActivities = (tab: string) => {
        if (tab === 'all') return activities
        // Also exclude profile_update and schedule_change from 'other'
        return activities.filter(a => a.type === tab || (tab === 'other' && !['leave_request', 'attendance_edit', 'profile_update', 'schedule_change'].includes(a.type)))
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="w-6 h-6 text-primary" suppressHydrationWarning />
                        Hoạt động chờ xử lý
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Duyệt các yêu cầu từ nhân viên: nghỉ phép, sửa công, cập nhật thông tin...</p>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={viewMode} onValueChange={(v) => {
                        setViewMode(v as 'pending' | 'history')
                        setCurrentPage(1)
                        setPageInput('1')
                    }} className="w-auto">
                        <TabsList className="bg-slate-900 border border-slate-800">
                            <TabsTrigger value="pending" className="data-[state=active]:bg-slate-800 text-slate-400">Chờ xử lý</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-slate-800 text-slate-400">Lịch sử</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto mb-6">
                    <TabsTrigger value="all" className="px-4 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Tất cả</TabsTrigger>
                    <TabsTrigger value="leave_request" className="px-4 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Nghỉ phép</TabsTrigger>
                    <TabsTrigger value="schedule_change" className="px-4 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Đổi lịch</TabsTrigger>
                    <TabsTrigger value="attendance_edit" className="px-4 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Sửa công</TabsTrigger>
                    <TabsTrigger value="profile_update" className="px-4 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Hồ sơ</TabsTrigger>
                </TabsList>

                {['all', 'leave_request', 'schedule_change', 'attendance_edit', 'profile_update'].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800/50" />
                                ))}
                            </div>
                        ) : filteredActivities(tab).length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
                                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-slate-600 opacity-50" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-300">Không có yêu cầu nào</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {viewMode === 'pending' ? 'Hiện tại không có hoạt động nào cần xử lý.' : 'Chưa có lịch sử duyệt đơn.'}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-[#2d3748] bg-[#0f1219] overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#2d3748] bg-[#161b2c] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-3">Nhân viên</div>
                                    <div className="col-span-2">Loại yêu cầu</div>
                                    <div className="col-span-2">Thời gian gửi</div>
                                    <div className="col-span-3">Nội dung</div>
                                    <div className="col-span-1 border-l border-slate-800 pl-4">Trạng thái</div>
                                    <div className="col-span-1 text-right">Hành động</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-[#2d3748]">
                                    {filteredActivities(tab).map(item => {
                                        const typeStyle = getTypeStyles(item.type)
                                        const date = new Date(item.created_at)
                                        return (
                                            <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-6 items-center hover:bg-slate-800/30 transition-colors group">
                                                {/* Requester */}
                                                <div className="col-span-3 flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-slate-700">
                                                        <AvatarImage src={item.user.avatar_url || ''} />
                                                        <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                                                            {item.user.full_name?.substring(0, 1).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-none mb-1">{item.user.full_name}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">{item.user.department} • {item.user.role}</p>
                                                    </div>
                                                </div>

                                                {/* Type */}
                                                <div className="col-span-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${typeStyle.badge}`}>
                                                        {typeStyle.label}
                                                    </span>
                                                </div>

                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium text-white">{format(date, 'dd/MM/yyyy')}</p>
                                                    <p className="text-xs text-slate-500">{format(date, 'HH:mm')}</p>
                                                </div>

                                                {/* Summary */}
                                                <div className="col-span-3 pr-4">
                                                    <p className="text-sm font-medium text-white truncate text-ellipsis" title={item.reason}>
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {item.reason}
                                                    </p>
                                                    {item.payload?.leave_date && (
                                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                                            Ngày nghỉ: {format(new Date(item.payload.leave_date), 'dd/MM/yyyy')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Status */}
                                                <div className="col-span-1 border-l border-slate-800 pl-4">
                                                    {item.status === 'pending' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                                                            <div>
                                                                <p className="text-xs font-bold text-yellow-500">Đang chờ</p>
                                                                <p className="text-[10px] text-slate-500">Review</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.status === 'approved' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <div>
                                                                <p className="text-xs font-bold text-emerald-500">Đã duyệt</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.status === 'rejected' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            <div>
                                                                <p className="text-xs font-bold text-red-500">Từ chối</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action */}
                                                <div className="col-span-1 text-right">
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 text-xs bg-transparent border-slate-700 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all font-medium"
                                                        onClick={() => handleOpenDetail(item)}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* --- PAGINATION CONTROLS --- */}
                                {totalCount > 0 && (
                                    <div className="flex items-center justify-between px-6 py-6 border-t border-slate-800">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-900 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-xl"
                                        >
                                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                                            Trước
                                        </button>

                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-white">Trang</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={totalPages}
                                                    value={pageInput}
                                                    onChange={(e) => setPageInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            let page = parseInt(pageInput)
                                                            if (isNaN(page) || page < 1) page = 1
                                                            if (page > totalPages) page = totalPages
                                                            setCurrentPage(page)
                                                            setPageInput(page.toString())
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setPageInput(currentPage.toString())
                                                    }}
                                                    className="w-12 h-6 px-1 text-center bg-slate-800 border border-white/10 rounded text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary no-spinner"
                                                />
                                                <span className="text-xs font-bold text-white">/ {totalPages}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                {totalCount} kết quả
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-900 border border-white/5 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-xl"
                                        >
                                            Sau
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                ))}

            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="bg-[#161b2c] border-slate-700 text-slate-200 sm:max-w-[600px] p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-0"> {/* Use p-0 because we have custom padding in the div */}
                        <div className="p-6 bg-[#0f1219] border-b border-slate-800 flex justify-between items-start">
                            <div className="flex gap-4">
                                <Avatar className="h-12 w-12 border border-slate-700">
                                    <AvatarImage src={selectedItem?.user.avatar_url || ''} />
                                    <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                                        {selectedItem?.user.full_name?.substring(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-white mb-1">
                                        {selectedItem?.user.full_name}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500">
                                        {selectedItem?.user.department} • {selectedItem?.user.email}
                                    </DialogDescription>
                                </div>
                            </div>
                            {selectedItem && (
                                <Badge className={`${getTypeStyles(selectedItem.type).badge} rounded-md px-3 py-1`}>
                                    {getTypeStyles(selectedItem.type).label}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Request Details */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại yêu cầu</p>
                                <p className="text-sm font-medium text-white">{selectedItem?.title}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian gửi</p>
                                <p className="text-sm font-medium text-white">
                                    {selectedItem && format(new Date(selectedItem.created_at), 'HH:mm - dd/MM/yyyy')}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lý do / Nội dung</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {selectedItem?.reason}
                            </p>
                        </div>

                        {/* Additional Payload Info */}
                        {selectedItem?.type === 'leave_request' && selectedItem.payload && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Ngày nghỉ phép</p>
                                    <p className="text-sm font-bold text-white">{format(new Date(selectedItem.payload.leave_date), 'dd/MM/yyyy')}</p>
                                </div>
                                {selectedItem.payload.image_url && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-500 mb-2">Hình ảnh đính kèm</p>
                                        <div className="rounded-lg overflow-hidden border border-slate-700">
                                            <img src={selectedItem.payload.image_url} alt="Attachment" className="w-full h-auto object-cover max-h-[300px]" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedItem?.type === 'attendance_edit' && selectedItem.payload && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Giờ vào mới</p>
                                    <p className="text-lg font-mono font-bold text-emerald-400">{selectedItem.payload.check_in_time || '--:--'}</p>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Giờ ra mới</p>
                                    <p className="text-lg font-mono font-bold text-orange-400">{selectedItem.payload.check_out_time || '--:--'}</p>
                                </div>
                            </div>
                        )}

                        {selectedItem?.type === 'schedule_change' && selectedItem.payload && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Ngày làm việc</p>
                                    <p className="text-sm font-bold text-white">{format(new Date(selectedItem.payload.work_date), 'dd/MM/yyyy')}</p>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Ca làm việc mới</p>
                                    <p className="text-lg font-mono font-bold text-cyan-400">
                                        {selectedItem.payload.start_time} - {selectedItem.payload.end_time}
                                    </p>
                                    <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-wider">{selectedItem.payload.shift_type}</p>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="p-6 bg-[#0f1219] border-t border-slate-800 flex justify-end gap-3">
                        <Button variant="outline" className="text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800" onClick={() => setIsDetailOpen(false)}>
                            Đóng
                        </Button>
                        {selectedItem?.status === 'pending' && (
                            <>
                                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-900/20" onClick={handleRejectInit}>
                                    Từ chối
                                </Button>
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" onClick={handleApproveInit}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Phê duyệt
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reject Confirmation Dialog */}
            <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle>Lý do từ chối</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Yêu cầu này sẽ bị từ chối. Vui lòng nhập lý do để gửi thông báo cho nhân viên.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do tại đây..."
                            className="bg-slate-950 border-slate-800 h-32 text-slate-200 placeholder:text-slate-600"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={handleRejectSubmit} disabled={!!processing}>
                            {processing ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Confirmation Dialog */}
            <Dialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <DialogContent className="bg-[#161b2c] border-slate-700 text-slate-200 sm:max-w-[400px]">
                    <DialogHeader className="items-center text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white">Xác nhận duyệt</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Bạn có chắc chắn muốn phê duyệt yêu cầu này của <span className="text-white font-medium">{selectedItem?.user.full_name}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-3 mt-4">
                        <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setIsApproveConfirmOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                            onClick={handleApproveConfirm}
                            disabled={!!processing}
                        >
                            {processing ? 'Đang xử lý...' : 'Xác nhận duyệt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Send, Plus, Loader2, Users, Check, ChevronsUpDown, X, Calendar as CalendarIcon, Clock, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createReviewCampaign, sendCampaign, getCampaignOptions } from '@/app/actions/campaigns'
import { cn } from "@/lib/utils"

interface Campaign {
    id: string
    title: string
    message: string
    link?: string
    status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed'
    total_recipients: number
    success_count: number
    failure_count: number
    created_at: string
    scheduled_at?: string
}

interface Options {
    roles: { name: string, display_name: string }[]
    departments: string[]
    employees: { id: string, full_name: string, employee_code: string, department: string }[]
}

import { usePermissions } from '@/contexts/permission-context'

export default function NotificationsClientPage() {
    const { can } = usePermissions()
    const canSend = can('notifications.send')

    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [sending, setSending] = useState(false)

    // Options State
    const [options, setOptions] = useState<Options>({ roles: [], departments: [], employees: [] })
    const [optionsLoading, setOptionsLoading] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        link: '',
        target_type: 'all',
        target_value: ''
    })

    // Specific Users Selection State
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [userSelectOpen, setUserSelectOpen] = useState(false)

    // Scheduling State
    const [scheduleEnabled, setScheduleEnabled] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date())
    const [scheduledTime, setScheduledTime] = useState("09:00")

    const supabase = createClient()

    const loadCampaigns = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('notification_campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setCampaigns(data as Campaign[])
        setLoading(false)
    }

    const loadOptions = async () => {
        setOptionsLoading(true)
        try {
            const opts = await getCampaignOptions()
            setOptions(opts)
        } catch (e) {
            console.error(e)
        } finally {
            setOptionsLoading(false)
        }
    }

    useEffect(() => {
        loadCampaigns()
        loadOptions()
    }, [])

    // Sync selectedUsers to formData.target_value
    useEffect(() => {
        if (formData.target_type === 'specific_users') {
            setFormData(prev => ({ ...prev, target_value: selectedUsers.join(',') }))
        }
    }, [selectedUsers, formData.target_type])

    const handleCreate = async () => {
        setSending(true)
        try {
            const form = new FormData()
            form.append('title', formData.title)
            form.append('message', formData.message)
            form.append('link', formData.link)
            form.append('target_type', formData.target_type)
            form.append('target_value', formData.target_value)

            if (scheduleEnabled && scheduledDate) {
                // Combine Date and Time
                const [hours, minutes] = scheduledTime.split(':').map(Number)
                const scheduledDateTime = new Date(scheduledDate)
                scheduledDateTime.setHours(hours, minutes, 0, 0)
                form.append('scheduled_at', scheduledDateTime.toISOString())
            }

            const res = await createReviewCampaign(form)
            if (res.error) throw new Error(res.error)

            if (res.status === 'scheduled') {
                toast.success('Đã lên lịch gửi!')
            } else if (res.id) {
                const sendRes = await sendCampaign(res.id)
                if (sendRes?.error) toast.error('Lỗi gửi: ' + sendRes.error)
                else toast.success('Đã bắt đầu gửi!')
            }

            setIsOpen(false)
            setFormData({ title: '', message: '', link: '', target_type: 'all', target_value: '' })
            setSelectedUsers([])
            setScheduleEnabled(false)
            loadCampaigns()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSending(false)
        }
    }

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Send className="w-6 h-6 text-primary" />
                        Gửi Thông Báo (Push)
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Quản lý và gửi thông báo hàng loạt đến nhân viên</p>
                </div>
                {canSend && (
                    <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo Thông Báo Mới
                    </Button>
                )}
            </div>

            {/* Campaign List */}
            <div className="rounded-2xl border border-[#2d3748] bg-[#0f1219] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#161b2c] text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#2d3748]">
                            <tr>
                                <th className="px-6 py-4">Chiến dịch</th>
                                <th className="px-6 py-4">Mục tiêu</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Đã gửi</th>
                                <th className="px-6 py-4 text-right">Ngày tạo / Gửi</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d3748]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-4 bg-slate-800 rounded animate-pulse w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Chưa có chiến dịch nào
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-white">{c.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.message}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3 h-3 text-slate-500" />
                                                <span className="text-xs text-slate-300">
                                                    {c.message.includes('specific_users') ? 'Người dùng cụ thể' :
                                                        c.status === 'draft' ? 'Chưa gửi' : 'Tất cả nhân viên'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={c.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(c.status === 'completed' || c.status === 'processing') ? (
                                                <>
                                                    <span className="text-sm font-mono font-medium text-emerald-400">{c.success_count}</span>
                                                    <span className="text-slate-600 mx-1">/</span>
                                                    <span className="text-xs text-slate-500">{c.total_recipients}</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-xs text-slate-500 font-mono">
                                                {c.scheduled_at ? (
                                                    <span className="text-purple-400 flex items-center justify-end gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {format(new Date(c.scheduled_at), 'HH:mm dd/MM', { locale: vi })}
                                                    </span>
                                                ) : (
                                                    format(new Date(c.created_at), 'HH:mm dd/MM', { locale: vi })
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-700 hover:text-white" asChild>
                                                <a href={`/admin/notifications/${c.id}`}>
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="bg-[#161b2c] border-slate-700 text-slate-200 sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Gửi Thông Báo Mới</DialogTitle>
                        <DialogDescription>
                            Gửi thông báo đến ứng dụng của nhân viên.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tiêu đề</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="VD: Thông báo nghỉ lễ 30/4"
                                className="bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nội dung</Label>
                            <Textarea
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Nhập nội dung thông báo..."
                                className="bg-slate-900 border-slate-700 min-h-[100px] text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Gửi đến</Label>
                            <div className="grid grid-cols-1 gap-4">
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.target_type}
                                    onChange={e => {
                                        setFormData({ ...formData, target_type: e.target.value, target_value: '' })
                                        setSelectedUsers([])
                                    }}
                                >
                                    <option value="all">Tất cả nhân viên</option>
                                    <option value="role">Theo vai trò</option>
                                    <option value="department">Theo phòng ban</option>
                                    <option value="specific_users">Cụ thể (Chọn nhân viên)</option>
                                </select>

                                {/* Dynamic Input based on Type */}
                                {formData.target_type === 'role' && (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.target_value}
                                        onChange={e => setFormData({ ...formData, target_value: e.target.value })}
                                    >
                                        <option value="">-- Chọn vai trò --</option>
                                        {options.roles.map(r => (
                                            <option key={r.name} value={r.name}>{r.display_name || r.name}</option>
                                        ))}
                                    </select>
                                )}

                                {formData.target_type === 'department' && (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.target_value}
                                        onChange={e => setFormData({ ...formData, target_value: e.target.value })}
                                    >
                                        <option value="">-- Chọn phòng ban --</option>
                                        {options.departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                )}

                                {formData.target_type === 'specific_users' && (
                                    <div className="space-y-2">
                                        <Popover open={userSelectOpen} onOpenChange={setUserSelectOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={userSelectOpen}
                                                    className="w-full justify-between bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                                                >
                                                    {selectedUsers.length > 0
                                                        ? `Đã chọn ${selectedUsers.length} nhân viên`
                                                        : "Tìm và chọn nhân viên..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[450px] p-0 bg-[#0f1219] border-slate-700 text-slate-200">
                                                <Command className="bg-transparent">
                                                    <CommandInput placeholder="Tìm tên nhân viên..." className="text-white" />
                                                    <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>
                                                    <CommandList className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        <CommandGroup>
                                                            {options.employees.map((employee) => (
                                                                <CommandItem
                                                                    key={employee.id}
                                                                    value={`${employee.full_name} ${employee.employee_code}`}
                                                                    onSelect={() => toggleUser(employee.id)}
                                                                    className="aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer"
                                                                >
                                                                    <div className={cn(
                                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                        selectedUsers.includes(employee.id)
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "opacity-50 [&_svg]:invisible"
                                                                    )}>
                                                                        <Check className={cn("h-4 w-4")} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span>{employee.full_name}</span>
                                                                        <span className="text-[10px] text-slate-500">{employee.department} - {employee.employee_code}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Selected Badges */}
                                        {selectedUsers.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {selectedUsers.map(uid => {
                                                    const u = options.employees.find(e => e.id === uid)
                                                    return (
                                                        <Badge key={uid} variant="secondary" className="bg-slate-800 text-slate-200 hover:bg-slate-700">
                                                            {u?.full_name}
                                                            <button
                                                                onClick={() => toggleUser(uid)}
                                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                            >
                                                                <X className="h-3 w-3 text-slate-400 hover:text-white" />
                                                            </button>
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="schedule-mode" className="flex flex-col gap-1">
                                    <span>Hẹn giờ gửi</span>
                                    <span className="text-[10px] text-slate-500 font-normal">Tự động gửi vào thời gian đã chọn</span>
                                </Label>
                                <Switch
                                    id="schedule-mode"
                                    checked={scheduleEnabled}
                                    onCheckedChange={setScheduleEnabled}
                                />
                            </div>

                            {scheduleEnabled && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label>Ngày gửi</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-white hover:bg-slate-800",
                                                        !scheduledDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-[#0f1219] border-slate-700 text-white" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={scheduledDate}
                                                    onSelect={setScheduledDate}
                                                    initialFocus
                                                    className="bg-[#0f1219] text-white"
                                                    classNames={{
                                                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                                        day_today: "bg-slate-800 text-white",
                                                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-800 hover:text-white",
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Giờ gửi</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                            <Input
                                                type="time"
                                                value={scheduledTime}
                                                onChange={e => setScheduledTime(e.target.value)}
                                                className="pl-9 bg-slate-900 border-slate-700 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Đường dẫn (Tùy chọn)</Label>
                            <Input
                                value={formData.link}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                                placeholder="/schedule hoặc https://..."
                                className="bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-slate-800 text-slate-400">Hủy</Button>
                        <Button onClick={handleCreate} disabled={sending || !formData.title || !formData.message} className="bg-primary hover:bg-primary/90">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (scheduleEnabled ? <Clock className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />)}
                            {sending ? 'Đang xử lý...' : (scheduleEnabled ? 'Lên Lịch' : 'Gửi Ngay')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

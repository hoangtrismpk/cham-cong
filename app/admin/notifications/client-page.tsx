
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
import { vi, enUS } from 'date-fns/locale'
import { createReviewCampaign, getCampaignOptions } from '@/app/actions/campaigns'
import { cn } from "@/lib/utils"
import { useI18n } from '@/contexts/i18n-context'

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
    const { t, locale } = useI18n()
    const router = useRouter()
    const dateLocale = locale === 'vi' ? vi : enUS

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

            if (scheduleEnabled) {
                toast.success(t.admin.notificationsPage.messages.scheduledSuccess)
            } else {
                toast.success(t.admin.notificationsPage.messages.sendSuccess)
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
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117] space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Send className="w-8 h-8 text-primary" />
                        {t.admin.notificationsPage.title}
                    </h1>
                    <p className="text-slate-400">
                        {t.admin.notificationsPage.subtitle}
                    </p>
                </div>
                {canSend && (
                    <div className="flex items-center gap-3">
                        <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                            <Plus className="w-4 h-4 mr-2" />
                            {t.admin.notificationsPage.createNew}
                        </Button>
                    </div>
                )}
            </header>

            {/* Campaign List */}
            <div className="rounded-2xl border border-[#2d3748] bg-[#0f1219] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#161b2c] text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#2d3748]">
                            <tr>
                                <th className="px-6 py-4">{t.admin.notificationsPage.table.campaign}</th>
                                <th className="px-6 py-4">{t.admin.notificationsPage.table.target}</th>
                                <th className="px-6 py-4">{t.admin.notificationsPage.table.status}</th>
                                <th className="px-6 py-4 text-right">{t.admin.notificationsPage.table.sent}</th>
                                <th className="px-6 py-4 text-right">{t.admin.notificationsPage.table.date}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d3748]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-slate-800 rounded animate-pulse w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        {t.admin.notificationsPage.table.empty}
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map(c => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                        onClick={() => router.push(`/admin/notifications/${c.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-white">{c.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.message}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3 h-3 text-slate-500" />
                                                <span className="text-xs text-slate-300">
                                                    {c.message.includes('specific_users') ? t.admin.notificationsPage.targets.specific_users :
                                                        c.status === 'draft' ? t.admin.notificationsPage.targets.draft : t.admin.notificationsPage.targets.all}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={c.status} labels={t.admin.notificationsPage.status} />
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
                                                        {format(new Date(c.scheduled_at), 'HH:mm dd/MM', { locale: dateLocale })}
                                                    </span>
                                                ) : (
                                                    format(new Date(c.created_at), 'HH:mm dd/MM', { locale: dateLocale })
                                                )}
                                            </div>
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
                        <DialogTitle>{t.admin.notificationsPage.dialog.title}</DialogTitle>
                        <DialogDescription>
                            {t.admin.notificationsPage.dialog.desc}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t.admin.notificationsPage.dialog.subject}</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t.admin.notificationsPage.dialog.subjectPlaceholder}
                                className="bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.admin.notificationsPage.dialog.message}</Label>
                            <Textarea
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder={t.admin.notificationsPage.dialog.messagePlaceholder}
                                className="bg-slate-900 border-slate-700 min-h-[100px] text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t.admin.notificationsPage.dialog.sendTo}</Label>
                            <div className="grid grid-cols-1 gap-4">
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.target_type}
                                    onChange={e => {
                                        setFormData({ ...formData, target_type: e.target.value, target_value: '' })
                                        setSelectedUsers([])
                                    }}
                                >
                                    <option value="all">{t.admin.notificationsPage.dialog.targetAll}</option>
                                    <option value="role">{t.admin.notificationsPage.dialog.targetRole}</option>
                                    <option value="department">{t.admin.notificationsPage.dialog.targetDept}</option>
                                    <option value="specific_users">{t.admin.notificationsPage.dialog.targetSpecific}</option>
                                </select>

                                {/* Dynamic Input based on Type */}
                                {formData.target_type === 'role' && (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.target_value}
                                        onChange={e => setFormData({ ...formData, target_value: e.target.value })}
                                    >
                                        <option value="">{t.admin.notificationsPage.dialog.selectRole}</option>
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
                                        <option value="">{t.admin.notificationsPage.dialog.selectDept}</option>
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
                                                        ? t.admin.notificationsPage.dialog.selectedUsers.replace('{count}', String(selectedUsers.length))
                                                        : t.admin.notificationsPage.dialog.searchUser}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[450px] p-0 bg-[#0f1219] border-slate-700 text-slate-200">
                                                <Command className="bg-transparent">
                                                    <CommandInput placeholder={t.admin.notificationsPage.dialog.searchUserPlaceholder} className="text-white" />
                                                    <CommandEmpty>{t.admin.notificationsPage.dialog.noUserFound}</CommandEmpty>
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
                                    <span>{t.admin.notificationsPage.dialog.schedule}</span>
                                    <span className="text-[10px] text-slate-500 font-normal">{t.admin.notificationsPage.dialog.scheduleDesc}</span>
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
                                        <Label>{t.admin.notificationsPage.dialog.date}</Label>
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
                                                    {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : <span>{t.admin.notificationsPage.dialog.selectDate}</span>}
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
                                        <Label>{t.admin.notificationsPage.dialog.time}</Label>
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
                            <Label>{t.admin.notificationsPage.dialog.link}</Label>
                            <Input
                                value={formData.link}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                                placeholder={t.admin.notificationsPage.dialog.linkPlaceholder}
                                className="bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-slate-800 text-slate-400">{t.admin.notificationsPage.dialog.cancel}</Button>
                        <Button onClick={handleCreate} disabled={sending || !formData.title || !formData.message} className="bg-primary hover:bg-primary/90 text-slate-900">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (scheduleEnabled ? <Clock className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />)}
                            {sending ? t.admin.notificationsPage.dialog.processing : (scheduleEnabled ? t.admin.notificationsPage.dialog.scheduleLater : t.admin.notificationsPage.dialog.sendNow)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function StatusBadge({ status, labels }: { status: string, labels: any }) {
    switch (status) {
        case 'draft': return <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 font-medium">{labels.draft}</span>
        case 'scheduled': return <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 font-medium">{labels.scheduled}</span>
        case 'processing': return <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 animate-pulse font-medium">{labels.processing}</span>
        case 'completed': return <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 font-medium">{labels.completed}</span>
        case 'sent': return <span className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 font-medium">{labels.sent}</span>
        case 'failed': return <span className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 font-medium">{labels.failed}</span>
        default: return <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 font-medium">{status}</span>
    }
}

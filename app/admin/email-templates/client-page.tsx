'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus, Search, Eye, Pencil, Mail,
    Shield, UserCheck, Key, MonitorSmartphone,
    ChevronLeft, ChevronRight, Loader2, RefreshCw, ToggleLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useI18n } from '@/contexts/i18n-context'

// --- Types ---
export interface EmailTemplate {
    id: string
    slug: string
    name: string
    description: string
    subject: string
    content: string
    category: 'onboarding' | 'security' | 'attendance' | 'leave' | 'system'
    is_active: boolean
    updated_at: string
    updated_by: string
    variables: string[]
}

// --- Category config ---
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    onboarding: { label: 'Onboarding', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    security: { label: 'Security', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    attendance: { label: 'Attendance', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    leave: { label: 'Leave', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    system: { label: 'System', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

// --- Icon per template slug ---
function TemplateIcon({ slug, className }: { slug: string; className?: string }) {
    const icons: Record<string, React.ReactNode> = {
        'account-registration': <UserCheck className={cn('h-4 w-4', className)} />,
        'password-reset': <Key className={cn('h-4 w-4', className)} />,
        'password-changed': <Key className={cn('h-4 w-4', className)} />,
        'unknown-device-login': <MonitorSmartphone className={cn('h-4 w-4', className)} />,
        'leave-approved': <UserCheck className={cn('h-4 w-4', className)} />,
        'daily-attendance-report': <Shield className={cn('h-4 w-4', className)} />,
    }
    return <>{icons[slug] || <Mail className={cn('h-4 w-4', className)} />}</>
}

const ICON_COLOR: Record<string, string> = {
    'account-registration': 'bg-cyan-500/20 text-cyan-400',
    'password-reset': 'bg-orange-500/20 text-orange-400',
    'password-changed': 'bg-orange-500/20 text-orange-400',
    'unknown-device-login': 'bg-red-500/20 text-red-400',
    'leave-approved': 'bg-emerald-500/20 text-emerald-400',
    'daily-attendance-report': 'bg-violet-500/20 text-violet-400',
}

export default function EmailTemplatesClientPage() {
    const router = useRouter()
    const { t } = useI18n()
    const et = t.emailTemplates

    const [templates, setTemplates] = useState<EmailTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 8

    // ── Fetch from API ──────────────────────────────────────────────
    const fetchTemplates = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/email-templates')
            if (!res.ok) {
                // Fallback to empty if DB not set up yet
                if (res.status === 401 || res.status === 403) {
                    toast.error('Bạn không có quyền truy cập')
                    return
                }
                throw new Error(await res.text())
            }
            const data: EmailTemplate[] = await res.json()
            setTemplates(data)
        } catch (err: any) {
            toast.error('Không thể tải danh sách template')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTemplates() }, [fetchTemplates])

    // ── Toggle active/inactive ──────────────────────────────────────
    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setToggling(id)
        try {
            const res = await fetch(`/api/admin/email-templates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed')
            }
            const updated: EmailTemplate = await res.json()
            setTemplates(prev => prev.map(t => t.id === id ? updated : t))
            toast.success(updated.is_active ? 'Đã kích hoạt template' : 'Đã tắt template')
        } catch (err: any) {
            toast.error(`Lỗi: ${err.message}`)
        } finally {
            setToggling(null)
        }
    }

    // ── Filter & paginate ───────────────────────────────────────────
    const filtered = templates.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase())
        const matchCat = filterCategory === 'all' || t.category === filterCategory
        return matchSearch && matchCat
    })
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    return (
        <div className="h-full flex flex-col bg-[#0d131a]">
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <Mail className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Email Templates</h1>
                        <p className="text-xs text-slate-500">{et.subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder={et.searchPlaceholder}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            className="pl-9 pr-4 h-9 w-[260px] bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    <Button
                        className="h-9 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm gap-2 shadow-lg shadow-cyan-500/20"
                        onClick={() => router.push('/admin/email-templates/new')}
                    >
                        <Plus className="h-4 w-4" />
                        {et.createButton}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
                    {/* Table Header Bar */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                        <div>
                            <h2 className="text-base font-semibold text-white">{et.tableTitle}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{et.tableSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Category Filter */}
                            <div className="flex items-center gap-1">
                                {(['all', 'onboarding', 'security', 'attendance', 'leave', 'system'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => { setFilterCategory(cat); setPage(1) }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                            filterCategory === cat
                                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                                : "text-slate-400 border-transparent hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        {cat === 'all' ? et.filterAll : CATEGORY_CONFIG[cat]?.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-4 w-px bg-slate-700" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600"
                                onClick={fetchTemplates}
                                disabled={loading}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                <span className="text-xs">Refresh</span>
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-widest font-semibold text-slate-500">{et.columns.name}</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-semibold text-slate-500">{et.columns.category}</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-semibold text-slate-500">{et.columns.lastUpdated}</th>
                                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-semibold text-slate-500">{et.columns.status}</th>
                                <th className="text-right px-5 py-3 text-[11px] uppercase tracking-widest font-semibold text-slate-500">{et.columns.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20">
                                        <Loader2 className="h-7 w-7 animate-spin text-slate-500 mx-auto" />
                                        <p className="text-slate-600 text-xs mt-2">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20">
                                        <Mail className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">Không tìm thấy template nào</p>
                                        {search && (
                                            <button
                                                onClick={() => setSearch('')}
                                                className="text-xs text-cyan-400 hover:underline mt-1"
                                            >
                                                Xoá bộ lọc
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((template, idx) => {
                                    const catConfig = CATEGORY_CONFIG[template.category]
                                    const iconColor = ICON_COLOR[template.slug] || 'bg-slate-700 text-slate-400'
                                    const updatedDate = new Date(template.updated_at)
                                    const isToggling = toggling === template.id

                                    return (
                                        <tr
                                            key={template.id}
                                            className={cn(
                                                "group border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors",
                                                idx === paginated.length - 1 && "border-b-0"
                                            )}
                                        >
                                            {/* Name */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3 cursor-pointer group/item" onClick={() => router.push(`/admin/email-templates/${template.id}`)}>
                                                    <div className={cn("p-2 rounded-lg shrink-0", iconColor)}>
                                                        <TemplateIcon slug={template.slug} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white text-sm group-hover/item:text-cyan-400 group-hover:text-cyan-400 transition-colors">
                                                            {template.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-xs font-medium border",
                                                    catConfig?.color
                                                )}>
                                                    {catConfig?.label}
                                                </span>
                                            </td>

                                            {/* Last Updated */}
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-slate-300 font-mono">
                                                    {updatedDate.toLocaleDateString('vi-VN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">by {template.updated_by}</p>
                                            </td>

                                            {/* Status toggle */}
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleStatus(template.id, template.is_active)}
                                                    disabled={isToggling}
                                                    title={template.is_active ? 'Click để tắt' : 'Click để bật'}
                                                    className={cn(
                                                        "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition-all",
                                                        isToggling ? "opacity-50 cursor-wait" : "hover:scale-105",
                                                        template.is_active ? "text-emerald-400" : "text-slate-500"
                                                    )}
                                                >
                                                    {isToggling ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <span className={cn(
                                                            "size-2 rounded-full",
                                                            template.is_active
                                                                ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"
                                                                : "bg-slate-600"
                                                        )} />
                                                    )}
                                                    {template.is_active ? et.status.active : et.status.inactive}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/email-templates/${template.id}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-all border border-slate-600 hover:border-slate-500"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                        {et.actions.edit}
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Footer / Pagination */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0d131a]">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                            {et.displaying} {paginated.length} {et.of} {filtered.length} {et.templates}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-slate-500 px-2">{page} / {totalPages || 1}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

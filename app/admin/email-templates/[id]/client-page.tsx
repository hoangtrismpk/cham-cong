'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Bold, Italic, Underline, List, Link2, Image,
    Code, Monitor, Smartphone, Loader2, Send, Save,
    Copy, Check, Eye, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmailTemplate } from '../client-page'
import { useI18n } from '@/contexts/i18n-context'
import dynamic from 'next/dynamic'

// Dynamic import for TinyMCE to avoid SSR issues
const VisualEditor = dynamic(() => import('@tinymce/tinymce-react').then(mod => mod.Editor), { ssr: false })

// --- Mock data ---
const MOCK_TEMPLATES: Record<string, EmailTemplate> = {
    '1': {
        id: '1',
        slug: 'account-registration',
        name: 'Account Registration',
        description: 'Welcome email for new staff members',
        subject: 'Chào mừng {{user_name}} đến với {{company_name}}!',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; }
    .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px; text-align: center; }
    .logo { color: #38bdf8; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .body { padding: 40px 32px; }
    h1 { color: #1e293b; font-size: 24px; margin: 0 0 16px; }
    p { color: #475569; line-height: 1.7; margin: 0 0 16px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .info-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .info-label { color: #64748b; font-size: 13px; min-width: 80px; }
    .info-value { color: #1e293b; font-size: 13px; font-weight: 600; }
    .button { background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">⏱ {{company_name}}</div>
    </div>
    <div class="body">
      <h1>Chào mừng {{user_name}}! 🎉</h1>
      <p>Tài khoản của bạn đã được tạo thành công trên hệ thống chấm công <strong>{{company_name}}</strong>.</p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{user_email}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Mật khẩu:</span>
          <span class="info-value">{{temp_password}}</span>
        </div>
      </div>
      <p>Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>
      <a class="button" href="{{login_url}}">Đăng nhập ngay →</a>
    </div>
    <div class="footer">{{company_name}} | {{support_email}}</div>
  </div>
</body>
</html>`,
        category: 'onboarding',
        is_active: true,
        updated_at: '2023-10-24T00:00:00Z',
        updated_by: 'Admin',
        variables: ['user_name', 'user_email', 'company_name', 'temp_password', 'login_url', 'support_email']
    },
    '2': {
        id: '2',
        slug: 'password-reset',
        name: 'Password Reset',
        description: 'Recovery instructions for forgotten credentials',
        subject: 'Reset Your Password - {{company_name}}',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; }
    .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0f172a; padding: 24px 32px; }
    .logo { color: #38bdf8; font-size: 18px; font-weight: 800; }
    .body { padding: 40px 32px; }
    h1 { color: #1e293b; font-size: 22px; margin: 0 0 16px; }
    p { color: #475569; line-height: 1.7; margin: 0 0 16px; }
    .button { background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><div class="logo">⏱ {{company_name}}</div></div>
    <div class="body">
      <h1>Password Reset Request</h1>
      <p>Hello <strong>{{user_name}}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to continue. This link will expire in {{expiry_time}}.</p>
      <a class="button" href="{{reset_link}}">Reset Password →</a>
      <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">{{company_name}} | {{support_email}}</div>
  </div>
</body>
</html>`,
        category: 'security',
        is_active: true,
        updated_at: '2023-09-12T00:00:00Z',
        updated_by: 'System',
        variables: ['user_name', 'company_name', 'reset_link', 'expiry_time', 'support_email']
    },
    'new': {
        id: 'new',
        slug: '',
        name: '',
        description: '',
        subject: '',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; }
    .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: #0f172a; padding: 24px 32px; }
    .logo { color: #38bdf8; font-size: 18px; font-weight: 800; }
    .body { padding: 40px 32px; }
    h1 { color: #1e293b; font-size: 22px; margin: 0 0 16px; }
    p { color: #475569; line-height: 1.7; }
    .button { background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><div class="logo">⏱ {{company_name}}</div></div>
    <div class="body">
      <h1>Hello {{user_name}},</h1>
      <p>Your message here...</p>
      <br/>
      <a class="button" href="{{action_url}}">Call to Action</a>
    </div>
    <div class="footer">{{company_name}} | {{support_email}}</div>
  </div>
</body>
</html>`,
        category: 'system',
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: 'Admin',
        variables: ['user_name', 'company_name', 'action_url', 'support_email']
    }
}

const FALLBACK_TEMPLATE = MOCK_TEMPLATES['2']

const CATEGORY_OPTIONS = [
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'security', label: 'Security' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'leave', label: 'Leave' },
    { value: 'system', label: 'System' },
]

// Preview sample values
const PREVIEW_VALUES: Record<string, string> = {
    user_name: 'Sarah Johnson',
    user_email: 'sarah@company.com',
    company_name: 'TimeTracker',
    temp_password: 'Temp@1234',
    login_url: 'https://app.timetracker.io/login',
    reset_link: '#',
    expiry_time: '24 hours',
    support_email: 'support@timetracker.io',
    approver_name: 'Admin User',
    leave_dates: '25/12 - 28/12/2023',
    leave_type: 'Annual Leave',
    changed_at: '23/02/2026 16:30',
    login_time: '23/02/2026 16:30',
    location: 'Hồ Chí Minh, VN',
    device: 'Chrome on Windows',
    ip_address: '192.168.1.1',
    action_url: '#',
    report_date: '23/02/2026',
    on_time_count: '15',
    late_count: '3',
    absent_count: '2',
    on_leave_count: '1',
    support_url: '#',
}

function renderPreview(content: string): string {
    let html = content
    Object.entries(PREVIEW_VALUES).forEach(([key, value]) => {
        html = html.replaceAll(`{{${key}}}`, `<span style="background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:0 3px;font-size:0.9em;">${value}</span>`)
    })
    return html
}

function renderSubjectPreview(subject: string): string {
    let s = subject
    Object.entries(PREVIEW_VALUES).forEach(([key, value]) => {
        s = s.replaceAll(`{{${key}}}`, value)
    })
    return s
}

// ─── Preview Modal ───────────────────────────────────────────────────────────
interface PreviewModalProps {
    content: string
    subject: string
    onClose: () => void
}

function PreviewModal({ content, subject, onClose }: PreviewModalProps) {
    const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument
            if (doc) {
                doc.open()
                doc.write(renderPreview(content))
                doc.close()
            }
        }
    }, [content, mode])

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative flex flex-col bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                style={{ width: mode === 'desktop' ? '900px' : '420px', height: '90vh', maxWidth: '95vw', transition: 'width 0.3s ease' }}
            >
                {/* Modal Header — Row 1: title + close */}
                <div className="flex items-center justify-between px-5 pt-3.5 pb-2 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Eye className="h-4 w-4 text-cyan-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white leading-tight">Email Preview</p>
                            <p className="text-[11px] text-slate-500 truncate">
                                {renderSubjectPreview(subject) || 'No subject'}
                            </p>
                        </div>
                    </div>

                    {/* Close — always visible */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0 ml-3"
                        title="Close (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Modal Header — Row 2: device toggle centered */}
                <div className="flex items-center justify-center px-5 pb-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center bg-[#0d131a] border border-slate-700 rounded-lg p-0.5">
                        <button
                            onClick={() => setMode('desktop')}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                mode === 'desktop'
                                    ? "bg-cyan-500 text-black font-semibold shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Monitor className="h-3.5 w-3.5" />
                            Desktop
                        </button>
                        <button
                            onClick={() => setMode('mobile')}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                mode === 'mobile'
                                    ? "bg-cyan-500 text-black font-semibold shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Smartphone className="h-3.5 w-3.5" />
                            Mobile
                        </button>
                    </div>
                </div>

                {/* Preview body */}
                <div className="flex-1 overflow-auto flex justify-center bg-slate-200" style={{ padding: mode === 'desktop' ? '24px' : '16px 8px' }}>
                    <div className={cn(
                        "shadow-2xl overflow-hidden transition-all duration-300",
                        mode === 'desktop' ? "w-full max-w-3xl rounded-xl" : "w-[375px] rounded-2xl"
                    )}>
                        {/* iframe renders the HTML template directly */}
                        <iframe
                            ref={iframeRef}
                            title="Email Preview"
                            className="w-full border-0 block"
                            style={{ minHeight: '580px', height: '100%' }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>


                {/* Footer hint */}
                <div className="px-5 py-2.5 border-t border-slate-800 bg-[#0d131a] shrink-0 flex items-center justify-between">
                    <p className="text-[11px] text-slate-600">
                        Placeholder values are replaced with sample data for preview.
                    </p>
                    <p className="text-[11px] text-slate-600">Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 text-[10px] font-mono">Esc</kbd> to close</p>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
    templateId: string
}

export default function EditEmailTemplateClientPage({ templateId }: Props) {
    const router = useRouter()
    const { t } = useI18n()
    const et = t.emailTemplates.editor
    const isNew = templateId === 'new'

    const [template, setTemplate] = useState<EmailTemplate | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [testEmail, setTestEmail] = useState('')
    const [showTestInput, setShowTestInput] = useState(false)
    const [copiedVar, setCopiedVar] = useState<string | null>(null)
    const [showPreview, setShowPreview] = useState(false)

    // Form state
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState<string>('system')
    const [name, setName] = useState('')

    useEffect(() => {
        if (isNew) {
            // Use blank template for new
            const blank = MOCK_TEMPLATES['new']
            setTemplate(blank)
            setSubject(blank.subject)
            setContent(blank.content)
            setCategory(blank.category)
            setName(blank.name)
            setLoading(false)
            return
        }

        setLoading(true)
        fetch(`/api/admin/email-templates/${templateId}`)
            .then(async res => {
                if (res.status === 404) {
                    // Fallback to mock data if DB not set up yet
                    const fallback = MOCK_TEMPLATES[templateId] || { ...FALLBACK_TEMPLATE, id: templateId }
                    setTemplate(fallback)
                    setSubject(fallback.subject)
                    setContent(fallback.content)
                    setCategory(fallback.category)
                    setName(fallback.name)
                    return
                }
                if (!res.ok) throw new Error(await res.text())
                const data = await res.json()
                setTemplate(data)
                setSubject(data.subject)
                setContent(data.content)
                setCategory(data.category)
                setName(data.name)
            })
            .catch(err => {
                console.error(err)
                toast.error('Không thể tải template')
                router.push('/admin/email-templates')
            })
            .finally(() => setLoading(false))
    }, [templateId, isNew, router])

    const handleCopyVar = (v: string) => {
        navigator.clipboard.writeText(`{{${v}}}`)
        setCopiedVar(v)
        setTimeout(() => setCopiedVar(null), 1500)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên template')
            return
        }
        if (!subject.trim()) {
            toast.error('Vui lòng nhập tiêu đề email')
            return
        }

        setSaving(true)
        try {
            const url = isNew
                ? '/api/admin/email-templates'
                : `/api/admin/email-templates/${templateId}`
            const method = isNew ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: template?.slug || name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    subject,
                    content,
                    category,
                    variables: template?.variables || [],
                    description: template?.description || '',
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Lưu thất bại')
            }

            const saved = await res.json()
            setTemplate(saved)
            toast.success(et.saveSuccess)

            if (isNew) {
                router.replace(`/admin/email-templates/${saved.id}`)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleSendTest = async () => {
        if (!testEmail) {
            toast.error('Vui lòng nhập email để gửi test')
            return
        }
        if (isNew) {
            toast.error('Vui lòng lưu template trước khi gửi test')
            return
        }

        setSending(true)
        try {
            const res = await fetch(`/api/admin/email-templates/${templateId}/send-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Gửi thất bại')
            }

            setShowTestInput(false)
            setTestEmail('')
            toast.success(et.sendSuccess.replace('{{email}}', testEmail))
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSending(false)
        }
    }

    const insertFormat = (tag: string) => {
        const selection = window.getSelection()?.toString()
        if (selection) {
            setContent(prev => prev.replace(selection, `<${tag}>${selection}</${tag}>`))
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#0d131a]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                    <p className="text-slate-500 text-sm">{et.loading}</p>
                </div>
            </div>
        )
    }

    if (!template) return null

    return (
        <>
            {/* Preview Modal */}
            {showPreview && (
                <PreviewModal
                    content={content}
                    subject={subject}
                    onClose={() => setShowPreview(false)}
                />
            )}

            <div className="flex flex-col h-full bg-[#0d131a]">
                {/* ── Top Bar ── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/email-templates')}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-white">{et.title}</h1>
                            <p className="text-xs text-slate-500">{templateId === 'new' ? et.newTitle : template.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Preview Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(true)}
                            className="h-8 gap-1.5 text-xs border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            {et.preview}
                        </Button>

                        {/* Send Test */}
                        {showTestInput ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="email"
                                    placeholder={et.testEmailPlaceholder}
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                    className="h-8 w-52 bg-[#161b22] border-slate-700 text-white text-xs"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSendTest()}
                                />
                                <Button
                                    onClick={handleSendTest}
                                    disabled={sending}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-slate-700 text-slate-300 hover:text-white"
                                >
                                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                </Button>
                                <button
                                    onClick={() => setShowTestInput(false)}
                                    className="text-xs text-slate-500 hover:text-white p-1"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTestInput(true)}
                                className="h-8 gap-1.5 text-xs border-slate-700 text-slate-300 hover:text-white"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {et.sendTest}
                            </Button>
                        )}

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="h-8 gap-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {et.saveChanges}
                        </Button>
                    </div>
                </div>

                {/* ── 2-Column Layout ── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT: Variables panel */}
                    <div className="w-[200px] shrink-0 border-r border-slate-800 flex flex-col overflow-y-auto bg-[#111827]">
                        {/* Category */}
                        <div className="p-4 border-b border-slate-800">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">{et.templateInfo}</p>
                            <div>
                                <Label className="text-xs text-slate-400 mb-1.5 block">{et.categoryLabel}</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-8 text-xs bg-[#0d131a] border-slate-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#161b22] border-slate-700 text-white">
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-800">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Placeholders */}
                        <div className="p-4 flex-1">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{et.placeholders}</p>
                                <span className="text-[10px] text-cyan-400 font-medium">{et.dynamic}</span>
                            </div>

                            <div className="space-y-1.5">
                                {template.variables.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => handleCopyVar(v)}
                                        title="Click to copy"
                                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#162032] border border-cyan-500/20 hover:border-cyan-500/50 transition-all group"
                                    >
                                        <code className="text-[11px] text-cyan-400 font-mono truncate">{`{{${v}}}`}</code>
                                        {copiedVar === v ? (
                                            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                        ) : (
                                            <Copy className="h-3 w-3 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
                                {et.copyHint}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Editor area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        {/* ── Name + Subject row ── */}
                        <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-slate-800 bg-[#111827] shrink-0">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-400 shrink-0 w-[90px]">{et.nameLabel}</Label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={et.namePlaceholder}
                                    className="h-8 text-xs bg-[#0d131a] border-slate-700 text-white flex-1"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-400 shrink-0 w-[90px]">{et.subjectLabel}</Label>
                                <Input
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder={et.subjectPlaceholder}
                                    className="h-8 text-xs bg-[#0d131a] border-slate-700 text-white font-mono flex-1"
                                />
                            </div>
                        </div>

                        {/* ── Editor status bar ── */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-[#111827] shrink-0">
                            <p className="text-[11px] text-slate-500">
                                Nhấn nút <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 text-[10px]">&lt;/&gt;</kbd> trong toolbar để sửa HTML trực tiếp
                            </p>
                            <div className="flex items-center gap-1 bg-[#0d131a] rounded-lg p-0.5 border border-slate-700">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700 text-white text-[11px] font-semibold">
                                    <Eye className="h-3 w-3" />
                                    WYSIWYG
                                </span>
                                <span className="px-2 py-1 text-slate-500 text-[10px] font-mono">UTF-8</span>
                            </div>
                        </div>

                        {/* ── TinyMCE Editor ── */}
                        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                            <VisualEditor
                                onEditorChange={(newContent) => setContent(newContent)}
                                value={content}
                                tinymceScriptSrc="/tinymce/tinymce.min.js"
                                licenseKey="gpl"
                                init={{
                                    height: '100%',
                                    menubar: true,
                                    resize: false,
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                                    ],
                                    toolbar: 'undo redo | blocks | ' +
                                        'bold italic underline forecolor backcolor | alignleft aligncenter ' +
                                        'alignright alignjustify | bullist numlist outdent indent | ' +
                                        'link image table | code fullscreen | removeformat help',
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; margin: 16px; }',
                                    skin: 'oxide-dark',
                                    content_css: 'dark',
                                    branding: false,
                                    promotion: false,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

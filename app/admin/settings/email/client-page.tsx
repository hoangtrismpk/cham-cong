'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    Loader2, CheckCircle2, XCircle, ExternalLink,
    AlertTriangle, Eye, EyeOff, Mail, Send, Copy, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/i18n-context'

interface ResendConfig {
    api_key: string
    from_email: string
    from_name: string
    reply_to?: string
    is_configured: boolean
    last_tested_at?: string
    test_status?: 'success' | 'failed' | null
}

export default function ResendSettingsClientPage() {
    const { t } = useI18n()
    const rs = t.resendSettings
    const [config, setConfig] = useState<ResendConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [showKey, setShowKey] = useState(false)
    const [copied, setCopied] = useState(false)
    const [testEmailInput, setTestEmailInput] = useState('')

    const [form, setForm] = useState({
        api_key: '',
        from_email: '',
        from_name: '',
        reply_to: '',
    })

    useEffect(() => {
        fetch('/api/admin/resend-config')
            .then(async res => {
                if (!res.ok) { setLoading(false); return }
                const data = await res.json()
                if (data) {
                    setConfig(data)
                    setForm(prev => ({
                        ...prev,
                        from_email: data.from_email || '',
                        from_name: data.from_name || '',
                        reply_to: data.reply_to || '',
                        // Do NOT pre-fill api_key — show placeholder if masked
                        api_key: '',
                    }))
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        if (!form.api_key && !config?.is_configured) {
            toast.error(rs.actions.apiKeyRequired)
            return
        }
        if (form.api_key && !form.api_key.startsWith('re_')) {
            toast.error(rs.actions.apiKeyRequired)
            return
        }
        if (!form.from_email || !form.from_name) {
            toast.error(rs.actions.fieldsRequired)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/resend-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Lưu thất bại')
            }
            const { config: saved } = await res.json()
            setConfig(prev => ({ ...prev, ...saved }))
            setForm(prev => ({ ...prev, api_key: '' })) // clear key field
            toast.success(rs.actions.saveSuccess)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        if (!form.api_key && !config?.is_configured) {
            toast.error(rs.actions.configFirst)
            return
        }

        setTesting(true)
        try {
            const res = await fetch('/api/admin/resend-config/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: form.api_key || undefined,
                    from_email: form.from_email || config?.from_email,
                    from_name: form.from_name || config?.from_name,
                    reply_to: form.reply_to || config?.reply_to,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Kiểm tra thất bại')
            }
            const result = await res.json()
            setConfig(prev => prev ? { ...prev, test_status: 'success', last_tested_at: new Date().toISOString() } : null)
            toast.success(`✅ ${rs.actions.testSuccess} (ID: ${result.messageId?.slice(0, 8)}...)`)
        } catch (err: any) {
            setConfig(prev => prev ? { ...prev, test_status: 'failed' } : null)
            toast.error(err.message)
        } finally {
            setTesting(false)
        }
    }

    const handleCopyKey = () => {
        if (form.api_key) {
            navigator.clipboard.writeText(form.api_key)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shrink-0">
                    <Mail className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-bold text-white">{rs.title}</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {rs.subtitle.split('Resend')[0]}
                        <a href="https://resend.com" target="_blank" rel="noopener" className="text-cyan-400 hover:underline inline-flex items-center gap-1">Resend <ExternalLink className="h-3 w-3" /></a>
                        {rs.subtitle.split('Resend')[1]}
                    </p>
                </div>
            </div>

            {/* Connection Status */}
            {config?.is_configured && (
                <div className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border",
                    config.test_status === 'success'
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : config.test_status === 'failed'
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-yellow-500/10 border-yellow-500/30"
                )}>
                    {config.test_status === 'success'
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        : config.test_status === 'failed'
                            ? <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                            : <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
                    }
                    <div className="flex-1">
                        <p className="font-semibold text-white text-sm">
                            {config.test_status === 'success'
                                ? rs.status.connected
                                : config.test_status === 'failed'
                                    ? rs.status.failed
                                    : rs.status.notTested}
                        </p>
                        {config.last_tested_at && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                {rs.status.lastTested}: {new Date(config.last_tested_at).toLocaleString('vi-VN')}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Main Config Form */}
            <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6 space-y-6">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{rs.form.apiSectionTitle}</h2>

                {/* API Key */}
                <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                        {rs.form.apiKeyLabel} <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                type={showKey ? 'text' : 'password'}
                                placeholder={rs.form.apiKeyPlaceholder}
                                value={form.api_key}
                                onChange={e => setForm({ ...form, api_key: e.target.value })}
                                className="bg-[#0d131a] border-slate-700 text-white font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <button
                            onClick={handleCopyKey}
                            title="Copy API Key"
                            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        {rs.form.apiKeyNote}{' '}
                        <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                            resend.com/api-keys <ExternalLink className="h-3 w-3" />
                        </a>
                    </p>
                </div>

                <div className="border-t border-slate-800" />

                {/* Sender Config */}
                <h3 className="text-sm font-medium text-slate-300 mb-1.5">{rs.form.senderSectionTitle}</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300 text-sm">
                            {rs.form.fromEmailLabel} <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            type="email"
                            placeholder={rs.form.fromEmailPlaceholder}
                            value={form.from_email}
                            onChange={e => setForm({ ...form, from_email: e.target.value })}
                            className="bg-[#0d131a] border-slate-700 text-white text-sm"
                        />
                        <p className="text-[11px] text-slate-600">{rs.form.fromEmailNote}</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300 text-sm">
                            {rs.form.fromNameLabel} <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            type="text"
                            placeholder={rs.form.fromNamePlaceholder}
                            value={form.from_name}
                            onChange={e => setForm({ ...form, from_name: e.target.value })}
                            className="bg-[#0d131a] border-slate-700 text-white text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">{rs.form.replyToLabel}</Label>
                    <Input
                        type="email"
                        placeholder={rs.form.replyToPlaceholder}
                        value={form.reply_to}
                        onChange={e => setForm({ ...form, reply_to: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white text-sm"
                    />
                    <p className="text-[11px] text-slate-600">{rs.form.replyToNote}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                    <Button
                        onClick={handleTest}
                        disabled={testing || saving}
                        variant="outline"
                        className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {rs.actions.test}
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving || testing}
                        className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {rs.actions.save}
                    </Button>
                </div>
            </div>

            {/* Security Note */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                        <p className="font-semibold text-yellow-300">{rs.security.title}</p>
                        <ul className="list-disc list-inside space-y-1 text-yellow-200/70 text-xs">
                            <li>{rs.security.note1}</li>
                            <li>{rs.security.note2}</li>
                            <li>{rs.security.note3}</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Help */}
            <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span>📘</span> {rs.help.title}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                    <li>{rs.help.step1.split('resend.com')[0]}<a href="https://resend.com" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">resend.com</a>{rs.help.step1.split('resend.com')[1]}</li>
                    <li><strong className="text-slate-300">{rs.help.step2.split('→')[0].split('Domains').pop() === '' ? 'Domains' : ''}</strong>{rs.help.step2}</li>
                    <li>{rs.help.step3}</li>
                    <li>{rs.help.step4}</li>
                    <li>{rs.help.step5}</li>
                </ol>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'

interface WordPressConfig {
    id: string
    site_url: string
    username: string
    is_active: boolean
    last_tested_at: string | null
    test_status: 'success' | 'failed' | 'pending' | null
    created_at: string
}

export default function IntegrationsSettingsClientPage() {
    const { t } = useI18n()
    const [config, setConfig] = useState<WordPressConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    const [formData, setFormData] = useState({
        site_url: '',
        username: '',
        app_password: ''
    })

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/admin/wordpress/config')
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setConfig(data)
                    setFormData({
                        site_url: data.site_url,
                        username: data.username,
                        app_password: '••••••••' // Masked for security
                    })
                }
            }
        } catch (error) {
            console.error('Error loading config:', error)
            toast.error(t.adminSettings.integrations.actions.loadError)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.site_url || !formData.username || !formData.app_password) {
            toast.error(t.adminSettings.integrations.actions.validation.allFieldsRequired)
            return
        }

        if (formData.app_password === '••••••••') {
            toast.error(t.adminSettings.integrations.actions.validation.reenterPassword)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/wordpress/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(t.adminSettings.integrations.actions.saveSuccess)
                await loadConfig()
            } else {
                throw new Error(data.error || 'Failed to save')
            }
        } catch (error: any) {
            toast.error(error.message || t.adminSettings.integrations.actions.saveError)
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        if (!formData.site_url || !formData.username || !formData.app_password) {
            toast.error(t.adminSettings.integrations.actions.validation.allFieldsRequired)
            return
        }

        if (formData.app_password === '••••••••') {
            toast.error(t.adminSettings.integrations.actions.validation.reenterPasswordTest)
            return
        }

        setTesting(true)
        try {
            const res = await fetch('/api/admin/wordpress/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (data.success) {
                toast.success(t.adminSettings.integrations.actions.testSuccess.replace('{{name}}', data.user.name))
                await loadConfig()
            } else {
                toast.error(t.adminSettings.integrations.actions.testError.replace('{{error}}', data.error))
            }
        } catch (error: any) {
            toast.error(t.adminSettings.integrations.actions.validation.testError)
        } finally {
            setTesting(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm(t.adminSettings.integrations.actions.deleteConfirm)) {
            return
        }

        try {
            const res = await fetch('/api/admin/wordpress/config', {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success(t.adminSettings.integrations.actions.deleteSuccess)
                setConfig(null)
                setFormData({ site_url: '', username: '', app_password: '' })
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error) {
            toast.error(t.adminSettings.integrations.actions.deleteError)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">{t.adminSettings.integrations.title}</h1>
                <p className="text-slate-400 mt-2">
                    {t.adminSettings.integrations.description}
                </p>
            </div>

            {/* Status Card */}
            {config && (
                <div className={`border rounded-lg p-4 ${config.test_status === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : config.test_status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                    <div className="flex items-center gap-3">
                        {config.test_status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : config.test_status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium text-white">
                                {config.test_status === 'success'
                                    ? t.adminSettings.integrations.status.connected
                                    : config.test_status === 'failed'
                                        ? t.adminSettings.integrations.status.failed
                                        : t.adminSettings.integrations.status.pending}
                            </p>
                            {config.last_tested_at && (
                                <p className="text-sm text-slate-400">
                                    {t.adminSettings.integrations.status.lastTested}: {new Date(config.last_tested_at).toLocaleString('vi-VN')}
                                </p>
                            )}
                        </div>
                        <a
                            href={config.site_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            )}

            {/* Form */}
            <div className="bg-[#161b22] border border-slate-800 rounded-lg p-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="site_url" className="text-slate-300">
                        {t.adminSettings.integrations.form.siteUrl} <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="site_url"
                        type="url"
                        placeholder={t.adminSettings.integrations.form.siteUrlPlaceholder}
                        value={formData.site_url}
                        onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">
                        {t.adminSettings.integrations.form.siteUrlNote}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">
                        {t.adminSettings.integrations.form.username} <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="username"
                        type="text"
                        placeholder={t.adminSettings.integrations.form.usernamePlaceholder}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="app_password" className="text-slate-300">
                        {t.adminSettings.integrations.form.appPassword} <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="app_password"
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                        value={formData.app_password}
                        onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white font-mono"
                    />
                    <p className="text-xs text-slate-500">
                        {t.adminSettings.integrations.form.appPasswordNote}{' '}
                        <a
                            href={formData.site_url ? `${formData.site_url}/wp-admin/profile.php` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                            {t.adminSettings.integrations.form.wpProfile} <ExternalLink className="inline h-3 w-3" />
                        </a>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <Button
                        onClick={handleTest}
                        disabled={testing || !formData.site_url}
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.adminSettings.integrations.actions.test}
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.adminSettings.integrations.actions.save}
                    </Button>

                    {config && (
                        <Button
                            onClick={handleDelete}
                            variant="destructive"
                            className="ml-auto"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t.adminSettings.integrations.actions.delete}
                        </Button>
                    )}
                </div>
            </div>

            {/* Security Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200 space-y-1">
                        <p className="font-medium">{t.adminSettings.integrations.security.title}</p>
                        <ul className="list-disc list-inside space-y-1 text-yellow-200/80">
                            <li>{t.adminSettings.integrations.security.note1}</li>
                            <li>{t.adminSettings.integrations.security.note2}</li>
                            <li>{t.adminSettings.integrations.security.note3}</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-[#161b22] border border-slate-800 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">{t.adminSettings.integrations.help.title}</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-400">
                    <li>{t.adminSettings.integrations.help.step1}</li>
                    <li>{t.adminSettings.integrations.help.step2}</li>
                    <li>{t.adminSettings.integrations.help.step3}</li>
                    <li>{t.adminSettings.integrations.help.step4}</li>
                    <li>{t.adminSettings.integrations.help.step5}</li>
                </ol>
            </div>
        </div>
    )
}

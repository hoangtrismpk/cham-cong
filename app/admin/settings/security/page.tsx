'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { verifyRecaptchaConfig } from '@/app/actions/security'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RecaptchaTester } from '@/components/recaptcha-tester'
import {
    Save,
    Shield,
    KeyRound,
    Bot,
    Lock,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    RefreshCw
} from 'lucide-react'

interface SecuritySettings {
    '2fa_enabled': boolean
    recaptcha_enabled: boolean
    recaptcha_site_key: string
    recaptcha_secret_key: string
    ip_whitelist: string[]
    account_lockout_enabled: boolean
}

const defaultSettings: SecuritySettings = {
    '2fa_enabled': false,
    recaptcha_enabled: false,
    recaptcha_site_key: '',
    recaptcha_secret_key: '',
    ip_whitelist: [],
    account_lockout_enabled: true
}

export default function SecuritySettingsPage() {
    const [settings, setSettings] = useState<SecuritySettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [testError, setTestError] = useState<string | null>(null)

    // Load settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getSettings('security') as any
                setSettings({
                    '2fa_enabled': data['2fa_enabled'] || false,
                    recaptcha_enabled: data.recaptcha_enabled || false,
                    recaptcha_site_key: data.recaptcha_site_key || '',
                    recaptcha_secret_key: data.recaptcha_secret_key || '',
                    ip_whitelist: data.ip_whitelist || [],
                    account_lockout_enabled: data.account_lockout_enabled ?? true
                })
            } catch (error) {
                console.error('Failed to load settings:', error)
                toast.error('Không thể tải cấu hình bảo mật')
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    // Handle input changes
    const handleChange = (key: keyof SecuritySettings, value: boolean | string | string[]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
        setTestError(null)
    }

    // Actual Save Logic
    const proceedSave = async () => {
        setSaving(true)
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value
            }))

            await updateSettings(updates)
            toast.success('Đã lưu cấu hình bảo mật thành công!')
            setHasChanges(false)
            setTestError(null)
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Không thể lưu cấu hình. Vui lòng thử lại.')
        } finally {
            setSaving(false)
            setIsTesting(false)
        }
    }

    // Trigger Save
    const handleSave = () => {
        setSaving(true)
        setTestError(null)

        // If enabling recaptcha and it's a new config, verify first
        if (settings.recaptcha_enabled) {
            if (!settings.recaptcha_site_key || !settings.recaptcha_secret_key) {
                toast.error('Vui lòng nhập đầy đủ Site Key và Secret Key')
                setSaving(false)
                return
            }
            // Start verification flow
            setIsTesting(true)
        } else {
            proceedSave()
        }
    }

    // Callback from Tester (Client-side token received)
    const handleTestResult = async (token: string) => {
        try {
            console.log('Token received, verifying with server...')
            const result = await verifyRecaptchaConfig(settings.recaptcha_secret_key, token)

            if (result.success) {
                toast.success('Kết nối Recaptcha thành công!')
                await proceedSave()
            } else {
                setTestError(result.error || null)
                toast.error(`Xác thực thất bại: ${result.error}`)
                setSaving(false)
                setIsTesting(false)
            }
        } catch (e: any) {
            setTestError('Lỗi hệ thống khi kiểm tra Key.')
            setSaving(false)
            setIsTesting(false)
        }
    }

    const handleTestError = (err: any) => {
        setTestError('Không thể khởi tạo Google reCAPTCHA. Site Key có thể sai hoặc Domain bị chặn.')
        setIsTesting(false)
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl">
            {/* Tester Component */}
            {isTesting && (
                <RecaptchaTester
                    siteKey={settings.recaptcha_site_key}
                    onToken={handleTestResult}
                    onError={handleTestError}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bảo mật</h1>
                    <p className="text-slate-400 mt-1">
                        Cấu hình xác thực 2 yếu tố, reCAPTCHA và các chính sách bảo mật
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    {saving ? 'Đang kiểm tra...' : 'Lưu thay đổi'}
                </Button>
            </div>

            <div className="space-y-6">
                {/* reCAPTCHA Card */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-blue-400" />
                                <CardTitle className="text-white">Google reCAPTCHA v3 (Invisible)</CardTitle>
                            </div>
                            <Badge
                                variant={settings.recaptcha_enabled ? 'default' : 'secondary'}
                                className={settings.recaptcha_enabled ? 'bg-blue-500/20 text-blue-400' : ''}
                            >
                                {settings.recaptcha_enabled ? 'Đang bật' : 'Đang tắt'}
                            </Badge>
                        </div>
                        <CardDescription>
                            Tự động tàng hình trên giao diện User. Yêu cầu Key v3.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-slate-700">
                            <div className="space-y-0.5">
                                <Label className="text-base">Bật reCAPTCHA v3</Label>
                                <p className="text-sm text-slate-500">
                                    Bảo vệ Login/Register khỏi Bot.
                                </p>
                            </div>
                            <Switch
                                checked={settings.recaptcha_enabled}
                                onCheckedChange={(checked) => handleChange('recaptcha_enabled', checked)}
                            />
                        </div>

                        {settings.recaptcha_enabled && (
                            <>
                                <Separator className="bg-slate-700" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <ExternalLink className="h-4 w-4" />
                                        <a
                                            href="https://www.google.com/recaptcha/admin"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                        >
                                            Lấy key tại Google reCAPTCHA Console
                                        </a>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="recaptcha_site_key">Site Key</Label>
                                        <Input
                                            id="recaptcha_site_key"
                                            value={settings.recaptcha_site_key}
                                            onChange={(e) => handleChange('recaptcha_site_key', e.target.value)}
                                            placeholder="6Lc..."
                                            className="bg-[#0d1117] border-slate-700 font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="recaptcha_secret_key">Secret Key</Label>
                                        <Input
                                            id="recaptcha_secret_key"
                                            type="password"
                                            value={settings.recaptcha_secret_key}
                                            onChange={(e) => handleChange('recaptcha_secret_key', e.target.value)}
                                            placeholder="••••••••••••••••"
                                            className="bg-[#0d1117] border-slate-700 font-mono text-sm"
                                        />
                                    </div>

                                    {/* Error & Overide Option */}
                                    {testError && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-red-300 font-medium">Lỗi xác thực: {testError}</p>
                                                    <p className="text-xs text-red-400/80 mt-1">
                                                        Lỗi này có thể do bạn đang dùng Ngrok hoặc Domain chưa Whitelist trên Google.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pl-8">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 text-xs bg-slate-800 hover:bg-slate-700"
                                                    onClick={handleSave}
                                                >
                                                    <RefreshCw className="mr-1 h-3 w-3" /> Thử lại
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 text-xs bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/40"
                                                    onClick={proceedSave}
                                                >
                                                    Tôi chắc chắn Key đúng, vẫn lưu
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Other Security Cards (2FA, Lockout) */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-green-400" />
                                <CardTitle className="text-white">Xác thực 2 yếu tố (2FA)</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-slate-700">
                            <div className="space-y-0.5">
                                <Label className="text-base">Bật xác thực 2 yếu tố</Label>
                                <p className="text-sm text-slate-500">Yêu cầu OTP khi đăng nhập Admin.</p>
                            </div>
                            <Switch
                                checked={settings['2fa_enabled']}
                                onCheckedChange={(checked) => handleChange('2fa_enabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-orange-400" />
                            <CardTitle className="text-white">Bảo mật nâng cao</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-slate-700">
                            <div className="space-y-0.5">
                                <Label className="text-base">Khóa tài khoản</Label>
                                <p className="text-sm text-slate-500">Tự động khóa sau 5 lần sai.</p>
                            </div>
                            <Switch
                                checked={settings.account_lockout_enabled}
                                onCheckedChange={(checked) => handleChange('account_lockout_enabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

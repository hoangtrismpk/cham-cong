'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react'

interface WordPressConfig {
    id: string
    site_url: string
    username: string
    is_active: boolean
    last_tested_at: string | null
    test_status: 'success' | 'failed' | 'pending' | null
    created_at: string
}

export default function IntegrationsSettingsPage() {
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
            toast.error('Không thể tải cấu hình')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.site_url || !formData.username || !formData.app_password) {
            toast.error('Vui lòng điền đầy đủ thông tin')
            return
        }

        if (formData.app_password === '••••••••') {
            toast.error('Vui lòng nhập lại Application Password')
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
                toast.success('Lưu cấu hình thành công!')
                await loadConfig()
            } else {
                throw new Error(data.error || 'Failed to save')
            }
        } catch (error: any) {
            toast.error(error.message || 'Lưu cấu hình thất bại')
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        if (!formData.site_url || !formData.username || !formData.app_password) {
            toast.error('Vui lòng điền đầy đủ thông tin trước khi test')
            return
        }

        if (formData.app_password === '••••••••') {
            toast.error('Vui lòng nhập lại Application Password để test')
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
                toast.success(`✅ Kết nối thành công! User: ${data.user.name}`)
                await loadConfig()
            } else {
                toast.error(`❌ Kết nối thất bại: ${data.error}`)
            }
        } catch (error: any) {
            toast.error('Không thể kiểm tra kết nối')
        } finally {
            setTesting(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('⚠️ Bạn có chắc muốn xóa cấu hình WordPress?\n\nSau khi xóa, tính năng upload file sẽ không hoạt động.')) {
            return
        }

        try {
            const res = await fetch('/api/admin/wordpress/config', {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Đã xóa cấu hình WordPress')
                setConfig(null)
                setFormData({ site_url: '', username: '', app_password: '' })
            } else {
                throw new Error('Failed to delete')
            }
        } catch (error) {
            toast.error('Xóa cấu hình thất bại')
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
                <h1 className="text-2xl font-bold text-white">Tích hợp WordPress</h1>
                <p className="text-slate-400 mt-2">
                    Kết nối với WordPress để upload file lên Media Library
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
                                    ? '✅ Đã kết nối'
                                    : config.test_status === 'failed'
                                        ? '❌ Kết nối thất bại'
                                        : '⏳ Chưa kiểm tra'}
                            </p>
                            {config.last_tested_at && (
                                <p className="text-sm text-slate-400">
                                    Kiểm tra lần cuối: {new Date(config.last_tested_at).toLocaleString('vi-VN')}
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
                        WordPress Site URL <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="site_url"
                        type="url"
                        placeholder="https://yoursite.com"
                        value={formData.site_url}
                        onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">
                        URL đầy đủ của WordPress site (không có dấu / ở cuối)
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">
                        Username <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="username"
                        type="text"
                        placeholder="admin"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="bg-[#0d131a] border-slate-700 text-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="app_password" className="text-slate-300">
                        Application Password <span className="text-red-400">*</span>
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
                        Tạo Application Password tại:{' '}
                        <a
                            href={formData.site_url ? `${formData.site_url}/wp-admin/profile.php` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                            WordPress Profile <ExternalLink className="inline h-3 w-3" />
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
                        Kiểm tra kết nối
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu cấu hình
                    </Button>

                    {config && (
                        <Button
                            onClick={handleDelete}
                            variant="destructive"
                            className="ml-auto"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa cấu hình
                        </Button>
                    )}
                </div>
            </div>

            {/* Security Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200 space-y-1">
                        <p className="font-medium">⚠️ Lưu ý bảo mật:</p>
                        <ul className="list-disc list-inside space-y-1 text-yellow-200/80">
                            <li>Application Password được lưu trong database (nên mã hóa trong production)</li>
                            <li>Chỉ Admin mới có quyền cấu hình</li>
                            <li>Không chia sẻ Application Password với người khác</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-[#161b22] border border-slate-800 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">📚 Hướng dẫn tạo Application Password</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-400">
                    <li>Đăng nhập vào WordPress Admin</li>
                    <li>Vào <strong className="text-slate-300">Users → Profile</strong></li>
                    <li>Cuộn xuống phần <strong className="text-slate-300">Application Passwords</strong></li>
                    <li>Nhập tên (ví dụ: "Cham Cong App") và click <strong className="text-slate-300">Add New Application Password</strong></li>
                    <li>Copy password được tạo ra và paste vào form trên</li>
                </ol>
            </div>
        </div>
    )
}

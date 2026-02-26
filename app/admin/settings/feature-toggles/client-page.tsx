'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/app/actions/settings'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Send, Users, UserPlus, X, Check } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'
import { usePermissions } from '@/contexts/permission-context'
import { cn } from '@/lib/utils'

interface FeatureSettings {
    reports_require_direct_manager: boolean
    reports_default_recipients: string[]
}

interface UserProfile {
    id: string
    full_name: string
    role_display: string
    avatar_url: string | null
    job_title?: string
}

export default function FeatureTogglesSettingsClientPage() {
    const { t } = useI18n()
    const { can } = usePermissions()
    const canManage = can('settings_feature_toggles.manage')
    const [settings, setSettings] = useState<FeatureSettings>({
        reports_require_direct_manager: true,
        reports_default_recipients: []
    })
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Load settings and users
    useEffect(() => {
        async function loadData() {
            try {
                const supabase = createClient()

                // Fetch Settings
                const data = await getSettings('reports') as any
                setSettings({
                    reports_require_direct_manager: data.reports_require_direct_manager ?? true,
                    reports_default_recipients: data.reports_default_recipients || []
                })

                // Fetch Users to pick from
                const { data: profilesData, error } = await supabase
                    .from('profiles')
                    .select(`
                        id, 
                        full_name, 
                        avatar_url,
                        job_title,
                        roles (
                            display_name
                        )
                    `)
                    .not('role_id', 'is', null)
                    .order('full_name')

                if (error) throw error

                if (profilesData) {
                    setUsers(profilesData.map((p: any) => ({
                        id: p.id,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                        role_display: p.roles?.display_name || 'N/A',
                        job_title: p.job_title
                    })))
                }

            } catch (error) {
                console.error('Failed to load settings:', error)
                toast.error('Không thể tải cấu hình tính năng.')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const handleChange = (key: keyof FeatureSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const toggleRecipient = (userId: string) => {
        if (!canManage) return;
        setSettings(prev => {
            const current = prev.reports_default_recipients
            const updated = current.includes(userId)
                ? current.filter(id => id !== userId)
                : [...current, userId]
            setHasChanges(true)
            return { ...prev, reports_default_recipients: updated }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value
            }))

            await updateSettings(updates)
            toast.success('Lưu cấu hình thành công!')
            setHasChanges(false)
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Lưu cấu hình thất bại.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        )
    }

    const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-bold text-white">Quản lý tính năng</h1>
                    <p className="text-slate-400 leading-relaxed">
                        Cấu hình và bật/tắt các tính năng hệ thống như gửi thông báo, báo cáo...
                    </p>
                </div>
                {canManage && (
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/20"
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {/* Reports Card */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Send className="h-5 w-5 text-cyan-400" />
                                <CardTitle className="text-white">Báo cáo công việc</CardTitle>
                            </div>
                        </div>
                        <CardDescription>
                            Cấu hình luồng phân phối báo cáo cho nhân viên.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Direct Manager Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[#0d131a] rounded-lg border border-slate-700">
                            <div className="space-y-1.5 max-w-[70%]">
                                <Label className="text-base text-slate-200">Báo cáo cho Quản lý trực tiếp</Label>
                                <p className="text-sm text-slate-500">
                                    Mỗi nhân viên sẽ bắt buộc gửi báo cáo cho quản lý trực tiếp của họ (Cấu hình trên hồ sơ). Người dùng không thể gỡ chọn.
                                </p>
                            </div>
                            <Switch
                                disabled={!canManage}
                                checked={settings.reports_require_direct_manager}
                                onCheckedChange={(checked) => handleChange('reports_require_direct_manager', checked)}
                                className="data-[state=checked]:bg-cyan-500"
                            />
                        </div>

                        <Separator className="bg-slate-700" />

                        {/* Global Observers Multi-select */}
                        <div className="space-y-4">
                            <div className="space-y-1.5 max-w-[70%]">
                                <Label className="text-base text-slate-200 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-cyan-400" />
                                    Danh sách Người nhận báo cáo mặc định
                                </Label>
                                <p className="text-sm text-slate-500">
                                    Đây là những "Global Observers" (VD: Chuyên viên Nhân sự, Sếp Tổng). Báo cáo của <span className="text-cyan-400">bất kỳ ai</span> trong công ty đều sẽ tự động gửi cho những người trong danh sách này. Họ sẽ bị khoá cứng và không thể gỡ chọn.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="p-4 bg-[#0d131a] border border-slate-700 rounded-xl space-y-4">
                                    {/* Selected Chips */}
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {settings.reports_default_recipients.length === 0 ? (
                                            <p className="text-sm text-slate-500 flex items-center h-10 italic">
                                                Chưa chọn người nhận mặc định nào.
                                            </p>
                                        ) : (
                                            settings.reports_default_recipients.map(id => {
                                                const u = users.find(x => x.id === id)
                                                if (!u) return null;
                                                return (
                                                    <div key={u.id} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 animate-in fade-in zoom-in duration-200">
                                                        <div className="h-5 w-5 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                                            {u.avatar_url ? (
                                                                <img src={u.avatar_url} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-[10px] text-white">
                                                                    {u.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm text-white font-medium">{u.full_name}</span>
                                                        <button
                                                            disabled={!canManage}
                                                            onClick={() => toggleRecipient(u.id)}
                                                            className={cn("text-slate-400 transition-colors bg-slate-700/50 rounded-full p-0.5 ml-1", canManage && "hover:text-red-400 hover:bg-slate-700")}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Search Input for picking users */}
                                    <div className="pt-2 border-t border-slate-800">
                                        <input
                                            placeholder="Tìm kiếm nhân viên để thêm..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#161b22] border border-slate-800 rounded-lg p-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium"
                                        />

                                        {/* Dropdown-like list */}
                                        <div className="mt-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {filteredUsers.map(user => {
                                                const isSelected = settings.reports_default_recipients.includes(user.id);
                                                return (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => canManage && toggleRecipient(user.id)}
                                                        className={cn(
                                                            "relative flex items-center gap-3 p-2.5 rounded-xl transition-all border duration-300",
                                                            canManage && "cursor-pointer hover:border-slate-700 hover:bg-slate-800/30",
                                                            isSelected
                                                                ? "bg-cyan-500/10 border-cyan-500/30"
                                                                : "bg-[#161b22] border-slate-800"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg overflow-hidden border shrink-0 transition-all",
                                                            isSelected ? "border-cyan-500/50" : "border-slate-800"
                                                        )}>
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-300 text-xs font-black">
                                                                    {user.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-6">
                                                            <p className={cn(
                                                                "text-sm font-semibold truncate transition-colors",
                                                                isSelected ? "text-cyan-400" : "text-white"
                                                            )}>
                                                                {user.full_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                                                                {user.job_title || user.role_display}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute right-3">
                                                                <Check className="h-4 w-4 text-cyan-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

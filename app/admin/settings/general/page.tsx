'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getSettings, updateSettings, getDetectedIp } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Save,
    Building2,
    Clock,
    MapPin,
    Wifi,
    Loader2,
    Activity
} from 'lucide-react'

interface GeneralSettings {
    company_name: string
    company_website: string
    company_address: string
    company_logo_url: string
    timezone: string
    date_format: string
    work_start_time: string
    work_end_time: string
    lunch_start_time: string
    lunch_end_time: string
    office_latitude: string
    office_longitude: string
    max_distance_meters: number
    company_wifi_ip: string
    require_gps_and_wifi: boolean
    work_off_days: number[]
}

const defaultSettings: GeneralSettings = {
    company_name: '',
    company_website: '',
    company_address: '',
    company_logo_url: '',
    timezone: 'Asia/Ho_Chi_Minh',
    date_format: 'DD/MM/YYYY',
    work_start_time: '08:00',
    work_end_time: '17:30',
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
    office_latitude: '',
    office_longitude: '',
    max_distance_meters: 100,
    company_wifi_ip: '14.161.22.181',
    require_gps_and_wifi: false,
    work_off_days: [6, 0] // Default: Sat, Sun
}

export default function GeneralSettingsPage() {
    const [settings, setSettings] = useState<GeneralSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [detectingIp, setDetectingIp] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Load settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getSettings('general')
                setSettings({
                    company_name: (data.company_name as string) || '',
                    company_website: (data.company_website as string) || '',
                    company_address: (data.company_address as string) || '',
                    company_logo_url: (data.company_logo_url as string) || '',
                    timezone: (data.timezone as string) || 'Asia/Ho_Chi_Minh',
                    date_format: (data.date_format as string) || 'DD/MM/YYYY',
                    work_start_time: (data.work_start_time as string) || '08:00',
                    work_end_time: (data.work_end_time as string) || '17:30',
                    lunch_start_time: (data.lunch_start_time as string) || '12:00',
                    lunch_end_time: (data.lunch_end_time as string) || '13:00',
                    office_latitude: (data.office_latitude as string) || '',
                    office_longitude: (data.office_longitude as string) || '',
                    max_distance_meters: (data.max_distance_meters as number) || 100,
                    company_wifi_ip: (data.company_wifi_ip as string) || '14.161.22.181',
                    require_gps_and_wifi: (data.require_gps_and_wifi as boolean) || false,
                    work_off_days: (data.work_off_days as number[]) || [6, 0]
                })
            } catch (error) {
                console.error('Failed to load settings:', error)
                toast.error('Không thể tải cấu hình')
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    // Handle input changes
    const handleChange = (key: keyof GeneralSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const handleDetectIp = async () => {
        setDetectingIp(true)
        try {
            const ip = await getDetectedIp()
            if (ip && ip !== 'unknown') {
                handleChange('company_wifi_ip', ip)
                toast.success(`Đã nhận diện IP của bạn: ${ip}`)
            } else {
                toast.error('Không thể tự động nhận diện IP.')
            }
        } catch (error) {
            toast.error('Lỗi khi nhận diện IP.')
        } finally {
            setDetectingIp(false)
        }
    }

    // Save settings
    const handleSave = async () => {
        setSaving(true)
        try {
            // Nếu IP trống thì điền lại IP mặc định
            const currentSettings = { ...settings }
            if (!currentSettings.company_wifi_ip.trim()) {
                currentSettings.company_wifi_ip = '14.161.22.181'
                setSettings(currentSettings)
            }

            const updates = Object.entries(currentSettings).map(([key, value]) => ({
                key,
                value
            }))

            await updateSettings(updates)
            toast.success('Đã lưu cấu hình thành công!')
            setHasChanges(false)
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Không thể lưu cấu hình. Vui lòng thử lại.')
        } finally {
            setSaving(false)
        }
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
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Cấu hình chung</h1>
                    <p className="text-slate-400 mt-1">
                        Quản lý thông tin công ty, giờ làm việc và quy định chấm công
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Company Information */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            <CardTitle className="text-white">Thông tin công ty</CardTitle>
                        </div>
                        <CardDescription>
                            Cài đặt tên công ty, địa chỉ và thông tin liên hệ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company_name">Tên công ty</Label>
                                <Input
                                    id="company_name"
                                    value={settings.company_name}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    placeholder="VD: FHB Vietnam"
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_website">Website</Label>
                                <Input
                                    id="company_website"
                                    value={settings.company_website}
                                    onChange={(e) => handleChange('company_website', e.target.value)}
                                    placeholder="https://example.com"
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_address">Địa chỉ văn phòng</Label>
                            <Textarea
                                id="company_address"
                                value={settings.company_address}
                                onChange={(e) => handleChange('company_address', e.target.value)}
                                placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                                className="bg-[#0d1117] border-slate-700 min-h-[80px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Working Hours */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-green-400" />
                            <CardTitle className="text-white">Giờ làm việc</CardTitle>
                        </div>
                        <CardDescription>
                            Cấu hình thời gian làm việc và nghỉ trưa
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="work_start_time">Giờ bắt đầu</Label>
                                <Input
                                    id="work_start_time"
                                    type="time"
                                    value={settings.work_start_time}
                                    onChange={(e) => handleChange('work_start_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="work_end_time">Giờ kết thúc</Label>
                                <Input
                                    id="work_end_time"
                                    type="time"
                                    value={settings.work_end_time}
                                    onChange={(e) => handleChange('work_end_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lunch_start_time">Nghỉ trưa từ</Label>
                                <Input
                                    id="lunch_start_time"
                                    type="time"
                                    value={settings.lunch_start_time}
                                    onChange={(e) => handleChange('lunch_start_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lunch_end_time">Nghỉ trưa đến</Label>
                                <Input
                                    id="lunch_end_time"
                                    type="time"
                                    value={settings.lunch_end_time}
                                    onChange={(e) => handleChange('lunch_end_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Office Location */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-red-400" />
                            <CardTitle className="text-white">Vị trí văn phòng</CardTitle>
                        </div>
                        <CardDescription>
                            Toạ độ GPS và khoảng cách tối đa cho phép chấm công
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="office_latitude">Vĩ độ (Latitude)</Label>
                                <Input
                                    id="office_latitude"
                                    type="text"
                                    value={settings.office_latitude}
                                    onChange={(e) => handleChange('office_latitude', e.target.value)}
                                    placeholder="VD: 10.762622"
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="office_longitude">Kinh độ (Longitude)</Label>
                                <Input
                                    id="office_longitude"
                                    type="text"
                                    value={settings.office_longitude}
                                    onChange={(e) => handleChange('office_longitude', e.target.value)}
                                    placeholder="VD: 106.660172"
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Khoảng cách tối đa cho phép</Label>
                                <span className="text-blue-400 font-medium">
                                    {settings.max_distance_meters} mét
                                </span>
                            </div>
                            <Slider
                                value={[settings.max_distance_meters]}
                                onValueChange={(value) => handleChange('max_distance_meters', value[0])}
                                max={500}
                                min={10}
                                step={10}
                                className="w-full"
                            />
                            <p className="text-xs text-slate-500">
                                Nhân viên phải ở trong bán kính này mới được phép chấm công
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Wifi & Rules */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-purple-400" />
                            <CardTitle className="text-white">Wifi & Quy tắc</CardTitle>
                        </div>
                        <CardDescription>
                            Cấu hình IP Wifi công ty và quy tắc xác thực chấm công
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_wifi_ip">Địa chỉ IP Wifi công ty</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="company_wifi_ip"
                                    value={settings.company_wifi_ip}
                                    onChange={(e) => handleChange('company_wifi_ip', e.target.value)}
                                    placeholder="VD: 14.161.22.181"
                                    className="bg-[#0d1117] border-slate-700 font-mono"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDetectIp}
                                    disabled={detectingIp}
                                    className="bg-slate-800 hover:bg-slate-700 text-xs shrink-0"
                                >
                                    {detectingIp ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Activity className="h-3 w-3 mr-1" />
                                    )}
                                    Tự điền IP
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Nhập các IP cách nhau bởi dấu phẩy. Mặc định là `14.161.22.181`.
                            </p>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Bắt buộc cả GPS và Wifi</Label>
                                <p className="text-xs text-slate-500">
                                    Khi bật, nhân viên phải thỏa mãn cả hai điều kiện mới được chấm công
                                </p>
                            </div>
                            <Switch
                                checked={settings.require_gps_and_wifi}
                                onCheckedChange={(checked) => handleChange('require_gps_and_wifi', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Off Days */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-amber-400" />
                            <CardTitle className="text-white">Ngày nghỉ định kỳ</CardTitle>
                        </div>
                        <CardDescription>
                            Chọn các ngày nghỉ cố định trong tuần. Những ngày này sẽ được hiển thị nhạt hơn trên biểu đồ thống kê của nhân viên.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Thứ 2', value: 1 },
                                { label: 'Thứ 3', value: 2 },
                                { label: 'Thứ 4', value: 3 },
                                { label: 'Thứ 5', value: 4 },
                                { label: 'Thứ 6', value: 5 },
                                { label: 'Thứ 7', value: 6 },
                                { label: 'Chủ Nhật', value: 0 },
                            ].map((day) => (
                                <div key={day.value} className="flex items-center space-x-2">
                                    <Switch
                                        id={`day-${day.value}`}
                                        checked={settings.work_off_days.includes(day.value)}
                                        onCheckedChange={(checked) => {
                                            const newOffDays = checked
                                                ? [...settings.work_off_days, day.value]
                                                : settings.work_off_days.filter(d => d !== day.value)
                                            handleChange('work_off_days', newOffDays)
                                        }}
                                    />
                                    <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                                        {day.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Sticky Save Button */}
                <div className="sticky bottom-6 z-10 flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={`shadow-2xl shadow-primary/30 px-8 py-4 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 transition-all ${(!hasChanges || saving) ? 'opacity-50 cursor-not-allowed scale-95' : 'cursor-pointer hover:-translate-y-1 active:scale-95'}`}
                    >
                        {saving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                </div>
            </div>
        </div>
    )
}

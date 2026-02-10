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
import { useI18n } from '@/contexts/i18n-context'

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

export default function GeneralSettingsClientPage() {
    const { t } = useI18n()
    const [settings, setSettings] = useState<GeneralSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isDetectingIp, setIsDetectingIp] = useState(false)
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
                toast.error(t.adminSettings.generalSettings.actions.loadError)
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
        setIsDetectingIp(true)
        try {
            const ip = await getDetectedIp()
            if (ip && ip !== 'unknown') {
                handleChange('company_wifi_ip', ip)
                toast.success(`${t.adminSettings.generalSettings.wifiRules.autoDetect}: ${ip}`)
            } else {
                toast.error(t.adminSettings.generalSettings.wifiRules.ipPlaceholder)
            }
        } catch (error) {
            toast.error(t.adminSettings.generalSettings.actions.loadError)
        } finally {
            setIsDetectingIp(false)
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
            toast.success(t.adminSettings.generalSettings.actions.saveSuccess)
            setHasChanges(false)
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error(t.adminSettings.generalSettings.actions.saveError)
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
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider">{t.adminSettings.generalSettings.title}</h1>
                    <p className="text-slate-400 mt-1">
                        {t.adminSettings.generalSettings.description}
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Company Information */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            <CardTitle className="text-white">{t.adminSettings.generalSettings.company.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.adminSettings.generalSettings.company.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company_name">{t.adminSettings.generalSettings.company.name}</Label>
                                <Input
                                    id="company_name"
                                    value={settings.company_name}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    placeholder={t.adminSettings.generalSettings.company.namePlaceholder}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_website">{t.adminSettings.generalSettings.company.website}</Label>
                                <Input
                                    id="company_website"
                                    value={settings.company_website}
                                    onChange={(e) => handleChange('company_website', e.target.value)}
                                    placeholder={t.adminSettings.generalSettings.company.websitePlaceholder}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_address">{t.adminSettings.generalSettings.company.address}</Label>
                            <Textarea
                                id="company_address"
                                value={settings.company_address}
                                onChange={(e) => handleChange('company_address', e.target.value)}
                                placeholder={t.adminSettings.generalSettings.company.addressPlaceholder}
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
                            <CardTitle className="text-white">{t.adminSettings.generalSettings.workingHours.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.adminSettings.generalSettings.workingHours.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="work_start_time">{t.adminSettings.generalSettings.workingHours.startTime}</Label>
                                <Input
                                    id="work_start_time"
                                    type="time"
                                    value={settings.work_start_time}
                                    onChange={(e) => handleChange('work_start_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="work_end_time">{t.adminSettings.generalSettings.workingHours.endTime}</Label>
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
                                <Label htmlFor="lunch_start_time">{t.adminSettings.generalSettings.workingHours.lunchStart}</Label>
                                <Input
                                    id="lunch_start_time"
                                    type="time"
                                    value={settings.lunch_start_time}
                                    onChange={(e) => handleChange('lunch_start_time', e.target.value)}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lunch_end_time">{t.adminSettings.generalSettings.workingHours.lunchEnd}</Label>
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
                            <CardTitle className="text-white">{t.adminSettings.generalSettings.officeLocation.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.adminSettings.generalSettings.officeLocation.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="office_latitude">{t.adminSettings.generalSettings.officeLocation.latitude}</Label>
                                <Input
                                    id="office_latitude"
                                    type="text"
                                    value={settings.office_latitude}
                                    onChange={(e) => handleChange('office_latitude', e.target.value)}
                                    placeholder={t.adminSettings.generalSettings.officeLocation.latitudePlaceholder}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="office_longitude">{t.adminSettings.generalSettings.officeLocation.longitude}</Label>
                                <Input
                                    id="office_longitude"
                                    type="text"
                                    value={settings.office_longitude}
                                    onChange={(e) => handleChange('office_longitude', e.target.value)}
                                    placeholder={t.adminSettings.generalSettings.officeLocation.longitudePlaceholder}
                                    className="bg-[#0d1117] border-slate-700"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>{t.adminSettings.generalSettings.officeLocation.maxDistance}</Label>
                                <span className="text-blue-400 font-medium">
                                    {settings.max_distance_meters} {t.adminSettings.generalSettings.officeLocation.meters}
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
                                {t.adminSettings.generalSettings.officeLocation.distanceNote}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Wifi & Rules */}
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-purple-400" />
                            <CardTitle className="text-white">{t.adminSettings.generalSettings.wifiRules.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.adminSettings.generalSettings.wifiRules.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_wifi_ip">{t.adminSettings.generalSettings.wifiRules.companyWifiIp}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="company_wifi_ip"
                                    value={settings.company_wifi_ip}
                                    onChange={(e) => handleChange('company_wifi_ip', e.target.value)}
                                    placeholder={t.adminSettings.generalSettings.wifiRules.ipPlaceholder}
                                    className="bg-[#0d1117] border-slate-700 font-mono"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDetectIp}
                                    disabled={isDetectingIp}
                                    className="bg-slate-800 hover:bg-slate-700 text-xs shrink-0"
                                >
                                    {isDetectingIp ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Activity className="h-3 w-3 mr-1" />
                                    )}
                                    {t.adminSettings.generalSettings.wifiRules.autoDetect}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                {t.adminSettings.generalSettings.wifiRules.ipNote}
                            </p>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t.adminSettings.generalSettings.wifiRules.requireBoth}</Label>
                                <p className="text-xs text-slate-500">
                                    {t.adminSettings.generalSettings.wifiRules.requireBothNote}
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
                            <CardTitle className="text-white">{t.adminSettings.generalSettings.offDays.title}</CardTitle>
                        </div>
                        <CardDescription>
                            {t.adminSettings.generalSettings.offDays.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: t.adminSettings.generalSettings.offDays.monday, value: 1 },
                                { label: t.adminSettings.generalSettings.offDays.tuesday, value: 2 },
                                { label: t.adminSettings.generalSettings.offDays.wednesday, value: 3 },
                                { label: t.adminSettings.generalSettings.offDays.thursday, value: 4 },
                                { label: t.adminSettings.generalSettings.offDays.friday, value: 5 },
                                { label: t.adminSettings.generalSettings.offDays.saturday, value: 6 },
                                { label: t.adminSettings.generalSettings.offDays.sunday, value: 0 },
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
                        {saving ? t.adminSettings.generalSettings.actions.saving : t.adminSettings.generalSettings.actions.save}
                    </button>
                </div>
            </div>
        </div>
    )
}

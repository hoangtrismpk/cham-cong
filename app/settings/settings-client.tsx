'use client'

import { useState, useRef, useEffect } from 'react'
import { Switch } from "@/components/ui/switch"
import { useI18n } from '@/contexts/i18n-context'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AVAILABLE_AVATARS, getDefaultAvatar } from '@/utils/avatar'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import {
    getAutoCheckInSetting,
    updateAutoCheckInSetting,
    getAutoCheckOutSetting,
    updateAutoCheckOutSetting,
    getPushNotificationSetting,
    updatePushNotificationSetting,
    getClockSettings,
    updateClockInSettings,
    updateClockOutSettings,
    getMyProfile,
    updateMyProfile,
    updateMyAvatar
} from '@/app/actions/profile'
// Firebase import removed to prevent main-thread blocking, dynamically imported on toggle
import { useSidebar } from '@/contexts/sidebar-context'
import { Badge } from '@/components/ui/badge'
import { MobileHeader } from '@/components/mobile-header'
import dynamic from 'next/dynamic'
const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false })
import { enrollMFA, challengeMFA, verifyMFA, unenrollMFA, getMFAFactors } from '@/app/actions/mfa'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { notifyPasswordChanged } from '@/app/actions/email-triggers'

interface SettingsClientProps {
    user: any
    initialData?: {
        profile: any
        mfaFactors: any[]
    }
}

export function SettingsClient({ user, initialData }: SettingsClientProps) {
    const { t, locale, setLocale } = useI18n()
    const { setIsOpen } = useSidebar()
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'preferences'>('general')
    const [activeTabMobile, setActiveTabMobile] = useState<string>('none')

    // Initialize properties directly from server-fetched initialData
    const [pushEnabled, setPushEnabled] = useState(false)
    const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(initialData?.profile?.auto_checkin_enabled || false)
    const [autoCheckOutSetting, setAutoCheckOutSetting] = useState(initialData?.profile?.auto_checkout_enabled || false)
    const [clockInMinutes, setClockInMinutes] = useState(initialData?.profile?.clock_in_remind_minutes ?? 5)
    const [clockOutMode, setClockOutMode] = useState<'before' | 'after'>(initialData?.profile?.clock_out_remind_mode ?? 'before')
    const [clockOutMinutes, setClockOutMinutes] = useState(initialData?.profile?.clock_out_remind_minutes ?? 5)

    const clockInSaveTimer = useRef<NodeJS.Timeout | null>(null)
    const clockOutSaveTimer = useRef<NodeJS.Timeout | null>(null)
    const [currentAvatar, setCurrentAvatar] = useState(initialData?.profile?.avatar_url || user?.user_metadata?.avatar_url || getDefaultAvatar(user?.id))
    const [isAvatarOpen, setIsAvatarOpen] = useState(false)

    const [profile, setProfile] = useState<any>(initialData?.profile || null)
    const [skillsInput, setSkillsInput] = useState(initialData?.profile?.skills?.join(', ') || '')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // MFA State
    const verifiedFactor = initialData?.mfaFactors?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified')
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(verifiedFactor ? verifiedFactor.id : null)

    const [isMfaModalOpen, setIsMfaModalOpen] = useState(false)
    const [mfaEnrollData, setMfaEnrollData] = useState<any>(null)
    const [mfaCode, setMfaCode] = useState('')
    const [verifyLoading, setVerifyLoading] = useState(false)

    // Refs for scrolling
    const generalRef = useRef<HTMLElement>(null)
    const securityRef = useRef<HTMLElement>(null)
    const notificationsRef = useRef<HTMLElement>(null)
    const preferencesRef = useRef<HTMLElement>(null)
    const isScrollingProgrammatically = useRef(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Remove the Skeleton loading state since data is ready instantly
    const [isLoadingData, setIsLoadingData] = useState(false)

    useEffect(() => {
        // Only run client side validations that require browser APIs
        const pushEnabledServer = initialData?.profile?.push_enabled ?? true
        if (pushEnabledServer && 'Notification' in window && Notification.permission === 'granted') {
            setPushEnabled(true)
        } else {
            setPushEnabled(false)
        }
    }, [initialData])

    // --- SCROLL SPY LOGIC (ELEMENT FROM POINT) ---
    // This is the most robust method: what element is physically under the "reading point"?
    useEffect(() => {
        const handleScroll = () => {
            if (isScrollingProgrammatically.current || !scrollContainerRef.current) return

            const container = scrollContainerRef.current
            const { scrollTop, scrollHeight, clientHeight } = container

            // 1. Force Bottom
            if (scrollHeight - scrollTop <= clientHeight + 20) {
                setActiveTab('preferences')
                return
            }

            // 2. Force Top
            if (scrollTop < 50) {
                setActiveTab('general')
                return
            }

            // 3. "Laser Beam" Logic
            // We shoot a laser beam at the screen coordinates (center-ish)
            // and see which section it hits.
            // Since the container is what scrolls, we use coordinates relative to the viewport.

            // The container's bounding box tells us where it is on the screen
            const containerRect = container.getBoundingClientRect()

            // Target point: Horizontal Center of container, Vertical 30% down from container top
            const x = containerRect.left + (containerRect.width / 2)
            const y = containerRect.top + (containerRect.height * 0.35) // 35% down seems like a good reading spot

            const elementUnderLaser = document.elementFromPoint(x, y)

            if (elementUnderLaser) {
                // Traverse up to find the section with data-section attribute
                const section = elementUnderLaser.closest('[data-section]')
                if (section) {
                    const sectionId = section.getAttribute('data-section')
                    if (sectionId && sectionId !== activeTab) {
                        setActiveTab(sectionId as any)
                    }
                }
            }
        }

        const container = scrollContainerRef.current
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true })
            handleScroll() // Initial check
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll)
            }
        }
    }, [activeTab, profile])




    const scrollToSection = (section: 'general' | 'security' | 'notifications' | 'preferences') => {
        setActiveTab(section)
        isScrollingProgrammatically.current = true
        const refs = { general: generalRef, security: securityRef, notifications: notificationsRef, preferences: preferencesRef }

        const container = scrollContainerRef.current
        const element = refs[section]?.current

        if (container && element) {
            const topOffset = element.offsetTop - 30
            container.scrollTo({
                top: topOffset,
                behavior: 'smooth'
            })
        }
        setTimeout(() => { isScrollingProgrammatically.current = false }, 800)
    }

    const handleSave = async () => {
        if (password) {
            if (password.length < 6) { return toast.error(t.settings?.messages?.passwordLength || 'Mật khẩu phải có ít nhất 6 ký tự') }
            if (password !== confirmPassword) { return toast.error(t.settings?.messages?.passwordMismatch || 'Mật khẩu xác nhận không khớp') }
        }

        setIsSaving(true)
        try {
            const supabase = createClient()
            if (password) {
                const { error } = await supabase.auth.updateUser({ password })
                if (error) throw error
                setPassword('')
                setConfirmPassword('')
                toast.success(t.settings?.messages?.passwordUpdated || 'Đã cập nhật mật khẩu')
                // Send email notification (fire-and-forget)
                notifyPasswordChanged()
            }

            if (profile) {
                const updatePayload = {
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone: profile.phone,
                    address: profile.address,
                    city: profile.city,
                    dob: profile.dob,
                    gender: profile.gender,
                    emergency_contact: profile.emergency_contact,
                    skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean)
                }

                await supabase.auth.updateUser({
                    data: {
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                        full_name: `${profile.first_name} ${profile.last_name}`
                    }
                })

                const res = await updateMyProfile(updatePayload)
                if (res.error) throw new Error(res.error)
                toast.success(t.settings?.messages?.profileSaved || 'Đã lưu thông tin hồ sơ!')
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || t.settings?.messages?.saveFailed || 'Lưu thất bại')
        } finally {
            setIsSaving(false)
        }
    }

    const handlePushToggle = async (checked: boolean) => {
        if (checked) {
            // Step 1: Check browser support
            if (!('Notification' in window)) {
                toast.error(t.settings?.messages?.browserNotSupported || 'Trình duyệt không hỗ trợ thông báo đẩy')
                return
            }

            // Step 2: Request browser permission
            let permission = Notification.permission
            if (permission === 'denied') {
                toast.error(t.settings?.messages?.notificationBlocked || 'Quyền thông báo đã被 chặn. Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ để bật lại.', {
                    duration: 8000
                })
                return
            }

            if (permission === 'default') {
                permission = await Notification.requestPermission()
            }

            if (permission !== 'granted') {
                toast.error(t.settings?.messages?.needPermission || 'Bạn cần cho phép thông báo để bật tính năng này')
                return
            }

            // Step 3: Register FCM token
            try {
                // Dynamically import Firebase only when user actually interacts with push toggle
                const { messaging, VAPID_KEY, getToken } = await import('@/utils/firebase')
                const msg = await messaging()
                if (msg) {
                    const currentToken = await getToken(msg, { vapidKey: VAPID_KEY })
                    if (currentToken) {
                        // Save token to database
                        const supabase = (await import('@/utils/supabase/client')).createClient()
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                            const getDeviceType = () => {
                                const ua = navigator.userAgent
                                if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'
                                if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'
                                return 'desktop'
                            }
                            // First: Remove this token from ANY other user (handles account switching)
                            // The token is unique per device, so if another user had it, transfer ownership
                            await supabase.from('fcm_tokens')
                                .delete()
                                .eq('token', currentToken)
                                .neq('user_id', user.id)

                            // Then: Upsert for current user (using token as conflict key)
                            await supabase.from('fcm_tokens').upsert({
                                user_id: user.id,
                                token: currentToken,
                                device_type: getDeviceType(),
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'token' })
                        }
                    }
                }
            } catch (err) {
                console.warn('FCM registration warning:', err)
            }

            // Step 4: Save to database
            setPushEnabled(true)
            updatePushNotificationSetting(true).then(() => {
                toast.success(t.settings?.messages?.pushEnabled || 'Đã bật thông báo đẩy')
            }).catch(() => {
                setPushEnabled(false)
                toast.error(t.settings?.messages?.cannotSaveGeneral || 'Không thể lưu cài đặt')
            })
        } else {
            // Turning OFF: Remove tokens and update database
            setPushEnabled(false)
            updatePushNotificationSetting(false).then(() => {
                toast.success(t.settings?.messages?.pushDisabled || 'Đã tắt thông báo đẩy')
            }).catch(() => {
                setPushEnabled(true)
                toast.error(t.settings?.messages?.cannotSaveGeneral || 'Không thể lưu cài đặt')
            })
        }
    }
    const handleAutoCheckInToggle = (checked: boolean) => {
        setAutoCheckInEnabled(checked)
        updateAutoCheckInSetting(checked).catch(() => setAutoCheckInEnabled(!checked))
    }
    const handleAutoCheckOutToggle = (checked: boolean) => {
        setAutoCheckOutSetting(checked)
        updateAutoCheckOutSetting(checked).catch(() => setAutoCheckOutSetting(!checked))
    }

    const handleClockInMinutesChange = (value: number) => {
        setClockInMinutes(value)
        if (clockInSaveTimer.current) clearTimeout(clockInSaveTimer.current)
        clockInSaveTimer.current = setTimeout(() => {
            updateClockInSettings(value).catch(() => toast.error(t.settings?.messages?.cannotSaveGeneral || 'Không thể lưu cài đặt'))
        }, 600)
    }

    const handleClockOutModeChange = (mode: 'before' | 'after') => {
        setClockOutMode(mode)
        updateClockOutSettings(mode, clockOutMinutes).catch(() => toast.error(t.settings?.messages?.cannotSaveGeneral || 'Không thể lưu cài đặt'))
    }

    const handleClockOutMinutesChange = (value: number) => {
        setClockOutMinutes(value)
        if (clockOutSaveTimer.current) clearTimeout(clockOutSaveTimer.current)
        clockOutSaveTimer.current = setTimeout(() => {
            updateClockOutSettings(clockOutMode, value).catch(() => toast.error(t.settings?.messages?.cannotSaveGeneral || 'Không thể lưu cài đặt'))
        }, 600)
    }

    const handleAvatarSelect = async (url: string) => {
        const supabase = createClient()
        // 1. Update Auth metadata (for immediate UI response in some places)
        await supabase.auth.updateUser({ data: { avatar_url: url } })

        // 2. Update profiles table (for Admin sync and persistent storage)
        await updateMyAvatar(url)

        setCurrentAvatar(url)
        setIsAvatarOpen(false)
        toast.success('Avatar updated')
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error(t.settings?.messages?.selectImage || 'Vui lòng chọn file ảnh')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t.settings?.messages?.imageTooLarge || 'Ảnh quá lớn! Tối đa 5MB')
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // Upload to WordPress
            const response = await fetch('/api/wordpress/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.code === 'NO_CONFIG') {
                    toast.error(t.settings?.messages?.wpNotConfigured || 'WordPress chưa được cấu hình. Vui lòng liên hệ Admin.')
                } else {
                    throw new Error(data.error || t.settings?.messages?.uploadFailed || 'Upload thất bại')
                }
                return
            }

            await handleAvatarSelect(data.url)
        } catch (error: any) {
            console.error('Avatar upload error:', error)
            toast.error(error.message || t.settings?.messages?.uploadFailed || 'Upload thất bại')
        } finally {
            setIsUploading(false)
        }
    }

    const updateProfile = (field: string, value: any) => {
        setProfile((prev: any) => ({ ...prev, [field]: value }))
    }
    const updateEmergency = (field: string, value: any) => {
        setProfile((prev: any) => ({
            ...prev,
            emergency_contact: { ...prev.emergency_contact, [field]: value }
        }))
    }

    const handleMfaToggle = async (checked: boolean) => {
        if (checked) {
            // Turning ON
            try {
                const data = await enrollMFA()
                setMfaEnrollData(data)
                setMfaCode('')
                setIsMfaModalOpen(true)
            } catch (error: any) {
                toast.error(error.message || t.settings?.messages?.cannotStart2FA || t.settings?.messages?.cannotStart2FA || 'Không thể bắt đầu thiết lập 2FA')
            }
        } else {
            // Turning OFF
            if (!mfaFactorId) return
            const confirmed = window.confirm(t.settings?.messages?.confirmTurnOff2FA || t.settings?.messages?.confirmTurnOff2FA || 'Bạn có chắc chắn muốn tắt xác thực 2 bước? Tài khoản của bạn sẽ giảm độ bảo mật.')
            if (!confirmed) return

            try {
                await unenrollMFA(mfaFactorId)
                setMfaFactorId(null)
                toast.success(t.settings?.messages?.twoFADisabled || 'Đã tắt xác thực 2 bước')
            } catch (error: any) {
                toast.error(error.message || t.settings?.messages?.cannotTurnOff2FA || t.settings?.messages?.cannotTurnOff2FA || 'Không thể tắt 2FA')
            }
        }
    }

    const onVerifyMfa = async () => {
        if (!mfaEnrollData || !mfaCode || mfaCode.length !== 6) return
        setVerifyLoading(true)
        try {
            const { id: challengeId } = await challengeMFA(mfaEnrollData.id)
            await verifyMFA(mfaEnrollData.id, challengeId, mfaCode)

            setMfaFactorId(mfaEnrollData.id)
            setIsMfaModalOpen(false)
            setMfaEnrollData(null)
            toast.success(t.settings?.messages?.twoFAActivated || 'Đã kích hoạt xác thực 2 bước thành công!')
        } catch (error: any) {
            toast.error(error.message || t.settings?.messages?.invalidCode || 'Mã xác thực không đúng')
        } finally {
            setVerifyLoading(false)
        }
    }

    if (isLoadingData || !profile) {
        return (
            <div className="w-full max-w-[1600px] mx-auto bg-background-dark min-h-screen animate-pulse">
                {/* Mobile Skeleton */}
                <div className="flex flex-col xl:hidden px-6 pt-10">
                    <div className="h-8 w-1/3 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 w-1/2 bg-white/5 rounded mb-8"></div>

                    <div className="flex gap-4 mb-8">
                        <div className="size-16 rounded-full bg-white/10"></div>
                        <div className="flex flex-col gap-2 justify-center flex-1">
                            <div className="h-5 w-2/3 bg-white/10 rounded"></div>
                            <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="h-16 w-full bg-white/5 rounded-2xl"></div>
                        <div className="h-16 w-full bg-white/5 rounded-2xl"></div>
                        <div className="h-16 w-full bg-white/5 rounded-2xl"></div>
                        <div className="h-16 w-full bg-white/5 rounded-2xl"></div>
                    </div>
                </div>

                {/* Desktop Skeleton */}
                <div className="hidden xl:flex h-screen overflow-hidden">
                    <div className="w-80 border-r border-white/5 px-8 pt-[72px] flex flex-col gap-4">
                        <div className="h-12 w-full bg-white/10 rounded-xl"></div>
                        <div className="h-12 w-full bg-white/5 rounded-xl"></div>
                        <div className="h-12 w-full bg-white/5 rounded-xl"></div>
                        <div className="h-12 w-full bg-white/5 rounded-xl"></div>
                    </div>
                    <div className="flex-1 p-16 space-y-8">
                        <div className="flex gap-6 items-center border-b border-white/5 pb-8">
                            <div className="size-24 rounded-full bg-white/10"></div>
                            <div className="space-y-3">
                                <div className="h-8 w-64 bg-white/10 rounded"></div>
                                <div className="h-4 w-40 bg-white/5 rounded"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="h-[200px] bg-white/5 rounded-3xl"></div>
                            <div className="h-[200px] bg-white/5 rounded-3xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto bg-background-dark min-h-screen">
            {/* --- MOBILE VIEW (Only for LG and below) --- */}
            {/* Changed from lg:hidden to xl:hidden to show mobile view on tablets (lg) */}
            <div className="flex flex-col w-full bg-background-dark min-h-screen pb-20 xl:hidden">
                <MobileHeader
                    title={t.settings?.title || 'Cài đặt'}
                    subtitle="Tùy chỉnh hệ thống"
                />

                {/* Level 1: Main Menu */}
                <div className="flex flex-col flex-1 overflow-y-auto">
                    {/* User Profile Summary */}
                    <div className="flex p-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex w-full items-center gap-4">
                            <div
                                className="size-16 rounded-full bg-center bg-cover border-2 border-primary relative"
                                style={{ backgroundImage: `url("${currentAvatar}")` }}
                            >
                            </div>
                            <div className="flex flex-col">
                                <p className="text-lg font-bold text-white">{profile?.full_name || user?.email?.split('@')[0]}</p>
                                <p className="text-slate-500 text-xs">{user?.email}</p>
                                <div className="mt-1">
                                    <Badge variant="outline" className={`border-${profile?.status === 'active' ? 'emerald' : 'rose'}-500/20 text-${profile?.status === 'active' ? 'emerald' : 'rose'}-500 bg-${profile?.status === 'active' ? 'emerald' : 'rose'}-500/10 uppercase text-[10px] tracking-wider`}>
                                        {profile?.status === 'active' ? (t.settings?.activeRole || 'Đang hoạt động') : (t.settings?.lockedRole || 'Tạm khóa')}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 1: Account Settings */}
                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.nav?.account || 'Tài khoản'}</h2>
                    </div>
                    <div className="mx-4 bg-slate-800/20 rounded-2xl overflow-hidden border border-white/5">
                        <div onClick={() => setActiveTabMobile('general-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">person</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">{t.settings?.tabs?.general || 'Hồ sơ cá nhân'}</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                        <div onClick={() => setActiveTabMobile('security-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-purple-500 flex items-center justify-center rounded-lg bg-purple-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">shield</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">{t.settings?.tabs?.security || 'Bảo mật'}</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                    </div>

                    {/* Group 2: App Settings */}
                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">App</h2>
                    </div>
                    <div className="mx-4 bg-slate-800/20 rounded-2xl overflow-hidden border border-white/5">
                        <div onClick={() => setActiveTabMobile('notifications-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-blue-500 flex items-center justify-center rounded-lg bg-blue-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">notifications</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">{t.settings?.tabs?.notifications || 'Thông báo'}</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                        <div onClick={() => setActiveTabMobile('preferences-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-orange-500 flex items-center justify-center rounded-lg bg-orange-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">tune</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">{t.settings?.tabs?.preferences || 'Cài đặt chung'}</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                    </div>

                    {/* Group 3: Danger Zone */}
                    <div className="px-6 mt-8 pb-10">
                        <button onClick={async () => {
                            try {
                                const supabase = createClient()
                                // Remove FCM tokens for this user on this device before signing out
                                const { data: { user: currentUser } } = await supabase.auth.getUser()
                                if (currentUser) {
                                    await supabase.from('fcm_tokens').delete().eq('user_id', currentUser.id)
                                }
                                await supabase.auth.signOut()
                            } catch (e) { /* ignore */ }
                            window.location.href = '/login'
                        }} className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors cursor-pointer border border-red-500/20">
                            <span className="material-symbols-outlined">logout</span> Đăng xuất
                        </button>
                        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">v1.0.2-beta • Build 20240209</p>
                    </div>
                </div>

                {/* Level 2: Slide-in Detail Views */}
                {(activeTabMobile !== 'none') && (
                    <div className="fixed inset-0 z-[60] bg-background-dark flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Detail Header */}
                        <header className="flex items-center gap-4 border-b border-white/5 px-4 py-3 bg-background-dark/95 backdrop-blur-xl sticky top-0 z-10 pt-safe">
                            <button onClick={() => setActiveTabMobile('none')} className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-90 transition-all">
                                <span className="material-symbols-outlined text-white">arrow_back</span>
                            </button>
                            <h2 className="text-lg font-bold text-white flex-1 truncate">
                                {activeTabMobile === 'general-mobile' ? (t.settings?.tabs?.general || 'Hồ sơ cá nhân') : null}
                                {activeTabMobile === 'security-mobile' ? 'Bảo mật' : null}
                                {activeTabMobile === 'notifications-mobile' ? 'Cài đặt thông báo' : null}
                                {activeTabMobile === 'preferences-mobile' ? 'Cài đặt chung' : null}
                            </h2>
                            {(activeTabMobile === 'general-mobile' || activeTabMobile === 'security-mobile') && (
                                <button onClick={() => { handleSave(); setActiveTabMobile('none'); }} className="text-primary font-bold text-sm px-3 py-1.5 bg-primary/10 rounded-lg active:scale-95 transition-transform">
                                    Lưu
                                </button>
                            )}
                        </header>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-4 pb-32">
                            {activeTabMobile === 'general-mobile' && (
                                <div className="space-y-6">
                                    <div className="flex justify-center mb-6">
                                        <div className="relative group" onClick={() => setIsAvatarOpen(true)}>
                                            <div className="size-28 rounded-full bg-center bg-cover border-4 border-slate-800 shadow-2xl cursor-pointer active:scale-95 transition-transform" style={{ backgroundImage: `url("${currentAvatar}")` }}></div>
                                            <div className="absolute bottom-0 right-0 bg-primary text-slate-950 size-8 rounded-full flex items-center justify-center shadow-lg border-2 border-background-dark"><span className="material-symbols-outlined text-sm font-bold">edit</span></div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Thông tin cơ bản</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400">Họ đệm</label>
                                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm" value={profile?.first_name || ''} onChange={(e) => updateProfile('first_name', e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400">Tên</label>
                                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm" value={profile?.last_name || ''} onChange={(e) => updateProfile('last_name', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400">Ngày sinh</label>
                                                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm" value={profile?.dob || ''} onChange={(e) => updateProfile('dob', e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400">Giới tính</label>
                                                    <Select value={profile?.gender || 'male'} onValueChange={(val) => updateProfile('gender', val)}>
                                                        <SelectTrigger className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm h-auto border-input"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700 text-white z-[70]">
                                                            <SelectItem value="male">{t.settings?.genderOptions?.male || 'Nam'}</SelectItem>
                                                            <SelectItem value="female">{t.settings?.genderOptions?.female || 'Nữ'}</SelectItem>
                                                            <SelectItem value="other">{t.settings?.genderOptions?.other || 'Khác'}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Liên hệ & Công việc</h3>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Email</label>
                                                <input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-500 font-bold text-sm" value={profile?.email || ''} readOnly />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">SĐT</label>
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm" value={profile?.phone || ''} onChange={(e) => updateProfile('phone', e.target.value)} placeholder="09xxx" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Địa chỉ</label>
                                                <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm min-h-[60px]" value={profile?.address || ''} onChange={(e) => updateProfile('address', e.target.value)} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Kỹ năng chuyên môn</label>
                                                <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold text-sm min-h-[60px]" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="bg-rose-500/5 rounded-2xl p-4 border border-rose-500/20 space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-sm">sos</span> Liên hệ khẩn cấp</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Tên người thân" value={profile?.emergency_contact?.name || ''} onChange={(e) => updateEmergency('name', e.target.value)} />
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder={t.settings?.emePhone || 'SĐT liên hệ'} value={profile?.emergency_contact?.phone || ''} onChange={(e) => updateEmergency('phone', e.target.value)} type="tel" />
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder={t.settings?.emeRel || 'Mối quan hệ (Vd: Bố, Mẹ...)'} value={profile?.emergency_contact?.relationship || ''} onChange={(e) => updateEmergency('relationship', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTabMobile === 'security-mobile' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Đổi mật khẩu</h3>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-slate-400">Mật khẩu mới</label>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-slate-400">Xác nhận mật khẩu</label>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm" placeholder="••••••••" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-purple-500 size-8 bg-purple-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">security_update_good</span></div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{t.settings?.twoFA || 'Xác thực 2 bước (2FA)'}</p>
                                                    <p className="text-slate-500 text-[10px]">{t.settings?.enhanceSec || 'Tăng cường bảo mật'}</p>
                                                </div>
                                            </div>
                                            <Switch checked={!!mfaFactorId} onCheckedChange={handleMfaToggle} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTabMobile === 'notifications-mobile' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-blue-500 size-8 bg-blue-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">notifications_active</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Push Notification</p>
                                                    <p className="text-[10px] text-slate-500">{t.settings?.pushDesc || 'Thông báo trên thiết bị'}</p>
                                                </div>
                                            </div>
                                            <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTabMobile === 'preferences-mobile' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5 space-y-4">
                                        {/* Clock In */}
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-emerald-500 size-8 bg-emerald-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">timer_play</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Auto Clock In</p>
                                                    <p className="text-[10px] text-slate-500">{t.settings?.autoClockInDesc || 'Tự động khi đến công ty'}</p>
                                                </div>
                                            </div>
                                            <Switch checked={autoCheckInEnabled} onCheckedChange={handleAutoCheckInToggle} />
                                        </div>
                                        {autoCheckInEnabled && (
                                            <div className="ml-11 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-slate-400">{t.settings?.remindBefore || 'Nhắc trước'}</p>
                                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{clockInMinutes} {t.settings?.minutes || 'phút'}</span>
                                                </div>
                                                <input type="range" min={1} max={30} step={1} value={clockInMinutes} onChange={(e) => handleClockInMinutesChange(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                                <div className="flex justify-between text-[10px] text-slate-600">
                                                    <span>1 {t.settings?.minutes || 'phút'}</span>
                                                    <span>15 {t.settings?.minutes || 'phút'}</span>
                                                    <span>30 {t.settings?.minutes || 'phút'}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-white/5"></div>

                                        {/* Clock Out */}
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-orange-500 size-8 bg-orange-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">timer_off</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Auto Clock Out</p>
                                                    <p className="text-[10px] text-slate-500">{t.settings?.autoClockOutDesc || 'Tự động khi rời công ty'}</p>
                                                </div>
                                            </div>
                                            <Switch checked={autoCheckOutSetting} onCheckedChange={handleAutoCheckOutToggle} />
                                        </div>
                                        {autoCheckOutSetting && (
                                            <div className="ml-11 p-3 bg-orange-500/5 rounded-xl border border-orange-500/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleClockOutModeChange('before')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${clockOutMode === 'before' ? 'bg-orange-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t.settings?.beforeEnd || 'Trước giờ tan'}</button>
                                                    <button onClick={() => handleClockOutModeChange('after')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${clockOutMode === 'after' ? 'bg-orange-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t.settings?.afterEnd || 'Sau giờ tan'}</button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-slate-400">{clockOutMode === 'before' ? 'Nhắc trước' : 'Nhắc sau'}</p>
                                                    <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{clockOutMinutes} {t.settings?.minutes || 'phút'}</span>
                                                </div>
                                                <input type="range" min={1} max={10} step={1} value={clockOutMinutes} onChange={(e) => handleClockOutMinutesChange(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500" />
                                                <div className="flex justify-between text-[10px] text-slate-600">
                                                    <span>1 {t.settings?.minutes || 'phút'}</span>
                                                    <span>5 {t.settings?.minutes || 'phút'}</span>
                                                    <span>10 {t.settings?.minutes || 'phút'}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-white/5"></div>

                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-400 size-8 bg-slate-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">dark_mode</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Giao diện tối</p>
                                                    <p className="text-[10px] text-slate-500">Luôn bật</p>
                                                </div>
                                            </div>
                                            <Switch checked disabled />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- DESKTOP VIEW (Visible only on XL and above) --- */}
            {/* Changed from hidden lg:flex to hidden xl:flex */}
            <div
                ref={scrollContainerRef}
                className="hidden xl:flex flex-row gap-8 items-start p-10 w-full h-screen overflow-y-auto relative hide-scrollbar"
                style={{ scrollbarWidth: 'none' }}
            >
                <aside className="w-64 shrink-0 sticky top-10 self-start hidden xl:block">
                    <nav className="flex flex-col gap-1 p-2 bg-card rounded-2xl border border-border shadow-2xl">
                        {[
                            { id: 'general', icon: 'person', label: t.settings?.tabs?.general || 'Hồ sơ cá nhân' },
                            { id: 'security', icon: 'security', label: t.settings?.tabs?.security || 'Bảo mật' },
                            { id: 'notifications', icon: 'notifications', label: t.settings?.tabs?.notifications || 'Thông báo' },
                            { id: 'preferences', icon: 'settings', label: t.settings?.tabs?.preferences || 'Cài đặt chung' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id as any)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${activeTab === item.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="flex-1 flex flex-col gap-8 pb-20 w-full">
                    {/* General */}
                    <section ref={generalRef} data-section="general" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">{t.settings?.tabs?.general || 'Hồ sơ cá nhân'}</h3>
                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/10 uppercase text-[10px] tracking-wider">
                                {profile?.status === 'active' ? (t.settings?.activeRole || 'Đang hoạt động') : (t.settings?.lockedRole || 'Tạm khóa')}
                            </Badge>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-800/30 p-6 rounded-2xl border border-dashed border-slate-700">
                                <div className="relative group cursor-pointer" onClick={() => setIsAvatarOpen(true)}>
                                    <div className="size-28 rounded-full bg-center bg-cover ring-4 ring-slate-700 transition-all group-hover:ring-primary/50" style={{ backgroundImage: `url("${currentAvatar}")` }}></div>
                                    <button className="absolute -bottom-1 -right-1 bg-primary text-slate-950 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm block">edit</span></button>
                                </div>
                                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">badge</span> {t.settings?.empCode || 'Mã NV'}</label>
                                        <div className="text-white font-mono bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.employee_code || '---'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">work</span> {t.settings?.profile?.jobTitle || 'Chức danh'}</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full font-bold">{profile?.job_title || t.settings?.profile?.userFallback || 'Thành viên'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">apartment</span> {t.settings?.profile?.department || 'Phòng ban'}</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.department || '---'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">verified_user</span> {t.settings?.profile?.role || 'Quyền'}</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.role_name || 'Member'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">{t.settings?.lastName || 'Họ đệm'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.first_name || ''} onChange={(e) => updateProfile('first_name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">{t.settings?.firstName || 'Tên'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.last_name || ''} onChange={(e) => updateProfile('last_name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">{t.settings?.dob || 'Ngày sinh'}</label>
                                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.dob || ''} onChange={(e) => updateProfile('dob', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">{t.settings?.gender || 'Giới tính'}</label>
                                    <Select value={profile?.gender || 'male'} onValueChange={(val) => updateProfile('gender', val)}>
                                        <SelectTrigger className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold h-auto border-input"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                            <SelectItem value="male">{t.settings?.genderOptions?.male || 'Nam'}</SelectItem>
                                            <SelectItem value="female">{t.settings?.genderOptions?.female || 'Nữ'}</SelectItem>
                                            <SelectItem value="other">{t.settings?.genderOptions?.other || 'Khác'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Email (Readonly)</label>
                                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 font-bold" value={profile?.email || ''} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">{t.settings?.phone || 'SĐT'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.phone || ''} onChange={(e) => updateProfile('phone', e.target.value)} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-400">Địa chỉ</label>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold min-h-[80px]" value={profile?.address || ''} onChange={(e) => updateProfile('address', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4 p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                                    <h4 className="flex items-center gap-2 text-rose-400 font-bold uppercase text-xs tracking-widest"><span className="material-symbols-outlined text-sm">sos</span> {t.settings?.emergency || 'Liên hệ khẩn cấp'}</h4>
                                    <div className="space-y-3">
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder={t.settings?.emeName || 'Tên liên hệ'} value={profile?.emergency_contact?.name || ''} onChange={(e) => updateEmergency('name', e.target.value)} />
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder={t.settings?.emePhone || 'SĐT liên hệ'} value={profile?.emergency_contact?.phone || ''} onChange={(e) => updateEmergency('phone', e.target.value)} />
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder={t.settings?.emeRel || 'Mối quan hệ (Vd: Bố, Mẹ...)'} value={profile?.emergency_contact?.relationship || ''} onChange={(e) => updateEmergency('relationship', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-slate-400 font-bold uppercase text-xs tracking-widest"><span className="material-symbols-outlined text-sm">school</span> {t.settings?.skills || 'Kỹ năng'}</h4>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm min-h-[120px]" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section ref={securityRef} data-section="security" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">{t.settings?.tabs?.security || 'Bảo mật'}</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.newPassword || 'Mật khẩu mới'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.confirmPassword || 'Xác nhận'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="text-purple-500 size-10 bg-purple-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">security_update_good</span></div>
                                    <div><p className="text-white font-bold text-sm">{t.settings?.twoFA || 'Xác thực 2 bước (2FA)'}</p></div>
                                </div>
                                <Switch checked={!!mfaFactorId} onCheckedChange={handleMfaToggle} />
                            </div>
                        </div>
                    </section>

                    {/* Notifications */}
                    <section ref={notificationsRef} data-section="notifications" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">{t.settings?.tabs?.notifications || 'Thông báo'}</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-blue-500 size-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">notifications_active</span></div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{t.settings?.pushDesc || 'Thông báo đẩy'}</p>
                                        <p className="text-slate-500 text-xs text-left">{t.settings?.notifications?.checkInReminders || 'Nhận thông báo chấm công'}</p>
                                    </div>
                                </div>
                                <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                            </div>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section ref={preferencesRef} data-section="preferences" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">{t.settings?.tabs?.preferences || 'Cài đặt chung'}</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Clock In */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-emerald-500 size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">timer_play</span></div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Auto Clock In</p>
                                            <p className="text-slate-500 text-xs">{t.settings?.autoClockInDesc || 'Tự động chấm công khi đến văn phòng'}</p>
                                        </div>
                                    </div>
                                    <Switch checked={autoCheckInEnabled} onCheckedChange={handleAutoCheckInToggle} />
                                </div>
                                {autoCheckInEnabled && (
                                    <div className="ml-14 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-300">{t.settings?.remindBefore || 'Nhắc trước giờ vào ca'}</p>
                                            <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full min-w-[72px] text-center">{clockInMinutes} {t.settings?.minutes || 'phút'}</span>
                                        </div>
                                        <input type="range" min={1} max={30} step={1} value={clockInMinutes} onChange={(e) => handleClockInMinutesChange(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                                            <span>1 {t.settings?.minutes || 'phút'}</span>
                                            <span>15 {t.settings?.minutes || 'phút'}</span>
                                            <span>30 {t.settings?.minutes || 'phút'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-white/5"></div>

                            {/* Clock Out */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-orange-500 size-10 bg-orange-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">timer_off</span></div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Auto Clock Out</p>
                                            <p className="text-slate-500 text-xs">{t.settings?.autoClockOutDesc || 'Tự động chấm công khi hết giờ làm'}</p>
                                        </div>
                                    </div>
                                    <Switch checked={autoCheckOutSetting} onCheckedChange={handleAutoCheckOutToggle} />
                                </div>
                                {autoCheckOutSetting && (
                                    <div className="ml-14 p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">{t.settings?.remindTime || 'Thời điểm nhắc'}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleClockOutModeChange('before')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${clockOutMode === 'before' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>⏰ {t.settings?.beforeEnd || 'Trước giờ tan'}</button>
                                                <button onClick={() => handleClockOutModeChange('after')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${clockOutMode === 'after' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>🔔 {t.settings?.afterEnd || 'Sau giờ tan'}</button>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-slate-300">{clockOutMode === 'before' ? (t.settings?.remindBefore || 'Nhắc trước') : (t.settings?.remindAfter || 'Nhắc sau')} {t.settings?.shiftEnd || 'giờ tan ca'}</p>
                                                <span className="text-sm font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full min-w-[72px] text-center">{clockOutMinutes} {t.settings?.minutes || 'phút'}</span>
                                            </div>
                                            <input type="range" min={1} max={10} step={1} value={clockOutMinutes} onChange={(e) => handleClockOutMinutesChange(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500" />
                                            <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                                                <span>1 {t.settings?.minutes || 'phút'}</span>
                                                <span>5 {t.settings?.minutes || 'phút'}</span>
                                                <span>10 {t.settings?.minutes || 'phút'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="sticky bottom-6 z-10 flex justify-end">
                        <button onClick={handleSave} disabled={isSaving} className={`shadow-2xl shadow-primary/30 px-8 py-4 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 transition-transform ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 active:scale-95'}`}>
                            {isSaving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
                            {isSaving ? (t.settings?.actions?.saving || 'Đang lưu...') : (t.settings?.actions?.save || 'Lưu tất cả thay đổi')}
                        </button>
                    </div>
                </div>
            </div>

            <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
                <DialogContent className="bg-card border-slate-700">
                    <DialogHeader><DialogTitle className="text-white">Chọn Avatar</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {AVAILABLE_AVATARS.map((avatar, idx) => (
                            <button key={idx} onClick={() => handleAvatarSelect(avatar)} className="aspect-square rounded-2xl bg-slate-800 overflow-hidden relative"><img src={avatar} className="w-full h-full object-cover" /></button>
                        ))}
                        <div className="col-span-3 pt-4 border-t border-slate-700">
                            <label className="flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed border-slate-600 hover:border-primary transition-all cursor-pointer">
                                {isUploading ? <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span> : <><span className="material-symbols-outlined text-slate-400 text-2xl mb-1">cloud_upload</span><span className="text-xs text-slate-300 font-bold">Tải ảnh lên</span></>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </label>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isMfaModalOpen} onOpenChange={setIsMfaModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-500">qr_code_scanner</span>
                            Thiết lập 2FA
                        </DialogTitle>
                    </DialogHeader>

                    {mfaEnrollData && (
                        <div className="flex flex-col items-center space-y-6 py-4">
                            <div className="bg-white p-4 rounded-xl">
                                <QRCodeSVG value={mfaEnrollData.totp.uri} size={180} />
                            </div>

                            <div className="space-y-2 text-center w-full">
                                <p className="text-sm text-slate-400">1. Quét mã QR bằng ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Authy</strong>.</p>
                                <p className="text-sm text-slate-400">2. Nhập mã gồm 6 chữ số từ ứng dụng:</p>
                            </div>

                            <div className="flex flex-col gap-4 w-full max-w-[240px]">
                                <Input
                                    className="bg-slate-950 border-slate-700 text-center text-2xl tracking-[0.5em] font-mono h-14"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                />
                                <Button
                                    onClick={onVerifyMfa}
                                    disabled={mfaCode.length !== 6 || verifyLoading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                                >
                                    {verifyLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Xác thực & Kích hoạt'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

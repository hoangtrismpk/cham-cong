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
    getMyProfile,
    updateMyProfile,
    updateMyAvatar
} from '@/app/actions/profile'
import { useSidebar } from '@/contexts/sidebar-context'
import { Badge } from '@/components/ui/badge'
import { MobileHeader } from '@/components/mobile-header'

interface SettingsClientProps {
    user: any
}

export function SettingsClient({ user }: SettingsClientProps) {
    const { t, locale, setLocale } = useI18n()
    const { setIsOpen } = useSidebar()
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'preferences'>('general')
    const [activeTabMobile, setActiveTabMobile] = useState<string>('none')
    const [pushEnabled, setPushEnabled] = useState(false)
    const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(false)
    const [autoCheckOutSetting, setAutoCheckOutSetting] = useState(false)
    const [currentAvatar, setCurrentAvatar] = useState(user?.user_metadata?.avatar_url || getDefaultAvatar(user?.id))
    const [isAvatarOpen, setIsAvatarOpen] = useState(false)

    const [profile, setProfile] = useState<any>(null)
    const [skillsInput, setSkillsInput] = useState('')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Refs for scrolling
    const generalRef = useRef<HTMLElement>(null)
    const securityRef = useRef<HTMLElement>(null)
    const notificationsRef = useRef<HTMLElement>(null)
    const preferencesRef = useRef<HTMLElement>(null)
    const isScrollingProgrammatically = useRef(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getAutoCheckInSetting().then(enabled => setAutoCheckInEnabled(enabled))
        getAutoCheckOutSetting().then(enabled => setAutoCheckOutSetting(enabled))
        loadMyProfile()
    }, [])

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


    const loadMyProfile = async () => {
        const { profile, error } = await getMyProfile()
        if (profile) {
            setProfile(profile)
            if (profile.avatar_url) setCurrentAvatar(profile.avatar_url)
            if (profile.skills) setSkillsInput(profile.skills.join(', '))
        } else {
            console.error(error)
        }
    }

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
            if (password.length < 6) { return toast.error('Mật khẩu phải có ít nhất 6 ký tự') }
            if (password !== confirmPassword) { return toast.error('Mật khẩu xác nhận không khớp') }
        }

        setIsSaving(true)
        try {
            const supabase = createClient()
            if (password) {
                const { error } = await supabase.auth.updateUser({ password })
                if (error) throw error
                setPassword('')
                setConfirmPassword('')
                toast.success('Đã cập nhật mật khẩu')
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
                toast.success('Đã lưu thông tin hồ sơ!')
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Lưu thất bại')
        } finally {
            setIsSaving(false)
        }
    }

    const handlePushToggle = (checked: boolean) => setPushEnabled(checked)
    const handleAutoCheckInToggle = (checked: boolean) => {
        setAutoCheckInEnabled(checked)
        updateAutoCheckInSetting(checked).catch(() => setAutoCheckInEnabled(!checked))
    }
    const handleAutoCheckOutToggle = (checked: boolean) => {
        setAutoCheckOutSetting(checked)
        updateAutoCheckOutSetting(checked).catch(() => setAutoCheckOutSetting(!checked))
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
            toast.error('Vui lòng chọn file ảnh')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ảnh quá lớn! Tối đa 5MB')
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
                    toast.error('WordPress chưa được cấu hình. Vui lòng liên hệ Admin.')
                } else {
                    throw new Error(data.error || 'Upload thất bại')
                }
                return
            }

            await handleAvatarSelect(data.url)
        } catch (error: any) {
            console.error('Avatar upload error:', error)
            toast.error(error.message || 'Upload thất bại')
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

    if (!profile) return <div className="p-10 text-white text-center flex items-center justify-center h-screen"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>

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
                                        {profile?.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 1: Account Settings */}
                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Tài khoản</h2>
                    </div>
                    <div className="mx-4 bg-slate-800/20 rounded-2xl overflow-hidden border border-white/5">
                        <div onClick={() => setActiveTabMobile('general-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">person</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">Hồ sơ cá nhân</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                        <div onClick={() => setActiveTabMobile('security-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-purple-500 flex items-center justify-center rounded-lg bg-purple-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">shield</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">Bảo mật & Đăng nhập</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                    </div>

                    {/* Group 2: App Settings */}
                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Ứng dụng</h2>
                    </div>
                    <div className="mx-4 bg-slate-800/20 rounded-2xl overflow-hidden border border-white/5">
                        <div onClick={() => setActiveTabMobile('notifications-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-blue-500 flex items-center justify-center rounded-lg bg-blue-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">notifications</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">Thông báo</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                        <div onClick={() => setActiveTabMobile('preferences-mobile')} className="flex items-center gap-4 px-4 py-4 active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                            <div className="text-orange-500 flex items-center justify-center rounded-lg bg-orange-500/10 shrink-0 size-9"><span className="material-symbols-outlined text-lg">tune</span></div>
                            <p className="text-sm font-bold text-slate-200 flex-1">Cài đặt chung</p>
                            <span className="material-symbols-outlined text-slate-500 text-lg">chevron_right</span>
                        </div>
                    </div>

                    {/* Group 3: Danger Zone */}
                    <div className="px-6 mt-8 pb-10">
                        <button onClick={() => createClient().auth.signOut().then(() => window.location.href = '/login')} className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors cursor-pointer border border-red-500/20">
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
                                {activeTabMobile === 'general-mobile' && 'Hồ sơ cá nhân'}
                                {activeTabMobile === 'security-mobile' && 'Bảo mật'}
                                {activeTabMobile === 'notifications-mobile' && 'Cài đặt thông báo'}
                                {activeTabMobile === 'preferences-mobile' && 'Cài đặt chung'}
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
                                                            <SelectItem value="male">Nam</SelectItem>
                                                            <SelectItem value="female">Nữ</SelectItem>
                                                            <SelectItem value="other">Khác</SelectItem>
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
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="SĐT liên hệ" value={profile?.emergency_contact?.phone || ''} onChange={(e) => updateEmergency('phone', e.target.value)} type="tel" />
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Mối quan hệ (Vd: Bố, Mẹ...)" value={profile?.emergency_contact?.relationship || ''} onChange={(e) => updateEmergency('relationship', e.target.value)} />
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
                                                    <p className="text-white font-bold text-sm">Xác thực 2 bước (2FA)</p>
                                                    <p className="text-slate-500 text-[10px]">Tăng cường bảo mật</p>
                                                </div>
                                            </div>
                                            <Switch />
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
                                                    <p className="text-[10px] text-slate-500">Thông báo trên thiết bị</p>
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
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-emerald-500 size-8 bg-emerald-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">timer_play</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Auto Check-in</p>
                                                    <p className="text-[10px] text-slate-500">Tự động khi đến công ty</p>
                                                </div>
                                            </div>
                                            <Switch checked={autoCheckInEnabled} onCheckedChange={handleAutoCheckInToggle} />
                                        </div>

                                        <div className="border-t border-white/5"></div>

                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-orange-500 size-8 bg-orange-500/10 rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-lg">timer_off</span></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-200">Auto Check-out</p>
                                                    <p className="text-[10px] text-slate-500">Tự động khi rời công ty</p>
                                                </div>
                                            </div>
                                            <Switch checked={autoCheckOutSetting} onCheckedChange={handleAutoCheckOutToggle} />
                                        </div>

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
                            <h3 className="text-xl font-bold text-white">Hồ sơ cá nhân</h3>
                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/10 uppercase text-[10px] tracking-wider">
                                {profile?.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
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
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">badge</span> Mã NV</label>
                                        <div className="text-white font-mono bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.employee_code || '---'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">work</span> Chức danh</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full font-bold">{profile?.job_title || 'Thành viên'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">apartment</span> Phòng ban</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.department || '---'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] items-center flex gap-1 font-bold uppercase tracking-widest text-slate-500"><span className="material-symbols-outlined text-[12px]">verified_user</span> Quyền</label>
                                        <div className="text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg inline-block w-full">{profile?.role_name || 'Member'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Họ đệm</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.first_name || ''} onChange={(e) => updateProfile('first_name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Tên</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.last_name || ''} onChange={(e) => updateProfile('last_name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Ngày sinh</label>
                                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.dob || ''} onChange={(e) => updateProfile('dob', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Giới tính</label>
                                    <Select value={profile?.gender || 'male'} onValueChange={(val) => updateProfile('gender', val)}>
                                        <SelectTrigger className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold h-auto border-input"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                            <SelectItem value="male">Nam</SelectItem>
                                            <SelectItem value="female">Nữ</SelectItem>
                                            <SelectItem value="other">Khác</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">Email (Readonly)</label>
                                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 font-bold" value={profile?.email || ''} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400">SĐT</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold" value={profile?.phone || ''} onChange={(e) => updateProfile('phone', e.target.value)} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-400">Địa chỉ</label>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold min-h-[80px]" value={profile?.address || ''} onChange={(e) => updateProfile('address', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4 p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                                    <h4 className="flex items-center gap-2 text-rose-400 font-bold uppercase text-xs tracking-widest"><span className="material-symbols-outlined text-sm">sos</span> Liên hệ khẩn cấp</h4>
                                    <div className="space-y-3">
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Tên liên hệ" value={profile?.emergency_contact?.name || ''} onChange={(e) => updateEmergency('name', e.target.value)} />
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="SĐT liên hệ" value={profile?.emergency_contact?.phone || ''} onChange={(e) => updateEmergency('phone', e.target.value)} />
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Mối quan hệ (Vd: Bố, Mẹ...)" value={profile?.emergency_contact?.relationship || ''} onChange={(e) => updateEmergency('relationship', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-slate-400 font-bold uppercase text-xs tracking-widest"><span className="material-symbols-outlined text-sm">school</span> Kỹ năng</h4>
                                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm min-h-[120px]" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section ref={securityRef} data-section="security" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Bảo mật</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Mật khẩu mới</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Xác nhận</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="text-purple-500 size-10 bg-purple-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">security_update_good</span></div>
                                    <div><p className="text-white font-bold text-sm">Xác thực 2 bước (2FA)</p></div>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </section>

                    {/* Notifications */}
                    <section ref={notificationsRef} data-section="notifications" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Thông báo</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-blue-500 size-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">notifications_active</span></div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Thông báo đẩy</p>
                                        <p className="text-slate-500 text-xs text-left">Nhận thông báo chấm công</p>
                                    </div>
                                </div>
                                <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                            </div>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section ref={preferencesRef} data-section="preferences" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Cài đặt chung</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-emerald-500 size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">timer_play</span></div>
                                    <div><p className="text-white font-bold text-sm">Tự động Check-in</p></div>
                                </div>
                                <Switch checked={autoCheckInEnabled} onCheckedChange={handleAutoCheckInToggle} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-orange-500 size-10 bg-orange-500/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">timer_off</span></div>
                                    <div><p className="text-white font-bold text-sm">Tự động Check-out</p></div>
                                </div>
                                <Switch checked={autoCheckOutSetting} onCheckedChange={handleAutoCheckOutToggle} />
                            </div>
                        </div>
                    </section>

                    <div className="sticky bottom-6 z-10 flex justify-end">
                        <button onClick={handleSave} disabled={isSaving} className={`shadow-2xl shadow-primary/30 px-8 py-4 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 transition-transform ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 active:scale-95'}`}>
                            {isSaving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
                            {isSaving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
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
        </div>
    )
}

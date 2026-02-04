'use client'

import { useState, useRef, useEffect } from 'react'
import { Switch } from "@/components/ui/switch"
import { useI18n } from '@/contexts/i18n-context'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AVAILABLE_AVATARS, getDefaultAvatar } from '@/utils/avatar'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { uploadImageToHost } from '@/app/actions/leave'
import { useSidebar } from '@/contexts/sidebar-context'

interface SettingsClientProps {
    user: any
}

export function SettingsClient({ user }: SettingsClientProps) {
    const { t, locale } = useI18n()
    const { setIsOpen } = useSidebar()
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'preferences'>('general')
    const [activeTabMobile, setActiveTabMobile] = useState<string>('none')
    const [pushEnabled, setPushEnabled] = useState(false)
    const [currentAvatar, setCurrentAvatar] = useState(user?.user_metadata?.avatar_url || getDefaultAvatar(user?.id))
    const [isAvatarOpen, setIsAvatarOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)

    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024)
        }
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        return () => window.removeEventListener('resize', checkDesktop)
    }, [])
    const [isUploading, setIsUploading] = useState(false)
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Refs for scrolling to sections
    const generalRef = useRef<HTMLElement>(null)
    const securityRef = useRef<HTMLElement>(null)
    const notificationsRef = useRef<HTMLElement>(null)
    const preferencesRef = useRef<HTMLElement>(null)
    const isScrollingProgrammatically = useRef(false)

    const scrollToSection = (section: 'general' | 'security' | 'notifications' | 'preferences') => {
        setActiveTab(section)
        isScrollingProgrammatically.current = true

        const refs = {
            general: generalRef,
            security: securityRef,
            notifications: notificationsRef,
            preferences: preferencesRef
        }

        refs[section]?.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })

        // Re-enable observer after scroll completes (smooth scroll takes ~500-1000ms)
        setTimeout(() => {
            isScrollingProgrammatically.current = false
        }, 1000)
    }

    // Scroll Spy: Auto-activate menu based on scroll position
    useEffect(() => {
        let visibleSections = new Map<string, number>() // Track visible sections and their position
        const sectionOrder = ['general', 'security', 'notifications', 'preferences']

        const observerOptions = {
            root: null,
            rootMargin: '-10% 0px -50% 0px', // More lenient trigger area
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
        }

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                const sectionId = entry.target.getAttribute('data-section')
                if (!sectionId) return

                if (entry.isIntersecting) {
                    // Store section with its intersection ratio (how much is visible)
                    visibleSections.set(sectionId, entry.intersectionRatio)
                } else {
                    // Remove section when it's no longer visible
                    visibleSections.delete(sectionId)
                }
            })

            // Skip observer updates if user manually clicked a nav button
            if (isScrollingProgrammatically.current) {
                return
            }

            if (visibleSections.size > 0) {
                // Find the section with highest visibility (most visible on screen)
                let bestSection = ''
                let bestRatio = -1

                // Check sections in order
                sectionOrder.forEach(sectionId => {
                    const ratio = visibleSections.get(sectionId)
                    if (ratio !== undefined && ratio > bestRatio) {
                        bestRatio = ratio
                        bestSection = sectionId
                    }
                })

                if (bestSection) {
                    setActiveTab(bestSection as 'general' | 'security' | 'notifications' | 'preferences')
                }
            }
        }

        const observer = new IntersectionObserver(observerCallback, observerOptions)

        // Observe all sections
        const sections = [generalRef, securityRef, notificationsRef, preferencesRef]
        sections.forEach(ref => {
            if (ref.current) {
                observer.observe(ref.current)
            }
        })

        // Handle scroll to detect when at bottom
        const handleScroll = (e: Event) => {
            if (isScrollingProgrammatically.current) return

            const target = e.target as HTMLElement
            if (!target) return

            const scrollTop = target.scrollTop
            const scrollHeight = target.scrollHeight
            const clientHeight = target.clientHeight

            // Only activate preferences when REALLY at bottom (within 20px threshold)
            // This prevents skipping intermediate sections
            if (scrollTop + clientHeight >= scrollHeight - 20) {
                setActiveTab('preferences')
            }
        }

        // Find the scrollable container (desktop view container)
        const scrollContainer = document.querySelector('.desktop-only-view')
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll)
        }

        return () => {
            sections.forEach(ref => {
                if (ref.current) {
                    observer.unobserve(ref.current)
                }
            })
            visibleSections.clear()

            // Clean up scroll listener
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll)
            }
        }
    }, [])

    const handleSave = async () => {
        if (password) {
            if (password.length < 6) {
                toast.error('Mật khẩu phải có ít nhất 6 ký tự')
                return
            }
            if (password !== confirmPassword) {
                toast.error(t.settings?.security?.passwordMismatch || 'Mật khẩu xác nhận không khớp')
                return
            }
        }

        setIsSaving(true)
        try {
            const supabase = createClient()
            const updates: any = {
                data: { full_name: fullName }
            }

            if (password) {
                updates.password = password
            }

            const { error } = await supabase.auth.updateUser(updates)

            if (error) throw error

            toast.success(t.settings?.actions?.saveSuccess || 'Lưu cài đặt thành công')
            setPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || t.settings?.actions?.saveError || 'Lưu thất bại')
        } finally {
            setIsSaving(false)
        }
    }

    const testNotification = () => {
        if (!("Notification" in window)) {
            toast.error("Trình duyệt này không hỗ trợ thông báo")
            return
        }

        if (Notification.permission === "granted") {
            const sendNotification = async () => {
                const options = {
                    body: "Chúc mừng! Hệ thống thông báo chấm công đã hoạt động trên thiết bị của bạn.",
                    icon: "/logo.png",
                    badge: "/logo.png"
                }

                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready
                    registration.showNotification("Thông báo thử nghiệm", options)
                } else {
                    new Notification("Thông báo thử nghiệm", options)
                }
            }
            sendNotification()
            toast.success("Đã gửi thông báo thử nghiệm!")
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    testNotification()
                }
            })
        } else {
            toast.error("Bạn đã chặn quyền thông báo. Vui lòng mở lại trong cài đặt trình duyệt.")
        }
    }

    const handlePushToggle = async (checked: boolean) => {
        setPushEnabled(checked)
        if (checked) {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                try {
                    const { messaging, getToken, VAPID_KEY } = await import('@/utils/firebase')
                    const msg = await messaging()
                    if (!msg) return

                    const token = await getToken(msg, { vapidKey: VAPID_KEY })
                    if (token) {
                        const supabase = createClient()
                        const { error } = await supabase
                            .from('fcm_tokens')
                            .upsert({
                                user_id: user.id,
                                token: token,
                                device_type: 'web',
                                last_used_at: new Date().toISOString()
                            }, { onConflict: 'token' })

                        if (error) {
                            console.error('Error saving token:', error)
                            toast.error('Lỗi lưu token thông báo')
                        } else {
                            toast.success('Đã bật thông báo đẩy thành công!')
                        }
                    }
                } catch (err) {
                    console.error('FCM Error:', err)
                    toast.error('Không thể kết nối dịch vụ thông báo')
                    setPushEnabled(false)
                }
            } else {
                toast.error('Bạn cần cấp quyền thông báo cho trình duyệt')
                setPushEnabled(false)
            }
        }
    }

    const handleAvatarSelect = async (url: string) => {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
            data: { avatar_url: url }
        })

        if (error) {
            toast.error(t.common?.error || 'Failed to update avatar')
            return
        }

        setCurrentAvatar(url)
        setIsAvatarOpen(false)
        toast.success(t.common?.success || 'Avatar updated successfully')
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 500 * 1024) {
            toast.error('Image size must be less than 500KB')
            return
        }
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await uploadImageToHost(formData)
            if (res.error) throw new Error(res.error)
            await handleAvatarSelect(res.url)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Upload failed')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto">
            {/* MOBILE VIEW - EXACT MATCH to mobile_settings_view */}
            <div
                className="flex flex-col w-full bg-background-dark min-h-screen pb-20 mobile-only-view"
            >
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsOpen(true)} className="text-slate-400">
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">schedule</span>
                            <h2 className="text-lg font-bold tracking-tight text-white">{t.settings?.title || 'Settings'}</h2>
                        </div>
                    </div>
                </header>

                <div className="flex p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex w-full items-center gap-4">
                        <div
                            className="size-20 rounded-full bg-center bg-cover border-2 border-primary"
                            style={{ backgroundImage: `url("${currentAvatar}")` }}
                        ></div>
                        <div className="flex flex-col">
                            <p className="text-xl font-bold text-white">{fullName || user?.email?.split('@')[0]}</p>
                            <p className="text-slate-500 text-sm">{user?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t.settings?.tabs?.general || 'Account'}</h2>
                    </div>

                    <div
                        className="flex items-center gap-4 px-6 min-h-[64px] active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setActiveTabMobile('general-mobile')}
                    >
                        <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                        <p className="text-base font-medium text-slate-200 flex-1">{t.settings?.profile?.title || 'Profile Details'}</p>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>

                    <div
                        className="flex items-center gap-4 px-6 min-h-[64px] active:bg-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setActiveTabMobile('security-mobile')}
                    >
                        <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">shield</span>
                        </div>
                        <p className="text-base font-medium text-slate-200 flex-1">{t.settings?.security?.title || 'Security & Password'}</p>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </div>

                    <div className="px-6 pb-2 pt-6">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t.settings?.tabs?.preferences || 'Preferences'}</h2>
                    </div>

                    <div className="flex items-center gap-4 px-6 min-h-[64px] hover:bg-white/5 transition-colors">
                        <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">notifications</span>
                        </div>
                        <p className="text-base font-medium text-slate-200 flex-1">{t.settings?.notifications?.pushNotifications || 'Push Notifications'}</p>
                        <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                    </div>

                    <div className="flex items-center gap-4 px-6 min-h-[64px] hover:bg-white/5 transition-colors">
                        <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">dark_mode</span>
                        </div>
                        <p className="text-base font-medium text-slate-200 flex-1">Dark Mode</p>
                        <Switch checked />
                    </div>

                    <div className="flex items-center gap-4 px-6 min-h-[64px] hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                            <span className="material-symbols-outlined">translate</span>
                        </div>
                        <p className="text-base font-medium text-slate-200 flex-1">Language</p>
                        <div className="flex items-center gap-1 text-slate-500 text-sm">
                            <span>{locale === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                        </div>
                    </div>

                    <div className="px-6 mt-12 pb-10">
                        <button onClick={() => createClient().auth.signOut().then(() => window.location.href = '/login')} className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors">
                            <span className="material-symbols-outlined">logout</span>
                            Log Out
                        </button>
                        <p className="text-center text-xs text-slate-600 mt-6">Version 2.4.0 (Build 452)</p>
                    </div>
                </div>

                {/* Sub-modals for Mobile Tabs (Keeping existing logic for editing) */}
                {(activeTabMobile === 'general-mobile' || activeTabMobile === 'security-mobile') && (
                    <div className="fixed inset-0 z-[60] bg-background-dark flex flex-col pt-safe animate-in slide-in-from-right duration-300">
                        <header className="flex items-center gap-4 border-b border-white/5 px-6 py-4 bg-background-dark">
                            <button onClick={() => setActiveTabMobile('none')} className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-90 transition-all">
                                <span className="material-symbols-outlined text-white">arrow_back</span>
                            </button>
                            <h2 className="text-lg font-bold text-white">
                                {activeTabMobile === 'security-mobile' ? (t.settings?.security?.title || 'Security') : (t.settings?.profile?.title || 'Profile Details')}
                            </h2>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTabMobile === 'security-mobile' ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.security?.newPassword || 'Mật khẩu mới'}</label>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.security?.confirmPassword || 'Xác nhận mật khẩu'}</label>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold" placeholder="••••••••" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                    <button onClick={handleSave} className="w-full py-4 bg-primary text-slate-950 font-black rounded-2xl mt-4">Cập nhật mật khẩu</button>
                                    <button onClick={() => setActiveTabMobile('none')} className="w-full py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl mt-2">Quay lại</button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-center mb-6">
                                        <div className="relative" onClick={() => setIsAvatarOpen(true)}>
                                            <div
                                                className="size-24 rounded-full bg-center bg-cover border-2 border-primary cursor-pointer active:scale-95 transition-transform"
                                                style={{ backgroundImage: `url("${currentAvatar}")` }}
                                            ></div>
                                            <div className="absolute -bottom-1 -right-1 bg-primary text-slate-950 size-8 rounded-full flex items-center justify-center shadow-lg">
                                                <span className="material-symbols-outlined text-lg font-bold">edit</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.profile?.fullName || 'Họ và tên'}</label>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nhập họ tên" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Email</label>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-slate-500 font-bold" type="email" value={user?.email} readOnly />
                                    </div>
                                    <button onClick={handleSave} className="w-full py-4 bg-primary text-slate-950 font-black rounded-2xl mt-4">Lưu thay đổi</button>
                                    <button onClick={() => setActiveTabMobile('none')} className="w-full py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl mt-2">Quay lại</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* DESKTOP VIEW - EXACT MATCH to personal_attendance_stats_2 */}
            <div
                className="flex flex-row gap-8 items-start p-10 w-full h-screen overflow-y-auto relative desktop-only-view hide-scrollbar"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                } as React.CSSProperties}
            >
                {/* Sticky Sidebar Navigation */}
                <aside className="w-64 shrink-0 sticky top-24 self-start">
                    <nav className="flex flex-col gap-1 p-2 bg-card rounded-2xl border border-border shadow-2xl">
                        <button
                            onClick={() => scrollToSection('general')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'general' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined">person</span>
                            <span>{t.settings?.tabs?.general || 'General'}</span>
                        </button>
                        <button
                            onClick={() => scrollToSection('security')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'security' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined">security</span>
                            <span>{t.settings?.tabs?.security || 'Security'}</span>
                        </button>
                        <button
                            onClick={() => scrollToSection('notifications')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'notifications' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            <span>{t.settings?.tabs?.notifications || 'Notifications'}</span>
                        </button>
                        <button
                            onClick={() => scrollToSection('preferences')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'preferences' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined">settings</span>
                            <span>{t.settings?.tabs?.preferences || 'Preferences'}</span>
                        </button>
                    </nav>
                </aside>

                {/* Main Content - Vertical Scrolling */}
                <div className="flex-1 flex flex-col gap-8 pb-20 w-full">

                    {/* General Section */}
                    <section ref={generalRef} data-section="general" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white">{t.settings?.profile?.title || 'Profile Settings'}</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="relative group cursor-pointer" onClick={() => setIsAvatarOpen(true)}>
                                    <div className="size-24 rounded-full bg-center bg-cover ring-4 ring-primary/20 transition-all group-hover:ring-primary/50" style={{ backgroundImage: `url("${currentAvatar}")` }}></div>
                                    <button className="absolute -bottom-1 -right-1 bg-primary text-slate-950 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm block">edit</span></button>
                                </div>
                                <div className="flex flex-col gap-2 text-center sm:text-left">
                                    <h4 className="text-white font-bold text-lg">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</h4>
                                    <p className="text-slate-400 text-sm">{t.settings?.profile?.avatarUpdate || 'Update your avatar and personal details'}</p>
                                    <button onClick={() => setIsAvatarOpen(true)} className="mt-1 px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors w-max mx-auto sm:mx-0">{t.settings?.profile?.changePhoto || 'Change Photo'}</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.profile?.fullName || 'Full Name'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-primary/50 transition-all font-bold" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.profile?.emailAddress || 'Email Address'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none read-only:opacity-50 font-bold" type="email" defaultValue={user?.email} readOnly />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Security Section */}
                    <section ref={securityRef} data-section="security" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white">{t.settings?.security?.title || 'Security'}</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.security?.newPassword || 'New Password'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:border-primary/50 transition-all font-bold" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.settings?.security?.confirmPassword || 'Confirm Password'}</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:border-primary/50 transition-all font-bold" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                            </div>

                            {/* 2FA Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="text-purple-500 size-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined">security_update_good</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Xác thực 2 bước (2FA)</p>
                                        <p className="text-slate-500 text-xs text-left">Thêm một lớp bảo mật cho tài khoản của bạn</p>
                                    </div>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section ref={notificationsRef} data-section="notifications" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white">Tùy chọn Thông báo</h3>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-primary text-xl">mail</span>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">EMAIL NOTIFICATIONS</h4>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 font-bold">Nhắc nhở Chấm công</span>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 font-bold">Thay đổi Lịch làm việc</span>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-primary text-xl">notifications_active</span>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">PUSH NOTIFICATIONS</h4>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 font-bold">Nhắc nhở Chấm công</span>
                                        <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 font-bold">Thay đổi Lịch làm việc</span>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Preferences Section */}
                    <section ref={preferencesRef} data-section="preferences" className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden scroll-mt-24">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold text-white">Cài đặt hiển thị</h3>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-primary size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined">dark_mode</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Giao diện (Theme)</p>
                                        <p className="text-slate-500 text-xs text-left">Chuyển đổi giữa giao diện Sáng và Tối</p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-500 text-xs font-bold transition-all hover:text-white">
                                        <span className="material-symbols-outlined text-sm">light_mode</span>
                                        Sáng
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-slate-950 text-xs font-black shadow-lg">
                                        <span className="material-symbols-outlined text-sm">dark_mode</span>
                                        Tối
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 mt-4">
                        <button onClick={testNotification} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">Test thông báo</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-10 py-3 rounded-xl bg-primary text-slate-950 text-sm font-black shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                            {isSaving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>

                </div>
            </div>

            <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
                <DialogContent className="bg-card border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">{t.settings?.profile?.chooseAvatar || 'Choose an Avatar'}</DialogTitle>
                        <DialogDescription className="text-slate-400">{t.settings?.profile?.chooseAvatarDesc || 'Select one of our default 3D avatars.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {AVAILABLE_AVATARS.map((avatar, idx) => (
                            <button key={idx} onClick={() => handleAvatarSelect(avatar)} className="aspect-square rounded-2xl bg-slate-800 overflow-hidden relative group hover:ring-2 hover:ring-primary transition-all">
                                <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                                {currentAvatar === avatar && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><span className="material-symbols-outlined text-white">check_circle</span></div>}
                            </button>
                        ))}
                        <div className="col-span-3 pt-4 border-t border-slate-700">
                            <label className={`flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed border-slate-600 hover:border-primary transition-all cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading ? (
                                    <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">cloud_upload</span>
                                        <span className="text-xs text-slate-300 font-bold">{t.settings?.profile?.uploadCustom || 'Upload Photo'}</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </label>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

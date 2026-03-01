'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function UpdatePasswordClient() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [msg, setMsg] = useState({ type: '', text: '' })
    const [loading, setLoading] = useState(false)
    const [hasSession, setHasSession] = useState<boolean | null>(null)

    useEffect(() => {
        let mounted = true
        const supabase = createClient()

        // Hàm kiểm tra token JWT (JWT có tuổi thọ cấu hình ở Supabase, ta ép cứng 10 phút)
        const checkTokenExpiry = (token: string | null) => {
            if (!token) return false;
            try {
                const parts = token.split('.');
                if (parts.length !== 3) return false;
                const payload = JSON.parse(atob(parts[1]));
                const iat = payload.iat;
                const now = Date.now() / 1000;
                // Nếu khoảng thời gian từ lúc tạo > 600s (10 phút) -> Hết hạn
                if (iat && (now - iat) > 600) {
                    return true; // Is expired
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        const handleSession = (session: any, accessTokenFromHash?: string) => {
            const token = session?.access_token || accessTokenFromHash;
            if (checkTokenExpiry(token)) {
                // Hết hạn 10 phút
                supabase.auth.signOut();
                if (mounted) setHasSession(false);
            } else {
                if (mounted) setHasSession(true);
            }
        }

        // Lắng nghe sự kiện auth để bắt sự kiện PASSWORD_RECOVERY hoặc SIGNED_IN
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
                handleSession(session)
            }
        })

        const checkSession = async () => {
            const { data } = await supabase.auth.getSession()
            // Nhỡ Supabase xử lý hash chậm, ta lấy JWT trực tiếp từ url
            let tokenFromHash = null
            if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
                const params = new URLSearchParams(window.location.hash.slice(1))
                tokenFromHash = params.get('access_token')
            }

            if (data.session || tokenFromHash) {
                handleSession(data.session, tokenFromHash || undefined)
            } else {
                // Chờ thêm một chút nữa
                setTimeout(async () => {
                    const { data: secondCheck } = await supabase.auth.getSession()
                    if (mounted) {
                        let secondHashToken = null
                        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
                            secondHashToken = new URLSearchParams(window.location.hash.slice(1)).get('access_token')
                        }
                        if (secondCheck.session || secondHashToken) {
                            handleSession(secondCheck.session, secondHashToken || undefined)
                        } else {
                            setHasSession(false)
                        }
                    }
                }, 2000)
            }
        }
        checkSession()

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setMsg({ type: '', text: '' })

        if (password.length < 6) { return setMsg({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' }) }
        if (password !== confirm) { return setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' }) }

        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                setMsg({ type: 'error', text: error.message })
                setLoading(false)
                return
            }

            setMsg({ type: 'success', text: 'Cập nhật thành công. Đang chuyển hướng đến đăng nhập...' })
            setTimeout(() => router.push('/login'), 1500)

        } catch (err: any) {
            setMsg({ type: 'error', text: err.message || 'Lỗi hệ thống' })
            setLoading(false)
        }
    }

    if (hasSession === null) {
        return <div className="min-h-screen bg-[#0B1120] flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
    }

    if (hasSession === false) {
        return (
            <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-rose-500/20 p-8 shadow-2xl relative overflow-hidden text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Liên kết không hợp lệ</h2>
                    <p className="text-slate-400 text-sm mb-6">Liên kết khôi phục mật khẩu đã hết hạn hoặc định dạng không chính xác. Bạn vui lòng yêu cầu gửi lại link mới.</p>
                    <Button onClick={() => router.push('/login')} className="bg-cyan-500 text-white w-full">Về trang Đăng nhập</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-16 w-16 bg-[#162032] rounded-full flex justify-center items-center border border-cyan-500/20 mb-6">
                        <Lock className="h-7 w-7 text-cyan-400" />
                    </div>

                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 mb-2">
                        Thiết lập lại mật khẩu
                    </h1>
                    <p className="text-sm text-slate-400 text-center mb-8 px-4">
                        Vui lòng nhập mật khẩu mới bảo mật cho tài khoản của bạn.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs">Mật khẩu mới</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 h-11 transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs">Xác nhận mật khẩu</Label>
                            <div className="relative">
                                <Input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    minLength={6}
                                    required
                                    className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 h-11 transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {msg.text && (
                            <div className={`p-3 rounded-lg text-sm border flex gap-2 ${msg.type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                {msg.type === 'error' ? <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
                                <span>{msg.text}</span>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-0 mt-4 rounded-xl group transition-all">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-2">Lưu mật khẩu mới <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

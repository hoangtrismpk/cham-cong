'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

export default function UpdatePasswordClient() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [msg, setMsg] = useState({ type: '', text: '' })
    const [loading, setLoading] = useState(false)
    const [hasSession, setHasSession] = useState<boolean | null>(null)

    useEffect(() => {
        // Kiểm tra xem user có session thông qua query params dạng ?code=... hoặc #access_token=... (do Supabase auto set)
        const checkSession = async () => {
            const supabase = createClient()
            const { data } = await supabase.auth.getSession()
            if (data.session) {
                setHasSession(true)
            } else {
                
                // Set timeout để fallback nếu supabase js load chậm
                setTimeout(async () => {
                    const { data: secondCheck } = await supabase.auth.getSession()
                    if (secondCheck.session) setHasSession(true)
                    else setHasSession(false)
                }, 1000)
            }
        }
        checkSession()
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
                            <Input
                                type="password"
                                placeholder="Tối thiểu 6 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                required
                                className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 h-11 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs">Xác nhận mật khẩu</Label>
                            <Input
                                type="password"
                                placeholder="Nhập lại mật khẩu mới"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                minLength={6}
                                required
                                className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 h-11 transition-colors"
                            />
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { updatePasswordAndClearFlag } from './actions'

export default function ForcePasswordClient({ userEmail }: { userEmail: string }) {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [msg, setMsg] = useState({ type: '', text: '' })
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setMsg({ type: '', text: '' })

        if (password.length < 6) {
            setMsg({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' })
            return
        }

        if (password !== confirm) {
            setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })
            return
        }

        setLoading(true)

        try {
            // Cập nhật mk qua Supabase Auth
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                setMsg({ type: 'error', text: error.message })
                setLoading(false)
                return
            }

            // Gọi server action để cập nhật `require_password_change` thành FALSE
            const res = await updatePasswordAndClearFlag()
            if (!res.success) {
                setMsg({ type: 'error', text: res.message || 'Lỗi cập nhật CSDL' })
                setLoading(false)
                return
            }

            setMsg({ type: 'success', text: 'Cập nhật thành công. Đang chuyển hướng...' })

            // Redirect về trang chủ bằng hard navigation để xóa cache hoàn toàn
            setTimeout(() => {
                window.location.href = '/'
            }, 1000)

        } catch (err: any) {
            setMsg({ type: 'error', text: err.message || 'Lỗi hệ thống' })
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-16 w-16 bg-[#162032] rounded-full flex justify-center items-center border border-cyan-500/20 mb-6 relative">
                        <Lock className="h-7 w-7 text-cyan-400" />
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500" />
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 mb-2">
                        Thiết lập bảo mật
                    </h1>
                    <p className="text-sm text-slate-400 text-center mb-8 px-4 leading-relaxed">
                        Bạn đang đăng nhập lần đầu vào tài khoản <strong className="text-slate-300 font-medium">{userEmail}</strong>. Để bảo mật thông tin, bạn bắt buộc phải tạo mật khẩu mới.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs font-medium pl-1">Mật khẩu mới</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500/50 h-11 transition-colors pr-10"
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
                            <Label className="text-slate-300 text-xs font-medium pl-1">Xác nhận mật khẩu</Label>
                            <div className="relative">
                                <Input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    minLength={6}
                                    required
                                    className="bg-[#0B1120] border-slate-700/50 hover:border-slate-600 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500/50 h-11 transition-colors pr-10"
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
                            <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm border ${msg.type === 'error'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                {msg.type === 'error' ? (
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                )}
                                <span className="flex-1 leading-snug">{msg.text}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !password || !confirm}
                            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white border-0 shadow-lg shadow-cyan-500/20 transition-all font-medium rounded-xl group mt-2"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    Cập nhật mật khẩu
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Được bảo mật an toàn
            </p>
        </div>
    )
}

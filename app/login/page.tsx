'use client'

import { useActionState, useState, startTransition } from 'react'
import { login } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, null)
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { executeRecaptcha } = useGoogleReCaptcha()

    const handleFormSubmit = async (formData: FormData) => {
        if (!executeRecaptcha) {
            console.warn('Recaptcha not ready - proceeding without token')
            formAction(formData)
            return
        }
        const token = await executeRecaptcha('login')
        formData.append('g-recaptcha-response', token)
        // Wrapp in startTransition because we are in an async handler
        startTransition(() => {
            formAction(formData)
        })
    }

    return (
        <div className="min-h-screen flex flex-col font-display bg-charcoal text-slate-300">
            {/* TopNavBar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-charcoal-border bg-charcoal/80 backdrop-blur-md px-6 md:px-20 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="size-8 text-primary relative">
                        {/* <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"> ... </svg> */}
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Chấm Công FHB Vietnam</h2>
                </div>
            </header>

            <main className="relative flex-1 flex flex-col items-center justify-center p-6 bg-charcoal overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-pattern pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-[460px] flex flex-col bg-charcoal-light/60 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl border border-charcoal-border">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
                            <span className="material-symbols-outlined text-primary text-[28px]">lock_open</span>
                        </div>
                        <h1 className="text-white tracking-tight text-3xl font-bold pb-2">Chào mừng trở lại</h1>
                        <p className="text-slate-400 text-base font-normal">Đăng nhập để quản lý giờ làm việc và lịch trình của bạn.</p>
                    </div>

                    <form action={handleFormSubmit} className="flex flex-col gap-5">
                        {state?.error && (
                            <div className="p-3 text-sm text-red-500 bg-red-900/10 border border-red-500/20 rounded-lg">
                                {state.error}
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="text-slate-200 text-sm font-semibold ml-1">Địa chỉ Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                className="flex w-full rounded-xl text-white focus:outline-0 focus:ring-0 border border-charcoal-border bg-charcoal/50 focus:border-primary h-14 placeholder:text-slate-600 px-5 text-base font-normal transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center px-1">
                                <Label htmlFor="password" className="text-slate-200 text-sm font-semibold">Mật khẩu</Label>
                            </div>
                            <div className="relative flex items-center group">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="flex w-full rounded-xl text-white focus:outline-0 focus:ring-0 border border-charcoal-border bg-charcoal/50 focus:border-primary h-14 placeholder:text-slate-600 px-5 text-base font-normal transition-all pr-12"
                                />
                                <div
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 text-slate-500 hover:text-primary cursor-pointer transition-colors"
                                >
                                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-1 px-1">
                            <div className="flex items-center gap-3">
                                <input id="remember" name="remember" type="checkbox" className="w-5 h-5 text-primary bg-charcoal/50 border-charcoal-border rounded focus:ring-primary focus:ring-offset-charcoal transition-all" />
                                <label htmlFor="remember" className="text-sm font-medium text-slate-400 select-none cursor-pointer">Duy trì đăng nhập 30 ngày</label>
                            </div>
                            <a className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors" href="#">Quên mật khẩu?</a>
                        </div>
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full flex items-center justify-center rounded-xl bg-primary hover:bg-primary-dark active:scale-[0.98] text-charcoal font-bold text-base h-14 transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]"
                            >
                                {isPending ? 'Đang đăng nhập...' : 'Đăng nhập vào hệ thống'}
                            </Button>
                        </div>
                    </form>

                    <p className="text-center pt-8 text-sm text-slate-500">
                        Chưa có tài khoản? <a className="text-primary font-bold hover:underline" href="#">Liên hệ HR</a>
                    </p>
                </div>
            </main>

            <footer className="p-8 text-center bg-charcoal border-t border-charcoal-border">
                <p className="text-xs text-slate-600 mb-2">© {new Date().getFullYear()} - Hệ thống chấm công được xây dựng bởi FHB Vietnam</p>
                <div className="flex justify-center gap-6">
                    <a className="text-xs text-slate-500 hover:text-primary transition-colors" href="#">Chính sách bảo mật</a>
                    <a className="text-xs text-slate-500 hover:text-primary transition-colors" href="#">Điều khoản sử dụng</a>
                    <a className="text-xs text-slate-500 hover:text-primary transition-colors" href="#">Bảo mật</a>
                </div>
            </footer>
        </div>
    )
}

export default function LoginPage() {
    return <LoginForm />
}

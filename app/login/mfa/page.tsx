'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function MFAForm() {
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [factorId, setFactorId] = useState('')
    const [challengeId, setChallengeId] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()
    const nextPath = searchParams.get('next') || '/'

    const supabase = createClient()

    useEffect(() => {
        const initMFA = async () => {
            const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors()
            if (mfaError || !factors) {
                setError('Không thể lấy thông tin xác thực')
                return
            }

            const totpFactor = factors.totp[0]
            if (!totpFactor) {
                setError('Bạn chưa thiết lập 2FA')
                return
            }

            setFactorId(totpFactor.id)

            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
            if (challengeError || !challenge) {
                setError('Không thể tạo mã xác thực')
                return
            }

            setChallengeId(challenge.id)
        }

        initMFA()
    }, [supabase])

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId,
                code
            })

            if (verifyError) {
                throw new Error('Mã xác thực không đúng. Hoặc đã hết hạn.')
            }

            // check admin and redirect appropriately
            const { data: { user } } = await supabase.auth.getUser()
            if (user && nextPath === '/') {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, roles(name)')
                    .eq('id', user.id)
                    .single()

                const isAdmin = profile?.role === 'admin' || (profile?.roles as any)?.name === 'admin'
                if (isAdmin) {
                    router.push('/admin')
                    router.refresh()
                    return
                }
            }

            router.push(nextPath)
            router.refresh()

        } catch (err: any) {
            setError(err.message || 'Mã xác thực không đúng')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-charcoal text-slate-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md bg-charcoal-light/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-charcoal-border">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-[28px]">shield_person</span>
                    </div>
                    <h1 className="text-white tracking-tight text-3xl font-bold pb-2">Xác thực 2 bước</h1>
                    <p className="text-slate-400 text-base font-normal">Mở ứng dụng Authenticator và nhập mã số để tiếp tục.</p>
                </div>

                <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-900/10 border border-red-500/20 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <Input
                            type="text"
                            placeholder="Nhập mã xác thực (VD: 123456)"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center font-bold tracking-widest text-lg h-14 bg-charcoal/50 border-charcoal-border text-white focus:border-primary focus:ring-1 focus:ring-primary rounded-xl"
                            autoFocus
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading || code.length !== 6 || !challengeId}
                        className="w-full flex items-center justify-center rounded-xl bg-primary hover:bg-primary-dark active:scale-[0.98] text-charcoal font-bold text-base h-14 transition-all"
                    >
                        {isLoading ? 'Đang xác thực...' : 'Xác thực'}
                    </Button>
                    <div className="text-center mt-2">
                        <a href="/login" className="text-slate-400 text-sm hover:text-primary transition-colors">Quay lại đăng nhập</a>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function MFAPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-charcoal flex items-center justify-center text-primary italic">Loading...</div>}>
            <MFAForm />
        </Suspense>
    )
}

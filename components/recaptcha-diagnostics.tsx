'use client'

import { useState } from 'react'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { verifyRecaptchaConfig } from '@/app/actions/security'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Activity } from 'lucide-react'

interface DiagnosticsProps {
    siteKey: string
    enabled: boolean
}

function DiagnosticsTest({ enabled }: { enabled: boolean }) {
    const { executeRecaptcha } = useGoogleReCaptcha()
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const runTest = async () => {
        if (!executeRecaptcha) {
            setError('reCAPTCHA script not loaded yet.')
            setStatus('failed')
            return
        }

        setStatus('testing')
        setError(null)

        try {
            console.log('--- Client Test Start ---')
            const token = await executeRecaptcha('diagnostics_test')

            if (!token) {
                throw new Error('No token generated from Google.')
            }

            // Call server action to verify with DB secret
            const verify = await verifyRecaptchaConfig('', token)

            if (verify.success) {
                setResult(verify)
                setStatus('success')
            } else {
                setError(verify.error || null)
                setStatus('failed')
            }
        } catch (err: any) {
            setError(err.message || 'Unknown error during test.')
            setStatus('failed')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                    <Activity className={`h-5 w-5 ${enabled ? 'text-green-400' : 'text-slate-500'}`} />
                    <div>
                        <p className="font-medium text-white">Live Connection Test</p>
                        <p className="text-xs text-slate-400">Verify if your keys can generate a valid Google Token.</p>
                    </div>
                </div>
                <Button
                    onClick={runTest}
                    disabled={status === 'testing' || !enabled}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {status === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Test'}
                </Button>
            </div>

            {status !== 'idle' && (
                <div className={`p-4 rounded-lg border ${status === 'success' ? 'bg-green-900/20 border-green-500/50' :
                    status === 'failed' ? 'bg-red-900/20 border-red-500/50' :
                        'bg-blue-900/20 border-blue-500/50'
                    }`}>
                    {status === 'testing' && (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                            <span className="text-blue-300">Contacting Google reCAPTCHA APIs...</span>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex items-start gap-4">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            <div>
                                <h3 className="text-green-400 font-bold">Success! Your config is valid.</h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    Google Score: <span className="text-green-400 font-bold">{result?.score || '0.9'}</span>
                                    {(result?.score || 0) > 0.7 ? ' (Human verified)' : ' (Low score, might be bot)'}
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="flex items-start gap-4">
                            <XCircle className="h-6 w-6 text-red-500" />
                            <div>
                                <h3 className="text-red-400 font-bold">Test Failed</h3>
                                <p className="text-slate-400 text-xs mt-1">{error}</p>
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    Tip: Ensure your current domain is added to valid domains in reCAPTCHA Admin Console.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function RecaptchaDiagnostics({ siteKey, enabled }: DiagnosticsProps) {
    if (!enabled) {
        return (
            <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
                <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 font-medium">reCAPTCHA is currently DISABLED</p>
                <p className="text-xs text-slate-500 mt-1">Enable it in Admin &gt; Security to test connectivity.</p>
            </div>
        )
    }

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={siteKey}
            language="vi"
            scriptProps={{
                async: true,
                defer: true,
                appendTo: "head",
                id: "recaptcha-diag-script"
            }}
        >
            <DiagnosticsTest enabled={enabled} />
        </GoogleReCaptchaProvider>
    )
}

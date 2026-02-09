'use client'

import { useEffect, useRef } from 'react'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'

function Tester({ onToken, onError }: { onToken: (token: string) => void, onError: (err: any) => void }) {
    const { executeRecaptcha } = useGoogleReCaptcha()
    const hasExecuted = useRef(false)

    useEffect(() => {
        // Chỉ chạy một lần khi executeRecaptcha đã sẵn sàng
        if (!executeRecaptcha || hasExecuted.current) return

        const runTest = async () => {
            hasExecuted.current = true

            // Chờ 1.5 giây để Google Script kịp đăng ký Site Key mới 
            // Điều này giúp tránh lỗi "Cannot read properties of undefined" do race condition
            await new Promise(resolve => setTimeout(resolve, 1500))

            try {
                console.log('--- Recaptcha Verification Start ---')
                const token = await executeRecaptcha('admin_verify')

                if (token) {
                    console.log('Recaptcha token generated successfully')
                    onToken(token)
                } else {
                    onError('Google không trả về token. Vui lòng kiểm tra lại Site Key.')
                }
            } catch (e: any) {
                console.error('Recaptcha execution error:', e)
                // Thông báo lỗi thân thiện hơn
                const errorMsg = e.message || ''
                if (errorMsg.includes('undefined') || errorMsg.includes('reading')) {
                    onError('Site Key không hợp lệ hoặc không thể kết nối tới Google API.')
                } else {
                    onError(e.message || 'Lỗi thực thi reCAPTCHA.')
                }
            }
        }

        runTest()
    }, [executeRecaptcha, onToken, onError])

    return (
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none opacity-50">
            <div className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700">
                Checking Key...
            </div>
        </div>
    )
}

export function RecaptchaTester({ siteKey, onToken, onError }: { siteKey: string, onToken: (token: string) => void, onError: (err: any) => void }) {
    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={siteKey}
            useEnterprise={false}
            language="vi"
            scriptProps={{
                async: true,
                defer: true,
                appendTo: "head"
            }}
        >
            <Tester onToken={onToken} onError={onError} />
        </GoogleReCaptchaProvider>
    )
}

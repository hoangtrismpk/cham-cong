'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

const recaptchaScriptProps = {
    async: false,
    defer: false,
    appendTo: "head" as const,
    nonce: undefined,
}

export function RecaptchaProvider({ children, siteKey, enabled = true }: { children: React.ReactNode, siteKey?: string, enabled?: boolean }) {
    if (!enabled) {
        return <>{children}</>
    }

    const key = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={key}
            scriptProps={recaptchaScriptProps}
        >
            {children}
        </GoogleReCaptchaProvider>
    )
}

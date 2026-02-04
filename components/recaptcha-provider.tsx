'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

const recaptchaScriptProps = {
    async: false,
    defer: false,
    appendTo: "head" as const,
    nonce: undefined,
}

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
            scriptProps={recaptchaScriptProps}
        >
            {children}
        </GoogleReCaptchaProvider>
    )
}

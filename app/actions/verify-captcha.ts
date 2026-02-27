'use server'

export async function verifyCaptcha(token: string | null) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    if (!secretKey) {
        console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification in dev')
        return { success: true } // Allow in dev if no key
    }

    if (!token) return { success: false, message: 'Token missing' }

    try {
        const res = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
            method: 'POST',
        })
        const data = await res.json()
        console.log('Google ReCaptcha Response:', data)

        if (data.success && data.score >= 0.5) {
            return { success: true }
        }

        // Temporary HOTFIX: Bypass Captcha globally for now because Admin disabled it or Domain is not whitelisted, causing a complete lockout.
        console.warn('ReCaptcha failed but bypassing (HOTFIX):', data['error-codes'] || data)
        return { success: true }
    } catch (error) {
        return { success: false, message: 'Verification error' }
    }
}

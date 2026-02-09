'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Verify a recaptcha token with a provided secret key (used for testing in Admin)
 */
export async function verifyRecaptchaConfig(secretKey: string, token: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Logic: If secretKey is empty, we try to fetch from DB (the currently saved one)
    let actualSecret = secretKey
    if (!actualSecret) {
        const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'recaptcha_secret_key')
            .single()

        if (data) {
            try {
                actualSecret = JSON.parse(data.value)
            } catch {
                actualSecret = data.value
            }
        }
    }

    if (!actualSecret) {
        return { success: false, error: 'Secret Key is missing.' }
    }

    try {
        const params = new URLSearchParams({
            secret: actualSecret,
            response: token
        })

        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        const data = await res.json()
        console.log('[Recaptcha Verify Raw Output]:', data)

        if (data.success) {
            return { success: true, score: data.score, action: data.action }
        } else {
            const errorCodes = data['error-codes'] || []
            let customMsg = 'Xác thực thất bại từ Google.'

            if (errorCodes.includes('invalid-input-secret')) customMsg = 'Secret Key không hợp lệ.'
            if (errorCodes.includes('invalid-input-response')) customMsg = 'Token không hợp lệ (hết hạn hoặc dùng lại).'
            if (errorCodes.includes('browser-error')) customMsg = 'Lỗi trình duyệt hoặc Domain chưa được cấp phép (Whitelist).'

            return {
                success: false,
                error: customMsg,
                rawCodes: errorCodes
            }
        }
    } catch (error) {
        return { success: false, error: 'Không thể kết nối tới máy chủ Google.' }
    }
}

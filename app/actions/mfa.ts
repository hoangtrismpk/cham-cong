'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Enrolls the user in TOTP multi-factor authentication.
 * Returns the QR code SVG and the secret.
 */
export async function enrollMFA() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
    })

    if (error) {
        throw new Error(error.message)
    }

    return {
        id: data.id,
        type: data.type,
        totp: data.totp, // Access totp properties: qr_code, secret, uri
    }
}

/**
 * Challenges access for an enrolled factor.
 * Returns the challenge ID.
 */
export async function challengeMFA(factorId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
    })

    if (error) {
        throw new Error(error.message)
    }

    return {
        id: data.id,
        expiresAt: data.expires_at,
    }
}

/**
 * Verifies a challenge with the code provided by the user.
 * Activates the factor if successful.
 */
export async function verifyMFA(factorId: string, challengeId: string, code: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
    })

    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}

/**
 * Unenrolls a generic factor.
 */
export async function unenrollMFA(factorId: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.mfa.unenroll({
        factorId,
    })

    if (error) {
        throw new Error(error.message)
    }

    return { success: true }
}

/**
 * Check if the user has any enrolled factors.
 */
export async function getMFAFactors() {
    const supabase = await createClient()

    // Get assured factors from session if available, or list from auth api
    const { data, error } = await supabase.auth.mfa.listFactors()

    if (error) {
        throw new Error(error.message)
    }

    // Return verified factors only
    return data.all
}

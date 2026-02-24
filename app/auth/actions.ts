'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { verifyCaptcha } from '@/app/actions/verify-captcha'

export async function login(previousState: any, formData: FormData) {
    const remember = formData.get('remember') === 'on'
    const token = formData.get('g-recaptcha-response') as string

    const captchaRes = await verifyCaptcha(token)
    if (!captchaRes.success) {
        return { error: 'Phát hiện truy cập bất thường (Captcha Failed)' }
    }

    const supabase = await createClient({ forceSession: !remember })

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const nextPath = formData.get('next') as string || '/'

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'Email hoặc mật khẩu không chính xác' }
        }
        return { error: error.message }
    }

    // Check if MFA is required
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (mfaData && mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        const query = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''
        redirect(`/login/mfa${query}`)
    }

    // Smart Redirect Logic
    if (user) {
        // If there's a specific 'next' path (like /admin), use it
        if (nextPath !== '/') {
            revalidatePath(nextPath, 'layout')
            redirect(nextPath)
        }

        // Otherwise, check role to decide destination
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, roles(name)')
            .eq('id', user.id)
            .single()

        const isAdmin = profile?.role === 'admin' || (profile?.roles as any)?.name === 'admin'

        if (isAdmin) {
            revalidatePath('/admin', 'layout')
            redirect('/admin')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

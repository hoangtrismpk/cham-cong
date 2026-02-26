import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ForcePasswordClient from './client'

export const metadata = {
    title: 'Đổi mật khẩu | Lần đầu đăng nhập',
}

export default async function ForcePasswordPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('require_password_change')
        .eq('id', user.id)
        .single()

    // Nếu không có yêu cầu đổi mật khẩu thì quay về dashboard
    if (!profile?.require_password_change) {
        redirect('/')
    }

    return <ForcePasswordClient userEmail={user.email || ''} />
}

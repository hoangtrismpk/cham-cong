'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePasswordAndClearFlag() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, message: 'Chưa đăng nhập' }

        const { error } = await supabase
            .from('profiles')
            .update({ require_password_change: false })
            .eq('id', user.id)

        if (error) throw error

        // Xóa cache của layout để điều hướng mới sẽ nhận state đúng
        revalidatePath('/', 'layout')

        return { success: true }
    } catch (err: any) {
        console.error('Update password flag error:', err)
        return { success: false, message: err.message }
    }
}

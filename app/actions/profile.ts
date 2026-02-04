'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDepartmentMemberCount() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return 0

    // 1. Get current user's profile to find their department
    const { data: profile } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.department) return 0

    // 2. Count users in that department
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('department', profile.department)

    if (error) {
        console.error('Error fetching department count:', error)
        return 0
    }

    return count || 0
}

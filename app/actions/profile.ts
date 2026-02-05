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

export async function updateAutoCheckInSetting(enabled: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ auto_checkin_enabled: enabled })
        .eq('id', user.id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function getAutoCheckInSetting() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
        .from('profiles')
        .select('auto_checkin_enabled')
        .eq('id', user.id)
        .single()

    return data?.auto_checkin_enabled || false
}

export async function updateAutoCheckOutSetting(enabled: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ auto_checkout_enabled: enabled })
        .eq('id', user.id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function getAutoCheckOutSetting() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
        .from('profiles')
        .select('auto_checkout_enabled')
        .eq('id', user.id)
        .single()

    return data?.auto_checkout_enabled || false
}

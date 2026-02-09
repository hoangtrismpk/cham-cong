'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Use type from employees.ts to ensure consistency
import { Employee } from './employees'

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

// FULL PROFILE MANAGEMENT FOR USER
export async function getMyProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            address,
            city,
            employee_code,
            job_title,
            department,
            avatar_url,
            role_id,
            status,
            dob,
            gender,
            start_date,
            skills,
            emergency_contact,
            created_at,
            roles (
                name,
                display_name,
                permissions
            )
        `)
        .eq('id', user.id)
        .single()

    if (error) {
        console.error('Error fetching my profile:', error)
        return { error: error.message }
    }

    // Transform data match Employee type
    const profile = {
        ...data,
        role_name: (data.roles as any)?.display_name || 'Thành viên',
        skills: data.skills || [],
        emergency_contact: data.emergency_contact || { name: '', relationship: '', phone: '' }
    }

    return { profile }
}
export async function updateMyProfile(formData: {
    first_name: string
    last_name: string
    phone?: string
    address?: string
    city?: string
    dob?: string
    gender?: 'Male' | 'Female' | 'Other'
    emergency_contact?: any
    skills?: string[]
    avatar_url?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Only allow updating personal fields. 
    // Sensitive fields like role, salary, job_title are NOT updated here.
    const { error } = await supabase
        .from('profiles')
        .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: `${formData.first_name} ${formData.last_name}`,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            dob: formData.dob || null,
            gender: formData.gender || null,
            emergency_contact: formData.emergency_contact || null,
            skills: formData.skills || null,
            avatar_url: formData.avatar_url || undefined // Add avatar_url to sync
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating my profile:', error)
        return { error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}

export async function updateMyAvatar(url: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath('/settings')
    revalidatePath('/admin/employees')
    return { success: true }
}

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

export async function getPushNotificationSetting() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return true // Default: enabled

    const { data } = await supabase
        .from('profiles')
        .select('push_enabled')
        .eq('id', user.id)
        .single()

    // Default to true if column doesn't exist yet
    return data?.push_enabled ?? true
}

export async function updatePushNotificationSetting(enabled: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ push_enabled: enabled })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    // If disabling, also remove all FCM tokens for this user
    if (!enabled) {
        await supabase
            .from('fcm_tokens')
            .delete()
            .eq('user_id', user.id)
    }

    return { success: true }
}

export async function getClockSettings() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {
        clockInRemindMinutes: 5,
        clockOutRemindMode: 'before' as const,
        clockOutRemindMinutes: 5
    }

    const { data } = await supabase
        .from('profiles')
        .select('clock_in_remind_minutes, clock_out_remind_mode, clock_out_remind_minutes')
        .eq('id', user.id)
        .single()

    return {
        clockInRemindMinutes: data?.clock_in_remind_minutes ?? 5,
        clockOutRemindMode: (data?.clock_out_remind_mode ?? 'before') as 'before' | 'after',
        clockOutRemindMinutes: data?.clock_out_remind_minutes ?? 5
    }
}

export async function updateClockInSettings(remindMinutes: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Clamp value
    const clamped = Math.max(1, Math.min(30, remindMinutes))

    const { error } = await supabase
        .from('profiles')
        .update({ clock_in_remind_minutes: clamped })
        .eq('id', user.id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function updateClockOutSettings(mode: 'before' | 'after', remindMinutes: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Clamp value
    const clamped = Math.max(1, Math.min(10, remindMinutes))

    const { error } = await supabase
        .from('profiles')
        .update({
            clock_out_remind_mode: mode,
            clock_out_remind_minutes: clamped
        })
        .eq('id', user.id)

    if (error) throw new Error(error.message)
    return { success: true }
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
    const roles = data.roles as any
    const roleData = Array.isArray(roles) ? roles[0] : roles

    const profile = {
        ...data,
        role_name: roleData?.display_name || 'Thành viên',
        permissions: roleData?.permissions || [],
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
    email?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // If email is provided and different from current user's email, update in auth.users
    if (formData.email && formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
            email: formData.email,
            data: { request_origin: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL }
        })
        if (emailError) {
            console.error('Error updating auth email:', emailError)
            return { error: 'Lỗi cập nhật email: Email có thể đã được sử dụng hoặc không hợp lệ.' }
        }
    }

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
            email: formData.email || undefined,
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

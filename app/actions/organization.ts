'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface OrganizationSettings {
    departments: string[]
    job_titles: string[]
}

const SETTING_KEY = 'organization_config'

// Get organization settings
export async function getOrganizationSettings(): Promise<OrganizationSettings> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', SETTING_KEY)
        .single()

    if (error || !data) {
        // Return default structure if not found
        return {
            departments: [],
            job_titles: []
        }
    }

    return data.setting_value as OrganizationSettings
}

// Update organization settings
export async function updateOrganizationSettings(settings: OrganizationSettings) {
    // Check if user is admin permission logic
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Use admin client to write to settings
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
        .from('settings')
        .upsert({
            setting_key: SETTING_KEY,
            setting_value: settings
        }, { onConflict: 'setting_key' })

    if (error) {
        console.error('Error saving organization settings:', error)
        return { error: 'Failed to save settings' }
    }

    revalidatePath('/admin/settings/organization')
    return { success: true }
}

// Scan existing profiles and merge into settings
export async function syncWithExistingData() {
    // Check permissions
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Get current settings
    const currentSettings = await getOrganizationSettings()

    // 2. Get distinct departments & titles from profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('department, job_title')

    if (error) {
        return { error: 'Failed to scan profiles' }
    }

    // Using Set to ensure uniqueness
    const existingDepts = new Set(currentSettings.departments)
    const existingTitles = new Set(currentSettings.job_titles)

    let addedDepts = 0
    let addedTitles = 0

    profiles?.forEach(p => {
        if (p.department && p.department.trim()) {
            const d = p.department.trim()
            if (!existingDepts.has(d)) {
                existingDepts.add(d)
                addedDepts++
            }
        }
        if (p.job_title && p.job_title.trim()) {
            const t = p.job_title.trim()
            if (!existingTitles.has(t)) {
                existingTitles.add(t)
                addedTitles++
            }
        }
    })

    if (addedDepts === 0 && addedTitles === 0) {
        return { success: true, message: 'Dữ liệu đã đồng bộ, không tìm thấy mục mới nào.' }
    }

    // 3. Save merged list
    const newSettings: OrganizationSettings = {
        departments: Array.from(existingDepts).sort(),
        job_titles: Array.from(existingTitles).sort()
    }

    const supabaseAdmin = createAdminClient()

    const { error: saveError } = await supabaseAdmin
        .from('settings')
        .upsert({
            setting_key: SETTING_KEY,
            setting_value: newSettings
        }, { onConflict: 'setting_key' })

    if (saveError) {
        console.error('Error syncing settings:', saveError)
        return { error: 'Failed to save synced data' }
    }

    revalidatePath('/admin/settings/organization')
    return {
        success: true,
        message: `Đã tìm thấy thêm ${addedDepts} phòng ban và ${addedTitles} chức vụ từ hồ sơ nhân viên.`
    }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from './audit-logs'

// Get detected public IP of the current user
export async function getDetectedIp(): Promise<string> {
    const headerList = await headers()
    const forwardedFor = headerList.get('x-forwarded-for')
    const realIp = headerList.get('x-real-ip')
    const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown')
    return userIp
}

// Type definitions
export interface SystemSetting {
    key: string
    value: string
    category: string
    subcategory: string | null
    description: string | null
    updated_at: string
    updated_by: string | null
}

// Get all settings or filter by category
export async function getSettings(category?: string): Promise<Record<string, unknown>> {
    const supabase = await createClient()

    let query = supabase.from('system_settings').select('*')

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching settings:', error)
        throw new Error('Failed to fetch settings')
    }

    // Convert array to object for easy access
    const settings: Record<string, unknown> = {}
    for (const setting of data || []) {
        try {
            settings[setting.key] = JSON.parse(setting.value)
        } catch {
            settings[setting.key] = setting.value
        }
    }

    return settings
}

// Get raw settings with metadata
export async function getSettingsWithMeta(category?: string): Promise<SystemSetting[]> {
    const supabase = await createClient()

    let query = supabase.from('system_settings').select('*').order('subcategory')

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching settings:', error)
        throw new Error('Failed to fetch settings')
    }

    return data || []
}

// Update a single setting
export async function updateSetting(key: string, value: unknown): Promise<{ success: boolean }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    // Get old value for audit
    const { data: oldSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single()

    const { error } = await supabase
        .from('system_settings')
        .update({
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
            updated_by: user.id
        })
        .eq('key', key)

    if (error) {
        console.error('Error updating setting:', error)
        throw new Error('Failed to update setting')
    }

    // AuditLog
    await createAuditLog({
        action: 'UPDATE',
        resourceType: 'setting',
        resourceId: key,
        description: `Cập nhật cấu hình: ${key}`,
        oldValues: oldSetting ? { [key]: JSON.parse(oldSetting.value) } : null,
        newValues: { [key]: value }
    })

    revalidatePath('/admin/settings')
    revalidatePath('/admin/employees')
    revalidatePath('/schedule')
    return { success: true }
}

// Bulk update multiple settings
export async function updateSettings(updates: { key: string; value: unknown }[]): Promise<{ success: boolean }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    // Get old values for audit
    const keys = updates.map(u => u.key)
    const { data: oldSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', keys)

    const oldValuesMap: Record<string, any> = {}
    oldSettings?.forEach(setting => {
        try {
            oldValuesMap[setting.key] = JSON.parse(setting.value)
        } catch {
            oldValuesMap[setting.key] = setting.value
        }
    })

    const newValuesMap: Record<string, any> = {}

    // Update each setting
    for (const { key, value } of updates) {
        newValuesMap[key] = value
        const { error } = await supabase
            .from('system_settings')
            .update({
                value: JSON.stringify(value),
                updated_at: new Date().toISOString(),
                updated_by: user.id
            })
            .eq('key', key)

        if (error) {
            console.error(`Error updating setting ${key}:`, error)
            throw new Error(`Failed to update setting: ${key}`)
        }
    }

    // AuditLog
    await createAuditLog({
        action: 'UPDATE',
        resourceType: 'setting',
        description: `Cập nhật ${updates.length} cấu hình hệ thống`,
        oldValues: oldValuesMap,
        newValues: newValuesMap
    })

    revalidatePath('/admin/settings')
    revalidatePath('/admin/employees')
    revalidatePath('/schedule')
    return { success: true }
}

// Get settings version (for sync checking)
export async function getSettingsVersion(): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_settings')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        return new Date().toISOString()
    }

    return data?.updated_at || new Date().toISOString()
}

// Get work-related settings for user-facing features
export async function getWorkSettings(): Promise<{
    work_start_time: string
    work_end_time: string
    lunch_start_time: string
    lunch_end_time: string
    office_latitude: string
    office_longitude: string
    max_distance_meters: number
    company_name: string
    company_wifi_ip: string
    require_gps_and_wifi: boolean
    work_off_days: number[]
    allow_grace_period: boolean
    grace_period_minutes: number
}> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
            'work_start_time',
            'work_end_time',
            'lunch_start_time',
            'lunch_end_time',
            'office_latitude',
            'office_longitude',
            'max_distance_meters',
            'company_name',
            'company_wifi_ip',
            'require_gps_and_wifi',
            'work_off_days',
            'allow_grace_period',
            'grace_period_minutes'
        ])

    if (error) {
        console.error('Error fetching work settings:', error)
        // Return defaults
        return {
            work_start_time: '08:00',
            work_end_time: '17:30',
            lunch_start_time: '12:00',
            lunch_end_time: '13:00',
            office_latitude: '10.762622',
            office_longitude: '106.660172',
            max_distance_meters: 100,
            company_name: 'FHB Vietnam',
            company_wifi_ip: '14.161.22.181',
            require_gps_and_wifi: false,
            work_off_days: [6, 0],
            allow_grace_period: false,
            grace_period_minutes: 5
        }
    }

    // Parse JSONB values
    const settings: Record<string, unknown> = {}
    for (const item of data || []) {
        try {
            settings[item.key] = JSON.parse(item.value)
        } catch {
            settings[item.key] = item.value
        }
    }

    return {
        work_start_time: (settings.work_start_time as string) || '08:00',
        work_end_time: (settings.work_end_time as string) || '17:30',
        lunch_start_time: (settings.lunch_start_time as string) || '12:00',
        lunch_end_time: (settings.lunch_end_time as string) || '13:00',
        office_latitude: (settings.office_latitude as string) || '10.762622',
        office_longitude: (settings.office_longitude as string) || '106.660172',
        max_distance_meters: (settings.max_distance_meters as number) || 100,
        company_name: (settings.company_name as string) || 'FHB Vietnam',
        company_wifi_ip: (settings.company_wifi_ip as string) || '14.161.22.181',
        require_gps_and_wifi: (settings.require_gps_and_wifi as boolean) || false,
        work_off_days: (settings.work_off_days as number[]) || [6, 0],
        allow_grace_period: (settings.allow_grace_period as boolean) || false,
        grace_period_minutes: (settings.grace_period_minutes as number) || 5
    }
}

// Get Security Settings (Public)
export async function getSecuritySettings(): Promise<{
    recaptcha_enabled: boolean
    recaptcha_site_key: string
}> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['recaptcha_enabled', 'recaptcha_site_key'])

    const settings: Record<string, unknown> = {}
    for (const item of data || []) {
        try {
            settings[item.key] = JSON.parse(item.value)
        } catch {
            settings[item.key] = item.value
        }
    }

    return {
        recaptcha_enabled: (settings.recaptcha_enabled as boolean) || false,
        recaptcha_site_key: (settings.recaptcha_site_key as string) || ''
    }
}

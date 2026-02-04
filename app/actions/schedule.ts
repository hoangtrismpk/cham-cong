'use server'

import { createClient } from '@/utils/supabase/server'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'

export async function getMonthlyShifts(dateStr: string) { // YYYY-MM
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const viewDate = new Date(dateStr + '-01') // Ensure parsing as 1st of month

    // Calculate range for calendar view (week start to week end)
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', format(calendarStart, 'yyyy-MM-dd'))
        .lte('work_date', format(calendarEnd, 'yyyy-MM-dd'))

    if (error) {
        console.error('Error fetching shifts:', error)
        return {}
    }

    // Transform array to Record<string, any> map
    const shiftsMap: Record<string, any> = {}
    data?.forEach((shift) => {
        // Map DB fields to UI fields
        // UI expects: { type, time, title, location, status, colorClass, members }
        // We'll re-calculate colorClass on client side or store it? 
        // Better to re-calc to keep consistent with UI logic, BUT we can send raw and let UI map.
        // Actually, let's map generic props here.
        shiftsMap[shift.work_date] = {
            ...shift,
            type: shift.shift_type,
            time: `${shift.start_time} - ${shift.end_time}`,
            // colorClass will be handled by UI based on type/status
        }
    })

    return shiftsMap
}

export async function saveShift(shiftData: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { work_date, shift_type, start_time, end_time, location, title, status, members_count } = shiftData

    // Upsert based on (user_id, work_date)
    const { data, error } = await supabase
        .from('work_schedules')
        .upsert({
            user_id: user.id,
            work_date,
            shift_type,
            start_time,
            end_time,
            location,
            title,
            status,
            members_count
        }, { onConflict: 'user_id, work_date' })
        .select()
        .single()

    if (error) {
        console.error('Error saving shift:', error)
        return { error: error.message }
    }

    return { data }
}

export async function getTodayShift() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const todayDate = format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', todayDate)
        .single()

    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "no rows found"
            console.error('Error fetching today\'s shift:', error)
        }
        return null
    }

    return data
}

/**
 * Employee Default Schedule API
 * Handle getting and saving weekly default schedules
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Fetch default schedule
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const params = await context.params;
        const employeeId = params.id;

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('employee_default_schedules')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('is_template', true)
            .order('day_of_week', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('GET Schedule Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Save default schedule (Overwrite existing templates)
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const params = await context.params;
        const employeeId = params.id;
        const body = await request.json();
        const { schedules } = body; // Array of schedule objects

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Delete existing template schedules for this employee
        const { error: deleteError } = await supabase
            .from('employee_default_schedules')
            .delete()
            .eq('employee_id', employeeId)
            .eq('is_template', true);

        if (deleteError) throw deleteError;

        // 2. Prepare new rows
        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ success: true, message: 'Cleared schedules' });
        }

        const rowsToInsert = schedules.map((sch: any) => ({
            employee_id: employeeId,
            day_of_week: sch.day_of_week,
            shift_type: sch.shift_type,
            custom_start_time: sch.custom_start_time || null,
            custom_end_time: sch.custom_end_time || null,
            is_template: true
        }));

        // 3. Insert new schedules
        const { data, error: insertError } = await supabase
            .from('employee_default_schedules')
            .insert(rowsToInsert)
            .select();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('POST Schedule Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

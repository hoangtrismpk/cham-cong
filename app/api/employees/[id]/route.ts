/**
 * Employee API - Get/Update single employee
 * For admin to manage employee info and employment type
 * Created: 2026-02-07
 * Updated: Fix async params for Next.js 15
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/employees/[id]
 * Get employee details
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params (Next.js 15)
        const params = await context.params;
        const employeeId = params.id;

        console.log('[API] GET employee:', employeeId);

        // Get employee info
        const { data: employee, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, employment_type, role_id')
            .eq('id', employeeId)
            .single();

        if (error) {
            console.error('[API] Employee not found:', error);
            return NextResponse.json(
                { error: 'Employee not found', details: error.message },
                { status: 404 }
            );
        }

        return NextResponse.json(employee);
    } catch (error: any) {
        console.error('GET /api/employees/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/employees/[id]
 * Update employee employment type
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params (Next.js 15)
        const params = await context.params;
        const employeeId = params.id;
        const body = await request.json();
        const { employment_type } = body;

        // Validate employment type
        const validTypes = ['full-time', 'part-time', 'intern'];
        if (employment_type && !validTypes.includes(employment_type)) {
            return NextResponse.json(
                { error: 'Invalid employment type' },
                { status: 400 }
            );
        }

        // Update employee
        const { data, error } = await supabase
            .from('profiles')
            .update({ employment_type })
            .eq('id', employeeId)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('PATCH /api/employees/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

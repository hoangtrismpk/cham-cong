/**
 * Schedule Template API Routes
 * Endpoints: /api/schedule-template
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ScheduleTemplateService } from '@/lib/services/schedule-template-service';
import type { CreateScheduleTemplateRequest } from '@/types/employment';

/**
 * GET /api/schedule-template?employee_id=xxx
 * Get employee's schedule template
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const employeeId = searchParams.get('employee_id');
        const displayMode = searchParams.get('display') === 'true';

        if (!employeeId) {
            return NextResponse.json(
                { error: 'employee_id is required' },
                { status: 400 }
            );
        }

        // Check permission: user can view their own schedule, or admin/HR can view any
        if (employeeId !== user.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role_id, roles(name)')
                .eq('id', user.id)
                .single();

            const roleName = (profile as any)?.roles?.name;
            if (!['admin', 'hr'].includes(roleName)) {
                return NextResponse.json(
                    { error: 'Forbidden: You can only view your own schedule' },
                    { status: 403 }
                );
            }
        }

        // Get schedule
        let data;
        if (displayMode) {
            data = await ScheduleTemplateService.getScheduleDisplay(employeeId);
        } else {
            data = await ScheduleTemplateService.getEmployeeSchedule(employeeId);
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('GET /api/schedule-template error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/schedule-template
 * Create or update employee schedule template
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body: CreateScheduleTemplateRequest = await request.json();

        // Validate request
        const validationErrors = ScheduleTemplateService.validateScheduleRequest(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationErrors },
                { status: 400 }
            );
        }

        // Check permission: HR/admin can set any schedule
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        if (!['admin', 'hr'].includes(roleName)) {
            return NextResponse.json(
                { error: 'Forbidden: Only HR and Admin can manage schedules' },
                { status: 403 }
            );
        }

        // Create/update schedule
        const data = await ScheduleTemplateService.upsertScheduleTemplate(body);

        return NextResponse.json({
            message: 'Schedule template updated successfully',
            data
        });
    } catch (error: any) {
        console.error('POST /api/schedule-template error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/schedule-template?employee_id=xxx&day_of_week=1
 * Delete schedule for a specific day
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const employeeId = searchParams.get('employee_id');
        const dayOfWeek = searchParams.get('day_of_week');

        if (!employeeId || !dayOfWeek) {
            return NextResponse.json(
                { error: 'employee_id and day_of_week are required' },
                { status: 400 }
            );
        }

        // Check permission
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        if (!['admin', 'hr'].includes(roleName)) {
            return NextResponse.json(
                { error: 'Forbidden: Only HR and Admin can delete schedules' },
                { status: 403 }
            );
        }

        await ScheduleTemplateService.deleteScheduleForDay(
            employeeId,
            parseInt(dayOfWeek) as any
        );

        return NextResponse.json({
            message: 'Schedule deleted successfully'
        });
    } catch (error: any) {
        console.error('DELETE /api/schedule-template error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

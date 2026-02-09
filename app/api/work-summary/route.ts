/**
 * Work Summary API Routes
 * Endpoints: /api/work-summary
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { WorkSummaryCalculator } from '@/lib/services/work-summary-calculator';

/**
 * GET /api/work-summary?employee_id=xxx&date=2026-02-07
 * GET /api/work-summary?employee_id=xxx&start_date=2026-02-01&end_date=2026-02-28 (range)
 * Get work summary for an employee
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
        const employeeId = searchParams.get('employee_id') || user.id;
        const date = searchParams.get('date');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Check permission
        if (employeeId !== user.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role_id, roles(name)')
                .eq('id', user.id)
                .single();

            const roleName = (profile as any)?.roles?.name;
            if (!['admin', 'hr'].includes(roleName)) {
                return NextResponse.json(
                    { error: 'Forbidden: You can only view your own work summary' },
                    { status: 403 }
                );
            }
        }

        let data;

        if (date) {
            // Get single day summary
            data = await WorkSummaryCalculator.getDailySummary(employeeId, date);

            if (!data) {
                // Calculate if not exists
                data = await WorkSummaryCalculator.calculateAndSave(employeeId, date);
            }
        } else if (startDate && endDate) {
            // Get summary for date range
            data = await WorkSummaryCalculator.getWorkHoursSummary(
                employeeId,
                startDate,
                endDate
            );
        } else {
            return NextResponse.json(
                { error: 'Either date or start_date+end_date is required' },
                { status: 400 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('GET /api/work-summary error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/work-summary/calculate
 * Manually trigger calculation for a specific date
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

        // Only admin/HR can manually trigger calculation
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        if (!['admin', 'hr'].includes(roleName)) {
            return NextResponse.json(
                { error: 'Forbidden: Only admin and HR can trigger calculations' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { employee_id, work_date } = body;

        if (!employee_id || !work_date) {
            return NextResponse.json(
                { error: 'employee_id and work_date are required' },
                { status: 400 }
            );
        }

        // Calculate and save
        const data = await WorkSummaryCalculator.calculateAndSave(employee_id, work_date);

        return NextResponse.json({
            message: 'Work summary calculated successfully',
            data
        });
    } catch (error: any) {
        console.error('POST /api/work-summary/calculate error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

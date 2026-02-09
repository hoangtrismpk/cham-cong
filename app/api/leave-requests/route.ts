/**
 * Leave Requests API Routes
 * Endpoints: /api/leave-requests
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LeaveRequestService } from '@/lib/services/leave-request-service';
import type { CreateLeaveRequestDTO, UpdateLeaveRequestDTO } from '@/types/employment';

/**
 * GET /api/leave-requests?employee_id=xxx&status=pending
 * Get leave requests (with optional filters)
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
        const status = searchParams.get('status') as any;
        const pending = searchParams.get('pending') === 'true';

        // Get user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        const isManager = ['admin', 'hr', 'manager'].includes(roleName);

        let data;

        if (pending && isManager) {
            // Get all pending requests (for managers)
            data = await LeaveRequestService.getPendingLeaveRequests();
        } else if (employeeId) {
            // Check permission
            if (employeeId !== user.id && !isManager) {
                return NextResponse.json(
                    { error: 'Forbidden: You can only view your own leave requests' },
                    { status: 403 }
                );
            }

            data = await LeaveRequestService.getEmployeeLeaveRequests(employeeId, status);
        } else {
            // Get current user's leave requests
            data = await LeaveRequestService.getEmployeeLeaveRequests(user.id, status);
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('GET /api/leave-requests error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/leave-requests
 * Create a new leave request
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
        const body: CreateLeaveRequestDTO = await request.json();

        // Ensure employee_id matches authenticated user (unless admin/HR)
        if (body.employee_id !== user.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role_id, roles(name)')
                .eq('id', user.id)
                .single();

            const roleName = (profile as any)?.roles?.name;
            if (!['admin', 'hr'].includes(roleName)) {
                return NextResponse.json(
                    { error: 'Forbidden: You can only create leave requests for yourself' },
                    { status: 403 }
                );
            }
        }

        // Create leave request
        const data = await LeaveRequestService.createLeaveRequest(body);

        return NextResponse.json({
            message: 'Leave request created successfully',
            data
        }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/leave-requests error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

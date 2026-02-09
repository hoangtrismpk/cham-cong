/**
 * Leave Request Actions API (Approve/Reject/Cancel)
 * Endpoints: /api/leave-requests/[id]
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LeaveRequestService } from '@/lib/services/leave-request-service';
import type { UpdateLeaveRequestDTO } from '@/types/employment';

/**
 * GET /api/leave-requests/[id]
 * Get a specific leave request with employee details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const leaveRequest = await LeaveRequestService.getLeaveRequestWithEmployee(params.id);

        if (!leaveRequest) {
            return NextResponse.json(
                { error: 'Leave request not found' },
                { status: 404 }
            );
        }

        // Check permission: can view own requests or if manager
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        const isManager = ['admin', 'hr', 'manager'].includes(roleName);

        if (leaveRequest.employee_id !== user.id && !isManager) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        return NextResponse.json({ data: leaveRequest });
    } catch (error: any) {
        console.error('GET /api/leave-requests/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/leave-requests/[id]
 * Approve or reject a leave request
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Check if user is manager
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(name)')
            .eq('id', user.id)
            .single();

        const roleName = (profile as any)?.roles?.name;
        if (!['admin', 'hr', 'manager'].includes(roleName)) {
            return NextResponse.json(
                { error: 'Forbidden: Only managers can approve/reject leave requests' },
                { status: 403 }
            );
        }

        // Parse request body
        const body: UpdateLeaveRequestDTO = await request.json();
        body.approved_by = user.id; // Set approver to current user

        // Update leave request
        const data = await LeaveRequestService.updateLeaveRequest(params.id, body);

        return NextResponse.json({
            message: `Leave request ${body.status} successfully`,
            data
        });
    } catch (error: any) {
        console.error('PATCH /api/leave-requests/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/leave-requests/[id]
 * Cancel a leave request (by employee)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Cancel leave request
        const data = await LeaveRequestService.cancelLeaveRequest(params.id, user.id);

        return NextResponse.json({
            message: 'Leave request cancelled successfully',
            data
        });
    } catch (error: any) {
        console.error('DELETE /api/leave-requests/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

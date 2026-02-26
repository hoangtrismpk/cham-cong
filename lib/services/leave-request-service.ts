/**
 * Leave Request Service
 * Manages employee leave requests (submit, approve, reject)
 * Created: 2026-02-07
 */

import { createClient } from '@/utils/supabase/server';
import { EmailService } from '@/lib/email-service';
import type {
    LeaveRequest,
    LeaveRequestWithEmployee,
    CreateLeaveRequestDTO,
    UpdateLeaveRequestDTO,
    LeaveType,
    LeaveRequestStatus,
    LeaveSummary
} from '@/types/employment';
import { ScheduleTemplateService } from './schedule-template-service';

export class LeaveRequestService {
    /**
     * Create a new leave request
     */
    static async createLeaveRequest(
        request: CreateLeaveRequestDTO
    ): Promise<LeaveRequest> {
        const supabase = await createClient();

        // Validate the request
        const errors = this.validateLeaveRequest(request);
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        // Calculate duration hours
        const durationHours = await this.calculateLeaveDuration(
            request.leave_type,
            request.start_time,
            request.end_time,
            request.employee_id,
            request.leave_date
        );

        const { data, error } = await supabase
            .from('leave_requests')
            .insert({
                employee_id: request.employee_id,
                leave_date: request.leave_date,
                leave_type: request.leave_type,
                start_time: request.start_time,
                end_time: request.end_time,
                duration_hours: durationHours,
                reason: request.reason,
                image_url: request.image_url,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create leave request: ${error.message}`);
        }

        return data;
    }

    /**
     * Get leave request by ID
     */
    static async getLeaveRequest(id: string): Promise<LeaveRequest | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to fetch leave request: ${error.message}`);
        }

        return data;
    }

    /**
     * Get leave request with employee details
     */
    static async getLeaveRequestWithEmployee(
        id: string
    ): Promise<LeaveRequestWithEmployee | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
        *,
        employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, avatar_url),
        approver:profiles!leave_requests_approved_by_fkey(id, full_name)
      `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(`Failed to fetch leave request: ${error.message}`);
        }

        return data as any;
    }

    /**
     * Get all leave requests for an employee
     */
    static async getEmployeeLeaveRequests(
        employeeId: string,
        status?: LeaveRequestStatus
    ): Promise<LeaveRequest[]> {
        const supabase = await createClient();

        let query = supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .order('leave_date', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch leave requests: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get pending leave requests (for managers)
     */
    static async getPendingLeaveRequests(): Promise<LeaveRequestWithEmployee[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
        *,
        employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, avatar_url)
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch pending requests: ${error.message}`);
        }

        return data as any;
    }

    /**
     * Approve or reject a leave request
     */
    static async updateLeaveRequest(
        id: string,
        update: UpdateLeaveRequestDTO
    ): Promise<LeaveRequest> {
        const supabase = await createClient();

        // Validate
        if (update.status === 'rejected' && !update.rejection_reason) {
            throw new Error('Rejection reason is required when rejecting a leave request');
        }

        const updateData: any = {
            status: update.status,
            approved_by: update.approved_by,
            approved_at: new Date().toISOString()
        };

        if (update.rejection_reason) {
            updateData.rejection_reason = update.rejection_reason;
        }

        const { data, error } = await supabase
            .from('leave_requests')
            .update(updateData)
            .eq('id', id)
            .eq('status', 'pending') // Only update if still pending
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update leave request: ${error.message}`);
        }

        if (!data) {
            throw new Error('Leave request not found or already processed');
        }

        // Mark related daily summaries for recalculation
        await this.markSummaryForRecalculation(data.employee_id, data.leave_date);

        // Send email notification to the employee (fire-and-forget)
        this.sendLeaveStatusEmail(data, update.approved_by).catch(() => { });

        return data;
    }

    /**
     * Cancel a leave request (by employee)
     */
    static async cancelLeaveRequest(
        id: string,
        employeeId: string
    ): Promise<LeaveRequest> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('employee_id', employeeId)
            .eq('status', 'pending') // Can only cancel pending requests
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to cancel leave request: ${error.message}`);
        }

        if (!data) {
            throw new Error('Leave request not found or cannot be cancelled');
        }

        return data;
    }

    /**
     * Get leave summary for an employee
     */
    static async getEmployeeLeaveSummary(
        employeeId: string,
        startDate?: string,
        endDate?: string
    ): Promise<LeaveSummary> {
        const supabase = await createClient();

        let query = supabase
            .from('leave_requests')
            .select('status, duration_hours')
            .eq('employee_id', employeeId);

        if (startDate) {
            query = query.gte('leave_date', startDate);
        }
        if (endDate) {
            query = query.lte('leave_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch leave summary: ${error.message}`);
        }

        // Get employee name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', employeeId)
            .single();

        const summary: LeaveSummary = {
            employee_id: employeeId,
            employee_name: profile?.full_name || 'Unknown',
            total_leaves: data?.length || 0,
            pending_leaves: data?.filter(l => l.status === 'pending').length || 0,
            approved_leaves: data?.filter(l => l.status === 'approved').length || 0,
            rejected_leaves: data?.filter(l => l.status === 'rejected').length || 0,
            total_leave_hours: data
                ?.filter(l => l.status === 'approved')
                .reduce((sum, l) => sum + (l.duration_hours || 0), 0) || 0
        };

        return summary;
    }

    /**
     * Calculate leave duration in hours
     */
    static async calculateLeaveDuration(
        leaveType: LeaveType,
        startTime?: string,
        endTime?: string,
        employeeId?: string,
        leaveDate?: string
    ): Promise<number> {
        if (leaveType === 'partial') {
            if (!startTime || !endTime) {
                throw new Error('Start time and end time are required for partial leave');
            }
            return ScheduleTemplateService.calculateHours(startTime, endTime);
        }

        // For full_day, half_day_morning, half_day_afternoon, we need scheduled hours
        let scheduledHours = 8; // Default

        if (employeeId && leaveDate) {
            // Get the actual scheduled hours for this employee on this day
            const dayOfWeek = new Date(leaveDate).getDay() as any;
            const schedules = await ScheduleTemplateService.getEmployeeSchedule(employeeId);
            const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

            if (daySchedule) {
                const { hours } = ScheduleTemplateService.calculateScheduleTimes(
                    daySchedule.shift_type,
                    daySchedule.custom_start_time,
                    daySchedule.custom_end_time
                );
                scheduledHours = hours;
            }
        }

        if (leaveType === 'full_day') {
            return scheduledHours;
        }

        if (leaveType === 'half_day_morning' || leaveType === 'half_day_afternoon') {
            return scheduledHours / 2;
        }

        throw new Error(`Unknown leave type: ${leaveType}`);
    }

    /**
     * Validate leave request
     */
    static validateLeaveRequest(request: CreateLeaveRequestDTO): string[] {
        const errors: string[] = [];

        if (!request.employee_id) {
            errors.push('Employee ID is required');
        }

        if (!request.leave_date) {
            errors.push('Leave date is required');
        } else {
            const leaveDate = new Date(request.leave_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (leaveDate < today) {
                errors.push('Cannot request leave for past dates');
            }
        }

        if (!request.leave_type) {
            errors.push('Leave type is required');
        }

        if (request.leave_type === 'partial') {
            if (!request.start_time) {
                errors.push('Start time is required for partial leave');
            }
            if (!request.end_time) {
                errors.push('End time is required for partial leave');
            }
            if (request.start_time && request.end_time) {
                const start = request.start_time.split(':').map(Number);
                const end = request.end_time.split(':').map(Number);
                if (start[0] * 60 + start[1] >= end[0] * 60 + end[1]) {
                    errors.push('End time must be after start time');
                }
            }
        }

        return errors;
    }

    /**
     * Check if employee has leave on a specific date
     */
    static async hasLeaveOnDate(
        employeeId: string,
        date: string
    ): Promise<boolean> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('leave_date', date)
            .eq('status', 'approved')
            .limit(1);

        if (error) {
            throw new Error(`Failed to check leave: ${error.message}`);
        }

        return (data?.length || 0) > 0;
    }

    /**
     * Get approved leaves for a date range
     */
    static async getApprovedLeavesForDateRange(
        employeeId: string,
        startDate: string,
        endDate: string
    ): Promise<LeaveRequest[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('status', 'approved')
            .gte('leave_date', startDate)
            .lte('leave_date', endDate)
            .order('leave_date', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch leaves: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Mark daily summary for recalculation when leave status changes
     */
    private static async markSummaryForRecalculation(
        employeeId: string,
        date: string
    ): Promise<void> {
        const supabase = await createClient();

        await supabase
            .from('daily_work_summary')
            .update({ needs_recalculation: true })
            .eq('employee_id', employeeId)
            .eq('work_date', date);
    }

    /**
     * Send email notification when leave request status changes
     */
    private static async sendLeaveStatusEmail(
        leaveRequest: LeaveRequest,
        approverId?: string
    ): Promise<void> {
        try {
            const supabase = await createClient();

            // Get employee info
            const { data: employee } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', leaveRequest.employee_id)
                .single();

            if (!employee?.email) return;

            // Get approver name
            let approverName = 'Quản lý';
            if (approverId) {
                const { data: approver } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', approverId)
                    .single();
                approverName = approver?.full_name || 'Quản lý';
            }

            // Format leave type
            const leaveTypeMap: Record<string, string> = {
                'full_day': 'Nghỉ cả ngày',
                'half_day_morning': 'Nghỉ buổi sáng',
                'half_day_afternoon': 'Nghỉ buổi chiều',
                'partial': 'Nghỉ theo giờ',
            };

            const templateSlug = leaveRequest.status === 'approved' ? 'leave-approved' : 'leave-rejected';

            // Calculate total days from duration_hours
            const durationHours = leaveRequest.duration_hours || 8;
            const totalDays = durationHours >= 8
                ? Math.round(durationHours / 8 * 10) / 10
                : (durationHours / 8).toFixed(1);

            const leaveDate = new Date(leaveRequest.leave_date);
            const formattedDate = leaveDate.toLocaleDateString('vi-VN');

            // Determine start/end time based on leave type
            let startTime = '08:00';
            let endTime = '17:00';
            if (leaveRequest.leave_type === 'partial' && leaveRequest.start_time && leaveRequest.end_time) {
                startTime = leaveRequest.start_time;
                endTime = leaveRequest.end_time;
            } else if (leaveRequest.leave_type === 'half_day_morning') {
                startTime = '08:00';
                endTime = '12:00';
            } else if (leaveRequest.leave_type === 'half_day_afternoon') {
                startTime = '13:00';
                endTime = '17:00';
            }

            EmailService.sendAsync(templateSlug, employee.email, {
                user_name: employee.full_name,
                approver_name: approverName,
                leave_dates: formattedDate,
                leave_type: leaveTypeMap[leaveRequest.leave_type] || leaveRequest.leave_type,
                start_date: `${formattedDate} ${startTime}`,
                end_date: `${formattedDate} ${endTime}`,
                total_days: String(totalDays),
                rejection_reason: (leaveRequest as any).rejection_reason || '',
            });
        } catch (err) {
            console.error('[LeaveRequestService] sendLeaveStatusEmail error:', err);
        }
    }
}

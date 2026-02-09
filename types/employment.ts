// Employment Types & Schedules
// Generated: 2026-02-07

/**
 * Employment type enum
 */
export type EmploymentType = 'full-time' | 'part-time' | 'intern';

/**
 * Shift type enum
 */
export type ShiftType = 'morning' | 'evening' | 'full' | 'custom';

/**
 * Leave type enum
 */
export type LeaveType = 'full_day' | 'half_day_morning' | 'half_day_afternoon' | 'partial';

/**
 * Leave request status enum
 */
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Employee default schedule template
 */
export interface EmployeeDefaultSchedule {
    id: string;
    employee_id: string;
    day_of_week: DayOfWeek;
    shift_type: ShiftType;
    custom_start_time?: string; // HH:MM format
    custom_end_time?: string; // HH:MM format
    is_template: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Leave request
 */
export interface LeaveRequest {
    id: string;
    employee_id: string;
    leave_date: string; // YYYY-MM-DD
    leave_type: LeaveType;
    start_time?: string; // HH:MM format (for partial leave)
    end_time?: string; // HH:MM format (for partial leave)
    duration_hours?: number;
    reason?: string;
    image_url?: string;
    status: LeaveRequestStatus;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Leave request with employee details (for display)
 */
export interface LeaveRequestWithEmployee extends LeaveRequest {
    employee_name?: string; // For convenience
    employee: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
    };
    approver?: {
        id: string;
        full_name: string;
    };
}

/**
 * Daily work summary
 */
export interface DailyWorkSummary {
    id: string;
    employee_id: string;
    work_date: string; // YYYY-MM-DD
    employment_type?: EmploymentType;

    // Schedule info
    scheduled_start_time?: string;
    scheduled_end_time?: string;
    scheduled_hours?: number;

    // Actual attendance
    clock_in_time?: string;
    clock_out_time?: string;
    clocked_hours?: number;

    // Leave info
    total_leave_hours: number;
    has_full_day_leave: boolean;
    leave_details?: LeaveDetail[];

    // Final calculation
    actual_working_hours?: number;
    payable_hours?: number;

    // Metadata
    calculated_at: string;
    needs_recalculation: boolean;
}

/**
 * Leave detail (nested in daily_work_summary.leave_details)
 */
export interface LeaveDetail {
    leave_id: string;
    leave_type: LeaveType;
    start_time?: string;
    end_time?: string;
    duration_hours: number;
}

/**
 * Company schedule config
 */
export interface CompanyScheduleConfig {
    id: string;
    config_key: string;
    config_value: DefaultScheduleConfig | ShiftConfig;
    description?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Default full-time schedule config
 */
export interface DefaultScheduleConfig {
    start: string; // HH:MM
    end: string; // HH:MM
    break_start: string; // HH:MM
    break_end: string; // HH:MM
}

/**
 * Shift config (morning/evening)
 */
export interface ShiftConfig {
    start: string; // HH:MM
    end: string; // HH:MM
}

/**
 * Create schedule template request
 */
export interface CreateScheduleTemplateRequest {
    employee_id: string;
    schedules: {
        day_of_week: DayOfWeek;
        shift_type: ShiftType;
        custom_start_time?: string;
        custom_end_time?: string;
    }[];
}

/**
 * Create leave request
 */
export interface CreateLeaveRequestDTO {
    employee_id: string;
    leave_date: string;
    leave_type: LeaveType;
    start_time?: string; // Required for partial leave
    end_time?: string; // Required for partial leave
    reason?: string;
    image_url?: string;
}

/**
 * Approve/Reject leave request
 */
export interface UpdateLeaveRequestDTO {
    status: 'approved' | 'rejected';
    approved_by: string;
    rejection_reason?: string; // Required if status = rejected
}

/**
 * Schedule template display (for UI)
 */
export interface ScheduleTemplateDisplay {
    day_of_week: DayOfWeek;
    day_name: string; // "Monday", "Tuesday", etc.
    shift_type: ShiftType;
    start_time: string;
    end_time: string;
    hours: number;
}

/**
 * Leave summary (for reports)
 */
export interface LeaveSummary {
    employee_id: string;
    employee_name: string;
    total_leaves: number;
    pending_leaves: number;
    approved_leaves: number;
    rejected_leaves: number;
    total_leave_hours: number;
}

/**
 * Work hours summary (for payroll)
 */
export interface WorkHoursSummary {
    employee_id: string;
    employee_name: string;
    total_scheduled_hours: number;
    total_clocked_hours: number;
    total_leave_hours: number;
    total_actual_working_hours: number;
    total_payable_hours: number;
}

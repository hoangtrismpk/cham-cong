/**
 * Work Summary Calculator
 * Calculates daily work summaries combining attendance and leave data
 * Created: 2026-02-07
 */

import { createClient } from '@/utils/supabase/server';
import type {
    DailyWorkSummary,
    LeaveDetail,
    EmploymentType,
    WorkHoursSummary
} from '@/types/employment';
import { ScheduleTemplateService } from './schedule-template-service';
import { LeaveRequestService } from './leave-request-service';

export class WorkSummaryCalculator {
    /**
     * Calculate daily work summary for an employee on a specific date
     */
    static async calculateDailySummary(
        employeeId: string,
        workDate: string
    ): Promise<DailyWorkSummary> {
        const supabase = await createClient();

        // 1. Get employee's employment type and schedule
        const { data: profile } = await supabase
            .from('profiles')
            .select('employment_type')
            .eq('id', employeeId)
            .single();

        const employmentType = profile?.employment_type as EmploymentType || 'full-time';

        // 2. Get scheduled hours for this day
        const dayOfWeek = new Date(workDate).getDay() as any;
        const schedules = await ScheduleTemplateService.getEmployeeSchedule(employeeId);
        const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);

        let scheduledStartTime: string | undefined;
        let scheduledEndTime: string | undefined;
        let scheduledHours = 0;

        if (daySchedule) {
            const times = ScheduleTemplateService.calculateScheduleTimes(
                daySchedule.shift_type,
                daySchedule.custom_start_time,
                daySchedule.custom_end_time
            );
            scheduledStartTime = times.start_time;
            scheduledEndTime = times.end_time;
            scheduledHours = times.hours;
        }

        // 3. Get actual attendance (clock in/out)
        // Note: Assuming you have an 'attendances' table
        // Adjust this based on your actual attendance tracking
        const { data: attendance } = await supabase
            .from('attendances')
            .select('clock_in, clock_out')
            .eq('user_id', employeeId)
            .eq('date', workDate)
            .single();

        let clockInTime: string | undefined;
        let clockOutTime: string | undefined;
        let clockedHours = 0;

        if (attendance?.clock_in && attendance?.clock_out) {
            clockInTime = attendance.clock_in;
            clockOutTime = attendance.clock_out;
            clockedHours = this.calculateTimeDifference(attendance.clock_in, attendance.clock_out);
        }

        // 4. Get approved leaves
        const leaves = await LeaveRequestService.getApprovedLeavesForDateRange(
            employeeId,
            workDate,
            workDate
        );

        let totalLeaveHours = 0;
        let hasFullDayLeave = false;
        const leaveDetails: LeaveDetail[] = [];

        for (const leave of leaves) {
            const duration = leave.duration_hours || 0;
            totalLeaveHours += duration;

            if (leave.leave_type === 'full_day') {
                hasFullDayLeave = true;
            }

            leaveDetails.push({
                leave_id: leave.id,
                leave_type: leave.leave_type,
                start_time: leave.start_time,
                end_time: leave.end_time,
                duration_hours: duration
            });
        }

        // 5. Calculate final hours
        let actualWorkingHours = 0;
        let payableHours = 0;

        if (hasFullDayLeave) {
            // Full day leave: no actual work, but full scheduled hours are payable
            actualWorkingHours = 0;
            payableHours = scheduledHours;
        } else {
            // Partial or no leave
            actualWorkingHours = Math.max(0, clockedHours - totalLeaveHours);
            payableHours = clockedHours; // Payable includes time worked + approved leave
        }

        // 6. Create summary object
        const summary: DailyWorkSummary = {
            id: '', // Will be set by database
            employee_id: employeeId,
            work_date: workDate,
            employment_type: employmentType,

            scheduled_start_time: scheduledStartTime,
            scheduled_end_time: scheduledEndTime,
            scheduled_hours: scheduledHours,

            clock_in_time: clockInTime,
            clock_out_time: clockOutTime,
            clocked_hours: clockedHours,

            total_leave_hours: totalLeaveHours,
            has_full_day_leave: hasFullDayLeave,
            leave_details: leaveDetails,

            actual_working_hours: actualWorkingHours,
            payable_hours: payableHours,

            calculated_at: new Date().toISOString(),
            needs_recalculation: false
        };

        return summary;
    }

    /**
     * Save or update daily work summary
     */
    static async saveDailySummary(summary: DailyWorkSummary): Promise<DailyWorkSummary> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('daily_work_summary')
            .upsert({
                employee_id: summary.employee_id,
                work_date: summary.work_date,
                employment_type: summary.employment_type,

                scheduled_start_time: summary.scheduled_start_time,
                scheduled_end_time: summary.scheduled_end_time,
                scheduled_hours: summary.scheduled_hours,

                clock_in_time: summary.clock_in_time,
                clock_out_time: summary.clock_out_time,
                clocked_hours: summary.clocked_hours,

                total_leave_hours: summary.total_leave_hours,
                has_full_day_leave: summary.has_full_day_leave,
                leave_details: summary.leave_details,

                actual_working_hours: summary.actual_working_hours,
                payable_hours: summary.payable_hours,

                calculated_at: new Date().toISOString(),
                needs_recalculation: false
            }, {
                onConflict: 'employee_id,work_date'
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to save daily summary: ${error.message}`);
        }

        return data;
    }

    /**
     * Calculate and save daily summary (convenience method)
     */
    static async calculateAndSave(
        employeeId: string,
        workDate: string
    ): Promise<DailyWorkSummary> {
        const summary = await this.calculateDailySummary(employeeId, workDate);
        return await this.saveDailySummary(summary);
    }

    /**
     * Get daily summary from database
     */
    static async getDailySummary(
        employeeId: string,
        workDate: string
    ): Promise<DailyWorkSummary | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('daily_work_summary')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('work_date', workDate)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Failed to fetch daily summary: ${error.message}`);
        }

        return data;
    }

    /**
     * Get work hours summary for a date range
     */
    static async getWorkHoursSummary(
        employeeId: string,
        startDate: string,
        endDate: string
    ): Promise<WorkHoursSummary> {
        const supabase = await createClient();

        const { data: summaries, error } = await supabase
            .from('daily_work_summary')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('work_date', startDate)
            .lte('work_date', endDate);

        if (error) {
            throw new Error(`Failed to fetch summaries: ${error.message}`);
        }

        // Get employee name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', employeeId)
            .single();

        const summary: WorkHoursSummary = {
            employee_id: employeeId,
            employee_name: profile?.full_name || 'Unknown',
            total_scheduled_hours: summaries?.reduce((sum: number, s: any) => sum + (s.scheduled_hours || 0), 0) || 0,
            total_clocked_hours: summaries?.reduce((sum: number, s: any) => sum + (s.clocked_hours || 0), 0) || 0,
            total_leave_hours: summaries?.reduce((sum: number, s: any) => sum + (s.total_leave_hours || 0), 0) || 0,
            total_actual_working_hours: summaries?.reduce((sum: number, s: any) => sum + (s.actual_working_hours || 0), 0) || 0,
            total_payable_hours: summaries?.reduce((sum: number, s: any) => sum + (s.payable_hours || 0), 0) || 0
        };

        return summary;
    }

    /**
     * Recalculate summaries that need recalculation
     */
    static async recalculatePendingSummaries(): Promise<number> {
        const supabase = await createClient();

        // Get summaries that need recalculation
        const { data: summaries, error } = await supabase
            .from('daily_work_summary')
            .select('employee_id, work_date')
            .eq('needs_recalculation', true)
            .limit(100); // Process in batches

        if (error) {
            throw new Error(`Failed to fetch pending summaries: ${error.message}`);
        }

        let count = 0;
        for (const summary of summaries || []) {
            try {
                await this.calculateAndSave(summary.employee_id, summary.work_date);
                count++;
            } catch (err) {
                console.error(`Failed to recalculate summary for ${summary.employee_id} on ${summary.work_date}:`, err);
            }
        }

        return count;
    }

    /**
     * Batch calculate summaries for multiple employees on a specific date
     */
    static async batchCalculateForDate(
        employeeIds: string[],
        workDate: string
    ): Promise<number> {
        let count = 0;

        for (const employeeId of employeeIds) {
            try {
                await this.calculateAndSave(employeeId, workDate);
                count++;
            } catch (err) {
                console.error(`Failed to calculate summary for ${employeeId}:`, err);
            }
        }

        return count;
    }

    /**
     * Calculate summaries for all active employees for yesterday
     */
    static async calculateYesterdaySummaries(): Promise<number> {
        const supabase = await createClient();

        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get all employees
        const { data: employees, error } = await supabase
            .from('profiles')
            .select('id');

        if (error) {
            throw new Error(`Failed to fetch employees: ${error.message}`);
        }

        const employeeIds = employees?.map((e: any) => e.id) || [];
        return await this.batchCalculateForDate(employeeIds, yesterdayStr);
    }

    /**
     * Helper: Calculate time difference in hours
     */
    private static calculateTimeDifference(startTime: string, endTime: string): number {
        // Handle both HH:MM format and full ISO timestamp
        const extractTime = (timeStr: string): { hour: number; minute: number } => {
            if (timeStr.includes('T')) {
                // ISO timestamp
                const date = new Date(timeStr);
                return { hour: date.getHours(), minute: date.getMinutes() };
            } else {
                // HH:MM format
                const [hour, minute] = timeStr.split(':').map(Number);
                return { hour, minute };
            }
        };

        const start = extractTime(startTime);
        const end = extractTime(endTime);

        const startMinutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;

        return (endMinutes - startMinutes) / 60;
    }

    /**
     * Helper: Format time to HH:MM
     */
    static formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

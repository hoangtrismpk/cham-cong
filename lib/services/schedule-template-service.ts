/**
 * Schedule Template Service
 * Manages employee default schedules (weekly templates)
 * Created: 2026-02-07
 */

import { createClient } from '@/utils/supabase/server';
import type {
    EmployeeDefaultSchedule,
    CreateScheduleTemplateRequest,
    DayOfWeek,
    ShiftType,
    ScheduleTemplateDisplay,
    CompanyScheduleConfig,
    ShiftConfig
} from '@/types/employment';

export class ScheduleTemplateService {
    /**
     * Get employee's default schedule template
     */
    static async getEmployeeSchedule(employeeId: string): Promise<EmployeeDefaultSchedule[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('employee_default_schedules')
            .select('*')
            .eq('employee_id', employeeId)
            .order('day_of_week', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch schedule: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Get schedule for display with time calculations
     */
    static async getScheduleDisplay(employeeId: string): Promise<ScheduleTemplateDisplay[]> {
        const schedules = await this.getEmployeeSchedule(employeeId);
        const companyConfigs = await this.getCompanyScheduleConfigs();

        return schedules.map(schedule => {
            const { start_time, end_time, hours } = this.calculateScheduleTimes(
                schedule.shift_type,
                schedule.custom_start_time,
                schedule.custom_end_time,
                companyConfigs
            );

            return {
                day_of_week: schedule.day_of_week,
                day_name: this.getDayName(schedule.day_of_week),
                shift_type: schedule.shift_type,
                start_time,
                end_time,
                hours
            };
        });
    }

    /**
     * Create or update employee schedule template
     */
    static async upsertScheduleTemplate(
        request: CreateScheduleTemplateRequest
    ): Promise<EmployeeDefaultSchedule[]> {
        const supabase = await createClient();

        // Delete existing schedules for this employee
        const { error: deleteError } = await supabase
            .from('employee_default_schedules')
            .delete()
            .eq('employee_id', request.employee_id);

        if (deleteError) {
            throw new Error(`Failed to delete old schedules: ${deleteError.message}`);
        }

        // Insert new schedules
        const schedulesToInsert = request.schedules.map(s => ({
            employee_id: request.employee_id,
            day_of_week: s.day_of_week,
            shift_type: s.shift_type,
            custom_start_time: s.custom_start_time,
            custom_end_time: s.custom_end_time,
            is_template: true
        }));

        const { data, error } = await supabase
            .from('employee_default_schedules')
            .insert(schedulesToInsert)
            .select();

        if (error) {
            throw new Error(`Failed to create schedules: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Delete schedule for a specific day
     */
    static async deleteScheduleForDay(
        employeeId: string,
        dayOfWeek: DayOfWeek
    ): Promise<void> {
        const supabase = await createClient();

        const { error } = await supabase
            .from('employee_default_schedules')
            .delete()
            .eq('employee_id', employeeId)
            .eq('day_of_week', dayOfWeek);

        if (error) {
            throw new Error(`Failed to delete schedule: ${error.message}`);
        }
    }

    /**
     * Get company-wide schedule configurations
     */
    static async getCompanyScheduleConfigs(): Promise<Map<string, any>> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('company_schedule_config')
            .select('config_key, config_value');

        if (error) {
            throw new Error(`Failed to fetch company configs: ${error.message}`);
        }

        const configMap = new Map();
        data?.forEach(config => {
            configMap.set(config.config_key, config.config_value);
        });

        return configMap;
    }

    /**
     * Calculate actual times and hours for a schedule
     */
    static calculateScheduleTimes(
        shiftType: ShiftType,
        customStartTime?: string,
        customEndTime?: string,
        companyConfigs?: Map<string, any>
    ): { start_time: string; end_time: string; hours: number } {
        if (shiftType === 'custom') {
            if (!customStartTime || !customEndTime) {
                throw new Error('Custom shift requires start and end times');
            }
            return {
                start_time: customStartTime,
                end_time: customEndTime,
                hours: this.calculateHours(customStartTime, customEndTime)
            };
        }

        // Use company configs or defaults
        const configs = companyConfigs || new Map();

        if (shiftType === 'full') {
            const fullConfig = configs.get('default_fulltime_hours') || {
                start: '08:30',
                end: '18:00',
                break_start: '12:30',
                break_end: '13:30'
            };

            const totalHours = this.calculateHours(fullConfig.start, fullConfig.end);
            const breakHours = this.calculateHours(fullConfig.break_start, fullConfig.break_end);

            return {
                start_time: fullConfig.start,
                end_time: fullConfig.end,
                hours: totalHours - breakHours
            };
        }

        if (shiftType === 'morning') {
            const morningConfig = configs.get('default_morning_shift') || {
                start: '08:30',
                end: '12:30'
            };

            return {
                start_time: morningConfig.start,
                end_time: morningConfig.end,
                hours: this.calculateHours(morningConfig.start, morningConfig.end)
            };
        }

        if (shiftType === 'evening') {
            const eveningConfig = configs.get('default_evening_shift') || {
                start: '13:30',
                end: '18:00'
            };

            return {
                start_time: eveningConfig.start,
                end_time: eveningConfig.end,
                hours: this.calculateHours(eveningConfig.start, eveningConfig.end)
            };
        }

        throw new Error(`Unknown shift type: ${shiftType}`);
    }

    /**
     * Calculate hours between two time strings (HH:MM format)
     */
    static calculateHours(startTime: string, endTime: string): number {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        return (endMinutes - startMinutes) / 60;
    }

    /**
     * Get day name from day of week number
     */
    static getDayName(dayOfWeek: DayOfWeek): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayOfWeek];
    }

    /**
     * Get Vietnamese day name
     */
    static getDayNameVi(dayOfWeek: DayOfWeek): string {
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        return days[dayOfWeek];
    }

    /**
     * Validate schedule request
     */
    static validateScheduleRequest(request: CreateScheduleTemplateRequest): string[] {
        const errors: string[] = [];

        if (!request.employee_id) {
            errors.push('Employee ID is required');
        }

        if (!request.schedules || request.schedules.length === 0) {
            errors.push('At least one schedule is required');
        }

        request.schedules?.forEach((schedule, index) => {
            if (schedule.day_of_week < 0 || schedule.day_of_week > 6) {
                errors.push(`Schedule ${index}: Invalid day_of_week (must be 0-6)`);
            }

            if (schedule.shift_type === 'custom') {
                if (!schedule.custom_start_time) {
                    errors.push(`Schedule ${index}: custom_start_time is required for custom shifts`);
                }
                if (!schedule.custom_end_time) {
                    errors.push(`Schedule ${index}: custom_end_time is required for custom shifts`);
                }
            }
        });

        return errors;
    }
}

/**
 * Daily Work Summary Calculator - Cron Job
 * Runs every night at 00:30 to calculate work summaries for the previous day
 * Created: 2026-02-07
 * 
 * Deploy: Vercel Cron or Node-cron
 */

import { WorkSummaryCalculator } from '@/lib/services/work-summary-calculator';
import { createClient } from '@/utils/supabase/server';

/**
 * Main cron handler
 * This runs automatically every night
 */
export async function calculateDailySummariesCron() {
    console.log('🕐 [CRON] Starting daily work summary calculation...');
    const startTime = Date.now();

    try {
        // Calculate summaries for yesterday
        const count = await WorkSummaryCalculator.calculateYesterdaySummaries();

        const duration = Date.now() - startTime;
        console.log(`✅ [CRON] Successfully calculated ${count} summaries in ${duration}ms`);

        return {
            success: true,
            count,
            duration
        };
    } catch (error: any) {
        console.error('❌ [CRON] Failed to calculate daily summaries:', error);

        // Log error to database for monitoring
        await logCronError('calculate_daily_summaries', error.message);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Recalculate pending summaries
 * Runs when leave requests are approved/rejected
 */
export async function recalculatePendingSummariesCron() {
    console.log('🔄 [CRON] Starting recalculation of pending summaries...');
    const startTime = Date.now();

    try {
        const count = await WorkSummaryCalculator.recalculatePendingSummaries();

        const duration = Date.now() - startTime;
        console.log(`✅ [CRON] Successfully recalculated ${count} summaries in ${duration}ms`);

        return {
            success: true,
            count,
            duration
        };
    } catch (error: any) {
        console.error('❌ [CRON] Failed to recalculate summaries:', error);
        await logCronError('recalculate_pending_summaries', error.message);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Log cron errors to database for monitoring
 */
async function logCronError(jobName: string, errorMessage: string) {
    try {
        const supabase = await createClient();

        await supabase
            .from('cron_logs')
            .insert({
                job_name: jobName,
                status: 'error',
                error_message: errorMessage,
                executed_at: new Date().toISOString()
            });
    } catch (err) {
        console.error('Failed to log cron error:', err);
    }
}

/**
 * Manual trigger endpoint (for testing or manual runs)
 */
export async function manualTriggerDailySummaries(date?: string) {
    console.log(`📅 [MANUAL] Calculating summaries for date: ${date || 'yesterday'}`);

    try {
        const supabase = await createClient();

        // Get all active employees
        const { data: employees } = await supabase
            .from('profiles')
            .select('id');

        if (!employees) {
            throw new Error('No employees found');
        }

        // Determine target date
        const targetDate = date || (() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        })();

        const employeeIds = employees.map((e: any) => e.id);
        const count = await WorkSummaryCalculator.batchCalculateForDate(employeeIds, targetDate);

        console.log(`✅ [MANUAL] Calculated ${count} summaries for ${targetDate}`);

        return {
            success: true,
            count,
            date: targetDate
        };
    } catch (error: any) {
        console.error('❌ [MANUAL] Failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

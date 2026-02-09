/**
 * Cron API Endpoint
 * Endpoint: /api/cron/daily-summaries
 * Triggered by Vercel Cron or external scheduler
 * Created: 2026-02-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateDailySummariesCron, recalculatePendingSummariesCron } from '@/lib/cron/calculate-daily-summaries';

/**
 * POST /api/cron/daily-summaries
 * Calculate daily work summaries for yesterday
 * 
 * Security: Verify cron secret to prevent unauthorized access
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret (for security)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if recalculation is requested
        const { recalculate } = await request.json().catch(() => ({}));

        let result;
        if (recalculate) {
            result = await recalculatePendingSummariesCron();
        } else {
            result = await calculateDailySummariesCron();
        }

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Daily summaries calculated successfully',
                count: result.count,
                duration: result.duration
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Cron API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/cron/daily-summaries
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        job: 'daily-summaries',
        description: 'Calculates daily work summaries for all employees'
    });
}

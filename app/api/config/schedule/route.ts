import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable Next.js cache

export async function GET() {
    const supabase = await createClient();

    try {
        // Fetch raw settings from DB
        const { data, error } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', [
                'work_start_time',
                'work_end_time',
                'lunch_start_time',
                'lunch_end_time',
                'work_off_days'
            ]);

        if (error) {
            console.error('[API Schedule] DB Error:', error);
            throw error;
        }

        // Initialize default config
        const config: any = {
            start_time: '08:30',
            end_time: '18:00',
            break_start: '12:00',
            break_end: '13:00',
            working_days: [1, 2, 3, 4, 5, 6], // Default Mon-Sat
            debug_info: { source: 'default', raw_off_days: null, parsed_off_days: null }
        };

        if (data && data.length > 0) {
            config.debug_info.source = 'database';
            const settings: any = {};

            data.forEach(item => {
                let val = item.value;

                // Keep raw value for debug
                if (item.key === 'work_off_days') {
                    config.debug_info.raw_off_days = val;
                }

                // Robust JSON parsing
                if (typeof val === 'string') {
                    val = val.trim();
                    // Try parsing JSON if it looks like JSON
                    if ((val.startsWith('[') && val.endsWith(']')) ||
                        (val.startsWith('{') && val.endsWith('}')) ||
                        (val.startsWith('"') && val.endsWith('"'))) {
                        try {
                            const parsed = JSON.parse(val);
                            val = parsed;
                        } catch (e) {
                            // If parse fails, keep original string
                        }
                    }
                }

                // Double check: if result is still a string that looks like JSON (double encoded)
                if (typeof val === 'string') {
                    if ((val.startsWith('[') && val.endsWith(']')) ||
                        (val.startsWith('"') && val.endsWith('"'))) {
                        try {
                            val = JSON.parse(val);
                        } catch (e) { }
                    }
                }

                settings[item.key] = val;
            });

            // Map settings to config
            if (settings.work_start_time) config.start_time = String(settings.work_start_time).replace(/"/g, '');
            if (settings.work_end_time) config.end_time = String(settings.work_end_time).replace(/"/g, '');
            if (settings.lunch_start_time) config.break_start = String(settings.lunch_start_time).replace(/"/g, '');
            if (settings.lunch_end_time) config.break_end = String(settings.lunch_end_time).replace(/"/g, '');

            // Calculate working days
            if (settings.work_off_days !== undefined) {
                let offDays: any[] = [];
                let raw = settings.work_off_days;

                // 1. If it's already an array
                if (Array.isArray(raw)) offDays = raw;
                // 2. If it's a string, try JSON parse
                else if (typeof raw === 'string') {
                    try {
                        let parsed = JSON.parse(raw);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Double encoded
                        if (Array.isArray(parsed)) offDays = parsed;
                    } catch (e) { }

                    // 3. Last resort: manual parse "[1, 2]"
                    if (offDays.length === 0) {
                        const clean = raw.replace(/[\[\]"]/g, '');
                        if (clean.trim()) offDays = clean.split(',').map(Number).filter(n => !isNaN(n));
                    }
                }

                config.debug_info.parsed_off_days = offDays;
                const offDaysNum = offDays.map((d: any) => Number(d));
                const allDays = [0, 1, 2, 3, 4, 5, 6];
                config.working_days = allDays.filter(day => !offDaysNum.includes(day));
            }
        }

        return NextResponse.json(config, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

    } catch (error: any) {
        console.error('[API Schedule] Exception:', error);
        return NextResponse.json(
            { error: 'Failed to fetch schedule config', details: error.message },
            { status: 500 }
        );
    }
}

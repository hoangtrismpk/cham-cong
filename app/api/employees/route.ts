/**
 * Employees List API
 * Get all employees for admin
 * Created: 2026-02-07
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/employees
 * Get all employees
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all employees
        const { data: employees, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, employment_type, role_id')
            .order('full_name', { ascending: true });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(employees || []);
    } catch (error: any) {
        console.error('GET /api/employees error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

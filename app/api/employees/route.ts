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
// Helper to get array from search params safely
function getArray(searchParams: URLSearchParams, key: string) {
    const value = searchParams.get(key);
    return value ? value.split(',') : [];
}

/**
 * GET /api/employees
 * Get employees with Server-Side Pagination & Filtering
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- 1. Extract Query Parameters ---
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const deptFilter = searchParams.get('department') || 'all';
        const statusFilter = searchParams.get('status') || 'all';
        const roleFilter = searchParams.get('role') || 'all';

        // Calculate range
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // --- 2. Build Query ---
        let query = supabase
            .from('profiles')
            .select(`
                id, 
                numeric_id,
                first_name,
                last_name,
                full_name, 
                email, 
                phone,
                employee_code, 
                job_title,
                department, 
                status, 
                avatar_url,
                gender,
                dob,
                address,
                city,
                manager_id,
                emergency_contact,
                roles (
                    name,
                    display_name
                ),
                manager:manager_id (
                    full_name
                )
            `, { count: 'exact' });

        // --- 3. Apply Filters ---
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`);
        }

        if (deptFilter !== 'all') {
            query = query.eq('department', deptFilter);
        }

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (roleFilter !== 'all') {
            query = query.eq('role_id', roleFilter);
        }

        // --- 4. Pagination & Sorting ---
        const { data: employees, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // --- 5. Return Response ---
        return NextResponse.json({
            data: employees || [],
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error: any) {
        console.error('GET /api/employees error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getOrganizationSettings } from './organization'
import { requirePermissionForAction } from '@/utils/permissions'
import { checkPermission } from '@/utils/auth-guard'
import { getDescendantIds } from './my-team'
import { EmailService } from '@/lib/email-service'

// Types
export interface EmergencyContact {
    name: string
    relationship: string
    phone: string
    email?: string
    priority?: 'primary' | 'secondary'
}

export interface Employee {
    id: string
    numeric_id: number
    email: string
    personal_email?: string | null
    first_name: string
    last_name: string
    full_name: string
    phone: string | null
    address: string | null
    city: string | null

    // Work Info
    employee_code: string | null
    job_title: string | null
    department: string | null
    contract_type?: string | null // NEW: Contract Type
    employment_type?: string | null // NEW: Employment Type (full-time, part-time, etc.)
    role_id: string | null
    role_name?: string
    manager_id?: string | null // NEW: Direct Supervisor
    manager_name?: string // NEW
    start_date: string | null
    status: 'active' | 'inactive'

    // Personal Info
    avatar_url: string | null
    dob: string | null
    gender: 'Male' | 'Female' | 'Other' | null

    // Extra
    skills: string[] | null
    emergency_contact: EmergencyContact | EmergencyContact[] | null

    created_at: string
}

export interface EmployeeFilters {
    search?: string
    department?: string
    status?: string
    role?: string
    page?: number
    limit?: number
}

// Check if current user is admin
async function checkIsAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Check roles table via profile
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            role_id,
            role, 
            roles (
                name
            )
        `)
        .eq('id', user.id)
        .single()

    if (error || !data) return false

    // 1. Check new relational role
    if (data.roles && (data.roles as any).name === 'admin') return true

    // 2. Check legacy role column (fallback)
    if ((data as any).role === 'admin') return true

    return false
}

// Get list of employees with filters and pagination
export async function getEmployees(filters: EmployeeFilters = {}) {
    const supabase = await createClient()
    const { page = 1, limit = 10, search, department, status, role } = filters

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { employees: [], total: 0, error: 'Unauthorized' }

    // Get Current User Profile to determine scope
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, roles(name)')
        .eq('id', user.id)
        .single()

    // Determine Role Scopes
    const isAdmin = currentUserProfile?.role === 'admin' || (currentUserProfile?.roles as any)?.name === 'admin'
    const isHR = (currentUserProfile?.roles as any)?.name === 'hr'
    const isAccountant = (currentUserProfile?.roles as any)?.name === 'accountant'
    const isManager = (currentUserProfile?.roles as any)?.name === 'manager'

    let query = supabase
        .from('profiles')
        .select(`
            id,
            numeric_id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            address,
            city,
            employee_code,
            job_title,
            department,
            employment_type,
            avatar_url,
            role_id,
            manager_id,
            status,
            dob,
            gender,
            start_date,
            skills,
            emergency_contact,
            created_at,
            roles (
                name,
                display_name
            ),
            manager:manager_id (
                id,
                full_name
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

    // SCOPE FILTERING
    // If not Admin/HR/Accountant, assume Manager/Employee -> Limit scope
    if (!isAdmin && !isHR && !isAccountant) {
        // Manager sees their team + themselves
        if (isManager) {
            query = query.eq('manager_id', user.id)
        } else {
            // Normal user -> See themselves only 
            query = query.eq('id', user.id)
        }
    }

    // Apply filters
    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%,employee_code.ilike.%${search}%`)
    }

    if (department && department !== 'all') {
        query = query.eq('department', department)
    }

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    if (role && role !== 'all') {
        query = query.eq('role_id', role)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching employees:', error)
        return { employees: [], total: 0, error: error.message }
    }

    // Transform data
    const employees: Employee[] = (data || []).map((emp: any) => ({
        ...emp,
        numeric_id: emp.numeric_id || 0,
        role_name: emp.roles?.display_name || 'Thành viên',
        manager_name: emp.manager?.full_name || null,
        status: emp.status || 'active',
        skills: emp.skills || [],
        emergency_contact: emp.emergency_contact || { name: '', relationship: '', phone: '' }
    }))

    return { employees, total: count || 0, error: null }
}

// Get single employee by ID (UUID or numeric ID)
export async function getEmployeeById(id: string | number) {
    const supabase = await createClient()

    // Determine if ID is numeric or UUID
    const isNumeric = typeof id === 'number' || /^\d+$/.test(id.toString())
    const queryField = isNumeric ? 'numeric_id' : 'id'
    const queryValue = isNumeric ? parseInt(id.toString()) : id

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            numeric_id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            address,
            city,
            employee_code,
            job_title,
            department,
            employment_type,
            avatar_url,
            role_id,
            manager_id,
            status,
            dob,
            gender,
            start_date,
            skills,
            emergency_contact,
            created_at,
            roles (
                name,
                display_name
            ),
            manager:manager_id (
                id,
                full_name
            )
        `)
        .eq(queryField, queryValue)
        .single()

    if (error) {
        console.error('Error fetching employee:', error)
        return { employee: null, error: error.message }
    }

    // Advanced Permission Check for "My Team" logic
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser && currentUser.id !== data.id) {
        const hasUsersView = await checkPermission('users.view')
        if (!hasUsersView) {
            const hasMyTeamView = await checkPermission('my_team.view')
            if (!hasMyTeamView) {
                return { employee: null, error: 'Unauthorized to view employee' }
            }
            // User only has my_team.view, so verify the target user is in their team
            const { data: currentProfile } = await supabase.from('profiles').select('role, roles(name)').eq('id', currentUser.id).single()
            const isAdmin = currentProfile?.role === 'admin' || (currentProfile?.roles as any)?.name === 'admin'
            const descendants = await getDescendantIds(currentUser.id, isAdmin)

            if (!descendants.includes(data.id)) {
                return { employee: null, error: 'Employee is outside of your manageable team' }
            }
        }
    }

    const employee: Employee = {
        ...data,
        role_name: (data.roles as any)?.display_name || 'Thành viên',
        manager_name: (data.manager as any)?.full_name || null,
        status: data.status || 'active',
        skills: data.skills || [],
        numeric_id: data.numeric_id || 0,
        emergency_contact: data.emergency_contact || {
            name: 'Nguyễn Văn A',
            relationship: 'Bố/Mẹ',
            phone: '0987654321'
        }
    }

    return { employee, error: null }
}

export async function getDepartments() {
    // 1. Try to get from Organization Settings first
    const settings = await getOrganizationSettings()
    if (settings && settings.departments && settings.departments.length > 0) {
        return settings.departments
    }

    // 2. Fallback to distinct query
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('department')
        .not('department', 'is', null)

    if (error) return []
    return [...new Set((data || []).map(d => d.department).filter(Boolean))] as string[]
}

export async function getJobTitles() {
    // 1. Try to get from Organization Settings first
    const settings = await getOrganizationSettings()
    if (settings && settings.job_titles && settings.job_titles.length > 0) {
        return settings.job_titles
    }

    // 2. Fallback to distinct query
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('job_title')
        .not('job_title', 'is', null)

    if (error) return []
    return [...new Set((data || []).map(d => d.job_title).filter(Boolean))] as string[]
}

export async function getRoles() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name')
        .order('name')

    if (error) return []
    return data || []
}

// Helper: Get list of potential managers (Admin, HR, Manager)
export async function getManagers() {
    const supabase = await createClient()

    // Find roles that are managerial
    const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .in('name', ['admin', 'manager', 'hr'])

    const roleIds = roles?.map(r => r.id) || []

    if (roleIds.length === 0) return []

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role_id, email, employee_code')
        .in('role_id', roleIds)
        .order('full_name')

    if (error) return []
    return data || []
}

// Create a new employee
export async function createEmployee(formData: Partial<Employee> & { password?: string }) {
    // 1. Check permissions (granular: users.create)
    const denied = await requirePermissionForAction('users.create')
    if (denied) return denied

    // 2. Use Admin Client for Write Operations
    const supabaseAdmin = createAdminClient()

    // 3. Create Auth User using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email!,
        password: formData.password!,
        email_confirm: true,
        user_metadata: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: `${formData.first_name} ${formData.last_name}`,
            avatar_url: formData.avatar_url || null,
        }
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: 'Không thể tạo tài khoản' }

    // 4. Update Profile
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            employee_code: formData.employee_code || null,
            job_title: formData.job_title || 'Member',
            department: formData.department || null,
            role_id: formData.role_id || null,
            manager_id: formData.manager_id || null, // SAVE MANAGER
            start_date: formData.start_date || new Date().toISOString(),
            dob: formData.dob || null,
            gender: formData.gender || null,
            status: 'active',
            skills: formData.skills || [],
            emergency_contact: formData.emergency_contact || null,
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: `${formData.first_name} ${formData.last_name}`,
            avatar_url: formData.avatar_url || null,
            require_password_change: true,
        })
        .eq('id', authData.user.id)

    if (updateError) {
        console.error('Profile update error:', updateError)
        return { error: 'Tạo tài khoản thành công nhưng cập nhật hồ sơ thất bại: ' + updateError.message }
    }

    revalidatePath('/admin/employees')

    // Send welcome email (await to guarantee sending before Vercel kills process)
    await EmailService.sendAsync('account-registration', formData.email!, {
        user_name: `${formData.first_name} ${formData.last_name}`,
        user_email: formData.email!,
        temp_password: formData.password!,
    }).catch(err => {
        console.error('[CreateEmployee] Send email error:', err)
    })

    return { success: true, userId: authData.user.id }
}

// Update employee
export async function updateEmployee(employeeId: string | number, formData: Partial<Employee>) {
    // 1. Check permissions (granular: users.edit)
    const denied = await requirePermissionForAction('users.edit')
    if (denied) return denied

    // 2. Use Admin Client
    const supabaseAdmin = createAdminClient()

    // 3. Convert numeric ID to UUID if needed
    const isNumeric = typeof employeeId === 'number' || /^\d+$/.test(employeeId.toString())
    let actualEmployeeId = employeeId.toString()

    if (isNumeric) {
        const { data: employee, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('numeric_id', parseInt(employeeId.toString()))
            .single()

        if (fetchError || !employee) {
            return { error: 'Không tìm thấy nhân viên' }
        }

        actualEmployeeId = employee.id
    }

    // 4. Update Profile
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: `${formData.first_name} ${formData.last_name}`,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            employee_code: formData.employee_code,
            job_title: formData.job_title,
            department: formData.department,
            role_id: formData.role_id,
            manager_id: formData.manager_id || null, // SAVE MANAGER
            start_date: formData.start_date,
            dob: formData.dob,
            gender: formData.gender,
            status: formData.status,
            skills: formData.skills,
            emergency_contact: formData.emergency_contact,
            avatar_url: formData.avatar_url
        })
        .eq('id', actualEmployeeId)

    if (error) {
        console.error('Update error:', error)
        return { error: error.message }
    }

    revalidatePath('/admin/employees')
    revalidatePath(`/admin/employees/${employeeId}`)
    return { success: true }
}

// Delete (soft delete)
export async function deleteEmployee(employeeId: string | number) {
    // 1. Check permissions (granular: users.delete)
    const denied = await requirePermissionForAction('users.delete')
    if (denied) return denied

    const supabaseAdmin = createAdminClient()

    // 2. Convert numeric ID to UUID if needed
    const isNumeric = typeof employeeId === 'number' || /^\d+$/.test(employeeId.toString())
    let actualEmployeeId = employeeId.toString()

    if (isNumeric) {
        const { data: employee, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('numeric_id', parseInt(employeeId.toString()))
            .single()

        if (fetchError || !employee) {
            return { error: 'Không tìm thấy nhân viên' }
        }

        actualEmployeeId = employee.id
    }

    // 3. Soft delete profile
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', actualEmployeeId)

    // 4. Ban user in Auth
    await supabaseAdmin.auth.admin.updateUserById(actualEmployeeId, { ban_duration: '876000h' })

    if (error) return { error: error.message }
    revalidatePath('/admin/employees')
    return { success: true }
}

// Restore (reactivate)
export async function restoreEmployee(employeeId: string | number) {
    // 1. Check permissions (granular: users.delete)
    const denied = await requirePermissionForAction('users.delete')
    if (denied) return denied

    const supabaseAdmin = createAdminClient()

    // 2. Convert numeric ID to UUID if needed
    const isNumeric = typeof employeeId === 'number' || /^\d+$/.test(employeeId.toString())
    let actualEmployeeId = employeeId.toString()

    if (isNumeric) {
        const { data: employee, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('numeric_id', parseInt(employeeId.toString()))
            .single()

        if (fetchError || !employee) {
            return { error: 'Không tìm thấy nhân viên' }
        }

        actualEmployeeId = employee.id
    }

    // 3. Soft restore profile
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', actualEmployeeId)

    // 4. Unban user in Auth
    await supabaseAdmin.auth.admin.updateUserById(actualEmployeeId, { ban_duration: 'none' })

    if (error) return { error: error.message }
    revalidatePath('/admin/employees')
    return { success: true }
}

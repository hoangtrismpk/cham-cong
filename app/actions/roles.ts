'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/utils/permissions'

export interface Role {
    id: string
    name: string
    display_name: string
    description: string
    permissions: string[]
    is_system_role: boolean
    created_at: string
}

export interface Permission {
    id: string
    resource: string
    action: string
    display_name: string
    category: string
}

// Get all roles
export async function getRoles() {
    const supabase = await createClient()

    // Check permission
    const hasPerm = await checkPermission('roles.view')
    if (!hasPerm) return { error: 'Bạn không có quyền xem danh sách vai trò' }

    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

    if (error) {
        console.error('Error fetching roles:', error)
        return { error: error.message }
    }

    return { roles: data as Role[] }
}

// Get all available permissions (Category catalog)
export async function getAvailablePermissions() {
    const supabase = await createClient()

    // Check permission (usually roles.view or roles.manage needs this)
    const hasView = await checkPermission('roles.view')
    if (!hasView) return { error: 'Unauthorized' }

    const { data, error } = await supabase
        .from('available_permissions')
        .select('*')
        .order('category')
        .order('id')

    if (error) {
        console.error('Error fetching permissions:', error)
        return { error: error.message }
    }

    return { permissions: data as Permission[] }
}

// Update permissions for a role
export async function updateRolePermissions(roleName: string, permissions: string[]) {
    // 1. Check permission
    const hasPerm = await checkPermission('roles.manage')
    if (!hasPerm) return { error: 'Bạn không có quyền quản lý phân quyền' }

    // 2. Validation
    if (roleName === 'admin') {
        return { error: 'Không thể thay đổi quyền của Administrator' }
    }

    // 3. Update using Admin Client
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
        .from('roles')
        .update({ permissions })
        .eq('name', roleName)

    if (error) {
        console.error('Update role error:', error)
        return { error: error.message }
    }

    revalidatePath('/admin/settings/roles')
    return { success: true }
}

// Create new role (Optional - for future)
// Create new role
export async function createRole(data: { name: string, display_name: string, description?: string }) {
    const hasPerm = await checkPermission('roles.manage')
    if (!hasPerm) return { error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
        .from('roles')
        .insert({
            name: data.name.toLowerCase().replace(/\s+/g, '_'), // slugify
            display_name: data.display_name,
            description: data.description,
            permissions: [], // Start empty
            is_system_role: false
        })

    if (error) return { error: error.message }

    revalidatePath('/admin/settings/roles')
    return { success: true }
}

// Update role basic info
export async function updateRole(roleId: string, data: { display_name: string, description?: string }) {
    const hasPerm = await checkPermission('roles.manage')
    if (!hasPerm) return { error: 'Bạn không có quyền quản lý phân quyền' }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('roles')
        .update({
            display_name: data.display_name,
            description: data.description
        })
        .eq('id', roleId)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings/roles')
    return { success: true }
}

// Delete role
export async function deleteRole(roleId: string) {
    const hasPerm = await checkPermission('roles.manage')
    if (!hasPerm) return { error: 'Bạn không có quyền quản lý phân quyền' }

    const supabase = await createClient()

    // 1. Check if system role
    const { data: role } = await supabase.from('roles').select('is_system_role, name').eq('id', roleId).single()

    if (!role) return { error: 'Không tìm thấy vai trò' }
    if (role.is_system_role) return { error: 'Không thể xóa vai trò mặc định của hệ thống' }

    const supabaseAdmin = createAdminClient()

    // 2. Find the default 'member' role to reassign users
    const { data: memberRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'member')
        .single()

    if (memberRole) {
        // 3. Reassign users to 'member' role before deletion
        // We use 'employee' for the text-based role column as per system standard
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role_id: memberRole.id,
                role: 'employee'
            })
            .eq('role_id', roleId)

        if (updateError) {
            console.error('Error reassigning users during role deletion:', updateError)
            return { error: 'Lỗi khi chuyển giao nhân sự sang quyền mặc định: ' + updateError.message }
        }
    }

    // 4. Delete the role
    const { error } = await supabaseAdmin
        .from('roles')
        .delete()
        .eq('id', roleId)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings/roles')
    return { success: true }
}

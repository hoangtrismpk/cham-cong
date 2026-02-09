import { getRoles, getAvailablePermissions } from '@/app/actions/roles'
import { RoleManager } from './role-manager'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default async function RolesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Role check logic might be handled by middleware or layout, but let's double check ability to view roles
    // We try to fetch roles directly
    const [rolesRes, permsRes] = await Promise.all([
        getRoles(),
        getAvailablePermissions()
    ])

    if (rolesRes.error || permsRes.error) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="bg-red-900/10 border-red-900/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Không truy cập được dữ liệu phân quyền</AlertTitle>
                    <AlertDescription>
                        {rolesRes.error || permsRes.error || 'Bạn không có quyền truy cập trang này.'}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-8 h-full">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-white tracking-tight">Quản lý Phân quyền</h1>
                <p className="text-slate-400 mt-2">Cấu hình chi tiết quyền truy cập cho từng nhóm người dùng.</p>
            </header>

            <RoleManager roles={rolesRes.roles || []} permissions={permsRes.permissions || []} />
        </div>
    )
}

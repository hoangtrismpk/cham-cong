import { getRoles, getAvailablePermissions } from '@/app/actions/roles'
import { RoleManager } from './role-manager'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { requirePermission } from '@/utils/auth-guard'

// Get translations serverside - use Vietnamese by default for SSR
import { vi } from '@/locales/vi'
const t = vi

export default async function RolesPage() {
    await requirePermission('roles.view', '/admin')

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
                    <AlertTitle>{t.adminSettings.roleSettings.actions.loadError}</AlertTitle>
                    <AlertDescription>
                        {rolesRes.error || permsRes.error || t.adminSettings.roleSettings.actions.permissionDenied}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-8 h-full max-w-7xl mx-auto">
            <RoleManager roles={rolesRes.roles || []} permissions={permsRes.permissions || []} />
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { checkPermission, checkPermissions } from '@/utils/permissions'
import { Loader2 } from 'lucide-react'

interface PermissionGuardProps {
    /** Permission(s) required to render children */
    permission: string | string[]
    /** If true, all permissions must be granted. If false, any one is sufficient. */
    requireAll?: boolean
    /** Fallback UI when permission is denied */
    fallback?: React.ReactNode
    /** Show loading state while checking */
    showLoading?: boolean
    children: React.ReactNode
}

/**
 * Client-side permission guard component
 * Hides/shows content based on user's permissions
 */
export function PermissionGuard({
    permission,
    requireAll = false,
    fallback = null,
    showLoading = true,
    children
}: PermissionGuardProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkAccess() {
            try {
                let result: boolean

                if (Array.isArray(permission)) {
                    result = await checkPermissions(permission, requireAll)
                } else {
                    result = await checkPermission(permission)
                }

                setHasPermission(result)
            } catch (error) {
                console.error('Permission check failed:', error)
                setHasPermission(false)
            } finally {
                setLoading(false)
            }
        }

        checkAccess()
    }, [permission, requireAll])

    if (loading) {
        if (showLoading) {
            return (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
            )
        }
        return null
    }

    if (!hasPermission) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

/**
 * Hook to check permissions in functional components
 */
export function usePermission(permission: string | string[], requireAll = false) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkAccess() {
            try {
                let result: boolean

                if (Array.isArray(permission)) {
                    result = await checkPermissions(permission, requireAll)
                } else {
                    result = await checkPermission(permission)
                }

                setHasPermission(result)
            } catch (error) {
                console.error('Permission check failed:', error)
                setHasPermission(false)
            } finally {
                setLoading(false)
            }
        }

        checkAccess()
    }, [permission, requireAll])

    return { hasPermission, loading }
}

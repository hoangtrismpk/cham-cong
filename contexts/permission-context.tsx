'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'

interface PermissionContextType {
    permissions: string[]
    roleName: string | null
    /** Check if user has a specific permission */
    can: (permission: string) => boolean
    /** Check if user has ALL of the specified permissions */
    canAll: (...permissions: string[]) => boolean
    /** Check if user has ANY of the specified permissions */
    canAny: (...permissions: string[]) => boolean
}

const PermissionContext = createContext<PermissionContextType>({
    permissions: [],
    roleName: null,
    can: () => false,
    canAll: () => false,
    canAny: () => false,
})

interface PermissionProviderProps {
    children: ReactNode
    permissions: string[]
    roleName: string | null
}

export function PermissionProvider({ children, permissions, roleName }: PermissionProviderProps) {
    const value = useMemo(() => {
        const isAdmin = roleName === 'admin'

        const can = (permission: string): boolean => {
            // Admin bypasses all permission checks
            if (isAdmin) return true
            if (!permissions || permissions.length === 0) return false

            // Wildcard check
            if (permissions.includes('*')) return true

            // Exact match
            if (permissions.includes(permission)) return true

            // Resource wildcard (e.g., "users.*" grants "users.view")
            const [resource] = permission.split('.')
            if (permissions.includes(`${resource}.*`)) return true

            return false
        }

        const canAll = (...perms: string[]): boolean => {
            return perms.every(p => can(p))
        }

        const canAny = (...perms: string[]): boolean => {
            return perms.some(p => can(p))
        }

        return { permissions, roleName, can, canAll, canAny }
    }, [permissions, roleName])

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    )
}

export function usePermissions() {
    const context = useContext(PermissionContext)
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionProvider')
    }
    return context
}

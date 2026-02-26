'use client'

import { useState, useEffect } from 'react'
import { Role, Permission, updateRolePermissions, createRole, deleteRole } from '@/app/actions/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Plus, Trash2, Shield, Save, Check, Loader2, Search, AlertTriangle, ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/contexts/i18n-context'
import { usePermissions } from '@/contexts/permission-context'

interface RoleManagerProps {
    roles: Role[]
    permissions: Permission[]
}

export function RoleManager({ roles, permissions }: RoleManagerProps) {
    const router = useRouter()
    const { t, locale } = useI18n()
    const { can } = usePermissions()
    const canManage = can('roles.manage')
    const [selectedRole, setSelectedRole] = useState<Role>(roles[0] || null)
    const [unsavedPermissions, setUnsavedPermissions] = useState<string[]>(roles[0]?.permissions || [])
    const [isSaving, setIsSaving] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isMobileRoleDrawerOpen, setIsMobileRoleDrawerOpen] = useState(false)

    // New Role Form
    const [newRoleData, setNewRoleData] = useState({ name: '', display_name: '', description: '' })

    // Edit Role Form
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isUpdatingInfo, setIsUpdatingInfo] = useState(false)
    const [editRoleData, setEditRoleData] = useState({ id: '', display_name: '', description: '' })

    // Group permissions by category and sort: .view first, then .view_*, then others
    const groupedPermissions = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = []
        acc[perm.category].push(perm)
        return acc
    }, {} as Record<string, Permission[]>)

    // Sort each group: .view first, then sub-views, then alphabetical
    Object.keys(groupedPermissions).forEach(category => {
        groupedPermissions[category].sort((a, b) => {
            const aAction = a.id.split('.').slice(1).join('.')
            const bAction = b.id.split('.').slice(1).join('.')

            // Exact .view always first
            if (aAction === 'view' && bAction !== 'view') return -1
            if (bAction === 'view' && aAction !== 'view') return 1

            // .view_* variants next
            const aIsSubView = aAction.startsWith('view_')
            const bIsSubView = bAction.startsWith('view_')
            if (aIsSubView && !bIsSubView) return -1
            if (bIsSubView && !aIsSubView) return 1

            // Alphabetical for the rest
            return a.id.localeCompare(b.id)
        })
    })

    // Helper: Slugify string
    const slugify = (str: string) => {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .replace(/([^0-9a-z-\s_])/g, "")
            .replace(/(\s+|_)/g, "_")
            .replace(/-+/g, "_")
            .replace(/^-+|-+$/g, "");
    }

    // Handle role selection
    const handleSelectRole = (role: Role) => {
        if (role.name === selectedRole?.name) return
        setSelectedRole(role)
        setUnsavedPermissions(role.permissions || [])
    }

    // Handle Role ID Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (newRoleData.name) {
                const slugified = slugify(newRoleData.name)
                if (slugified !== newRoleData.name) {
                    setNewRoleData(prev => ({ ...prev, name: slugified }))
                }
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [newRoleData.name])

    // Helper: Determine the "gate" permission (resource.view) for a given permission
    // A permission is "gated" if the parent resource's .view permission is NOT checked
    const getGatePermission = (permId: string): string | null => {
        const parts = permId.split('.')
        if (parts.length < 2) return null
        const resource = parts[0]
        const action = parts.slice(1).join('.')
        // The .view permission itself is the gate - it gates everything else
        if (action === 'view') return null // view is never gated
        // Special case: dashboard only has .view
        if (resource === 'dashboard') return null
        return `${resource}.view`
    }

    // Check if a permission is disabled because its gate (.view) is not checked
    const isPermissionGated = (permId: string): boolean => {
        const gate = getGatePermission(permId)
        if (!gate) return false
        // Check if the gate permission exists in available permissions
        const gateExists = permissions.some(p => p.id === gate)
        if (!gateExists) return false
        // If gate is not checked → this permission is gated (disabled)
        return !unsavedPermissions.includes(gate) && !unsavedPermissions.includes('*')
    }

    // Toggle Permission
    const togglePermission = (permId: string) => {
        if (selectedRole?.name === 'admin') return // Admin has all rights

        setUnsavedPermissions(prev => {
            // Case 1: Unchecking a permission
            if (prev.includes(permId)) {
                const parts = permId.split('.')
                const resource = parts[0]
                const action = parts.slice(1).join('.')

                // If unchecking a .view permission → also uncheck ALL child permissions of this resource
                if (action === 'view') {
                    return prev.filter(p => {
                        if (p === permId) return false // Remove the view itself
                        // Remove all permissions with the same resource prefix
                        const pResource = p.split('.')[0]
                        return pResource !== resource
                    })
                }
                return prev.filter(p => p !== permId)
            }

            // Case 2: Checking a permission
            return [...prev, permId]
        })
    }

    // Save Changes
    const handleSave = async () => {
        if (!selectedRole) return
        setIsSaving(true)

        const res = await updateRolePermissions(selectedRole.name, unsavedPermissions)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(t.adminSettings.roleSettings.actions.saveSuccess)
            // Update local state is handled by revalidation, but for UX let's update reflected role
            // Actually router.refresh() is better
            router.refresh()
        }
        setIsSaving(false)
    }

    // Create Role
    const handleCreateRole = async () => {
        if (!newRoleData.display_name || !newRoleData.name) {
            toast.error(t.adminSettings.roleSettings.createRole.required)
            return
        }
        setIsCreating(true)
        const res = await createRole(newRoleData)
        setIsCreating(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(t.adminSettings.roleSettings.createRole.success)
            setIsCreateModalOpen(false)
            setNewRoleData({ name: '', display_name: '', description: '' })
            router.refresh()
        }
    }

    // Delete Role
    const handleDeleteRole = async (roleId: string) => {
        if (!confirm(t.adminSettings.roleSettings.deleteRole.confirm)) return

        const res = await deleteRole(roleId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(t.adminSettings.roleSettings.deleteRole.success)
            // Select admin as fallback
            const admin = roles.find(r => r.name === 'admin')
            if (admin) handleSelectRole(admin)
            router.refresh()
        }
    }

    // Update Role Info
    const handleUpdateRoleInfo = async () => {
        if (!editRoleData.display_name) {
            toast.error(t.adminSettings.roleSettings.createRole.required)
            return
        }
        setIsUpdatingInfo(true)
        const { updateRole } = await import('@/app/actions/roles')
        const res = await updateRole(editRoleData.id, {
            display_name: editRoleData.display_name,
            description: editRoleData.description
        })
        setIsUpdatingInfo(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(t.adminSettings.roleSettings.editRole.success)
            setIsEditModalOpen(false)
            router.refresh()
        }
    }

    const openEditModal = (role: Role) => {
        setEditRoleData({
            id: role.id,
            display_name: (t.adminSettings.roleSettings as any).roleLabels?.[role.name] || role.display_name,
            description: (t.adminSettings.roleSettings as any).roleDescriptions?.[role.name] || role.description || ''
        })
        setIsEditModalOpen(true)
    }

    // Checking if dirty
    const isDirty = JSON.stringify(unsavedPermissions.sort()) !== JSON.stringify((selectedRole?.permissions || []).sort())

    return (
        <div className="flex flex-col h-full gap-6">
            <header className="mb-2">
                <h1 className="text-3xl font-black text-white tracking-tight">{t.adminSettings.roleSettings.title}</h1>
                <p className="text-slate-400 mt-2">{t.adminSettings.roleSettings.description}</p>
            </header>

            <div className="flex flex-col gap-6">
                {/* Desktop: Horizontal Tabs */}
                <div className="hidden lg:block bg-[#161b22] border border-slate-700 rounded-xl mb-6">
                    <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" /> {t.adminSettings.roleSettings.roles}
                            </h3>
                            {canManage && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-primary text-black hover:bg-primary/90"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> {t.adminSettings.roleSettings.createRole.button}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Horizontal Tabs */}
                    <div className="relative px-4 pb-4 pt-2">
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => handleSelectRole(role)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 whitespace-nowrap shrink-0 group relative",
                                        selectedRole?.id === role.id
                                            ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5"
                                            : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white"
                                    )}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className={cn(
                                            "font-bold text-sm",
                                            selectedRole?.id === role.id ? "text-primary" : "text-slate-200"
                                        )}>
                                            {(t.adminSettings.roleSettings as any).roleLabels?.[role.name] || role.display_name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                            {role.permissions.length === 1 && role.permissions[0] === '*' ? t.adminSettings.roleSettings.fullAccess : `${role.permissions.length} ${t.adminSettings.roleSettings.permissions}`}
                                        </span>
                                    </div>
                                    {role.is_system_role && (
                                        <Badge variant="secondary" className="text-[9px] h-5 bg-slate-700 text-slate-400 ml-2">{t.adminSettings.roleSettings.systemRole}</Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile: Role Selection Drawer */}
                <div className="lg:hidden mb-4">
                    <Sheet open={isMobileRoleDrawerOpen} onOpenChange={setIsMobileRoleDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between bg-[#161b22] border-slate-700 text-white hover:bg-slate-800"
                            >
                                <span className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    {(t.adminSettings.roleSettings as any).roleLabels?.[selectedRole?.name || ''] || selectedRole?.display_name || t.adminSettings.roleSettings.selectRole}
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[80vh] p-0 border-t border-slate-700 bg-[#0d1117]">
                            <SheetTitle className="sr-only">{t.adminSettings.roleSettings.selectRole}</SheetTitle>
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" /> {t.adminSettings.roleSettings.roles}
                                        </h3>
                                        {canManage && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-primary text-black hover:bg-primary/90"
                                                onClick={() => {
                                                    setIsMobileRoleDrawerOpen(false)
                                                    setIsCreateModalOpen(true)
                                                }}
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> {t.adminSettings.roleSettings.createRole.button}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Roles List */}
                                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                    <div className="space-y-2">
                                        {roles.map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => {
                                                    handleSelectRole(role)
                                                    setIsMobileRoleDrawerOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                                                    selectedRole?.id === role.id
                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                        : "bg-slate-800/50 border-slate-700 text-slate-300 active:bg-slate-800"
                                                )}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className={cn(
                                                        "font-bold text-sm",
                                                        selectedRole?.id === role.id ? "text-primary" : "text-slate-200"
                                                    )}>
                                                        {(t.adminSettings.roleSettings as any).roleLabels?.[role.name] || role.display_name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                                        {role.permissions.length === 1 && role.permissions[0] === '*' ? t.adminSettings.roleSettings.fullAccess : `${role.permissions.length} ${t.adminSettings.roleSettings.permissions}`}
                                                    </span>
                                                </div>
                                                {role.is_system_role && (
                                                    <Badge variant="secondary" className="text-[9px] h-5 bg-slate-700 text-slate-400">{t.adminSettings.roleSettings.systemRole}</Badge>
                                                )}
                                                {selectedRole?.id === role.id && (
                                                    <Check className="h-5 w-5 text-primary ml-2" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Permissions Panel */}
                <div className="flex-1 bg-[#161b22] border border-slate-700 rounded-xl flex flex-col">
                    {selectedRole ? (
                        <>
                            <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 pb-1">
                                        <h2 className="text-2xl font-bold text-white">{(t.adminSettings.roleSettings as any).roleLabels?.[selectedRole.name] || selectedRole.display_name}</h2>
                                        {selectedRole.is_system_role && <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">{t.adminSettings.roleSettings.defaultRole}</Badge>}
                                    </div>
                                    <p className="text-slate-400 mt-1 max-w-2xl leading-relaxed">
                                        {(t.adminSettings.roleSettings as any).roleDescriptions?.[selectedRole.name] || selectedRole.description || t.adminSettings.roleSettings.defaultRole}
                                    </p>
                                    <div className="text-xs text-slate-500 font-mono mt-2 flex items-center gap-2">
                                        <span className="bg-slate-800 px-2 py-0.5 rounded">ID: {selectedRole.name}</span>
                                        {selectedRole.name === 'admin' && <span className="text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t.adminSettings.roleSettings.adminNote}</span>}
                                        {canManage && !selectedRole.is_system_role && (
                                            <div className="flex items-center gap-1 ml-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() => openEditModal(selectedRole)}
                                                    title={t.adminSettings.roleSettings.actions.edit || 'Sửa thông tin'}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteRole(selectedRole.id)}
                                                    title={t.adminSettings.roleSettings.actions.delete || 'Xóa vai trò'}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedRole.name !== 'admin' && canManage && (
                                    <Button
                                        onClick={handleSave}
                                        disabled={!isDirty || isSaving}
                                        className="min-w-[120px]"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        {t.adminSettings.roleSettings.actions.save}
                                    </Button>
                                )}
                            </div>

                            <div className="flex-1 p-6">
                                {selectedRole.name === 'admin' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50">
                                        <Shield className="h-24 w-24 text-primary mb-4" />
                                        <h3 className="text-xl font-bold text-white">{t.adminSettings.roleSettings.systemRole}</h3>
                                        <p className="text-slate-400 max-w-md mt-2">{t.adminSettings.roleSettings.adminDescription}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                                            <Card key={category} className="bg-[#0d1117] border-slate-700 shadow-sm">
                                                <CardHeader className="pb-3 border-b border-slate-800">
                                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                                                        {(t.adminSettings.roleSettings as any).categories?.[category] || category}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4 space-y-5">
                                                    {perms.map(perm => {
                                                        const gated = isPermissionGated(perm.id)
                                                        const isViewPerm = perm.id.endsWith('.view') && !perm.id.includes('view_')
                                                        const isChecked = unsavedPermissions.includes(perm.id) || unsavedPermissions.includes('*')

                                                        return (
                                                            <div
                                                                key={perm.id}
                                                                className={cn(
                                                                    "flex items-start gap-3 select-none py-1 rounded-md px-1 -mx-1 transition-all duration-200",
                                                                    gated && "opacity-40 cursor-not-allowed",
                                                                    isViewPerm && isChecked && "bg-primary/5 border-l-2 border-primary/30 pl-2",
                                                                    isViewPerm && !isChecked && "border-l-2 border-slate-700 pl-2"
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={perm.id}
                                                                    disabled={!canManage || selectedRole.name === 'admin' || gated}
                                                                    checked={isChecked}
                                                                    onCheckedChange={() => togglePermission(perm.id)}
                                                                    className={cn(
                                                                        "data-[state=checked]:bg-primary data-[state=checked]:text-black border-slate-600 mt-0.5",
                                                                        gated && "!opacity-30 !cursor-not-allowed"
                                                                    )}
                                                                />
                                                                <div className="grid gap-1 leading-snug pt-0.5">
                                                                    <label
                                                                        htmlFor={gated ? undefined : perm.id}
                                                                        className={cn(
                                                                            "text-sm font-medium transition-colors",
                                                                            gated
                                                                                ? "text-slate-600 cursor-not-allowed"
                                                                                : "text-slate-200 cursor-pointer hover:text-primary"
                                                                        )}
                                                                    >
                                                                        {(t.adminSettings.roleSettings as any).permissionLabels?.[perm.id] || perm.display_name}
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{perm.id}</p>
                                                                        {gated && (
                                                                            <span className="text-[10px] text-amber-500/70 font-medium flex items-center gap-1 mt-0.5">
                                                                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                                                                {locale === 'vi' ? 'Cần bật quyền Xem trước' : 'Requires View permission'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            {t.adminSettings.roleSettings.selectRole}
                        </div>
                    )}
                </div>

                {/* CREATE ROLE DIALOG */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>{t.adminSettings.roleSettings.createRole.title}</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                {t.adminSettings.roleSettings.createRole.modalDescription}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t.adminSettings.roleSettings.createRole.displayName} <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder={t.adminSettings.roleSettings.createRole.displayNamePlaceholder}
                                    className="bg-slate-800 border-slate-700"
                                    value={newRoleData.display_name}
                                    onChange={e => setNewRoleData(p => ({
                                        ...p,
                                        display_name: e.target.value,
                                        name: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t.adminSettings.roleSettings.createRole.roleId} <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder={t.adminSettings.roleSettings.createRole.roleIdPlaceholder}
                                    className="bg-slate-800 border-slate-700 font-mono"
                                    value={newRoleData.name}
                                    onChange={e => setNewRoleData(p => ({ ...p, name: e.target.value }))}
                                />
                                <p className="text-xs text-slate-500">{t.adminSettings.roleSettings.createRole.roleIdNote}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t.adminSettings.roleSettings.createRole.descriptionLabel}</label>
                                <Textarea
                                    placeholder={t.adminSettings.roleSettings.createRole.descriptionPlaceholder}
                                    className="bg-slate-800 border-slate-700"
                                    value={newRoleData.description}
                                    onChange={e => setNewRoleData(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>{t.adminSettings.roleSettings.createRole.cancel}</Button>
                            <Button
                                className="bg-primary text-black hover:bg-primary/90"
                                onClick={handleCreateRole}
                                disabled={isCreating}
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {t.adminSettings.roleSettings.createRole.create}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* EDIT ROLE INFO DIALOG */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>{t.adminSettings.roleSettings.editRole.title}</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                {t.adminSettings.roleSettings.createRole.modalDescription}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t.adminSettings.roleSettings.editRole.displayName} <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder={t.adminSettings.roleSettings.createRole.displayNamePlaceholder}
                                    className="bg-slate-800 border-slate-700"
                                    value={editRoleData.display_name}
                                    onChange={e => setEditRoleData(p => ({ ...p, display_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t.adminSettings.roleSettings.editRole.description}</label>
                                <Textarea
                                    placeholder={t.adminSettings.roleSettings.createRole.descriptionPlaceholder}
                                    className="bg-slate-800 border-slate-700"
                                    value={editRoleData.description}
                                    onChange={e => setEditRoleData(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>{t.adminSettings.roleSettings.createRole.cancel}</Button>
                            <Button
                                className="bg-primary text-black hover:bg-primary/90"
                                onClick={handleUpdateRoleInfo}
                                disabled={isUpdatingInfo}
                            >
                                {isUpdatingInfo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {t.adminSettings.roleSettings.actions.save}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

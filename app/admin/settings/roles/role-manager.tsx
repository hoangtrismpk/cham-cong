'use client'

import { useState } from 'react'
import { Role, Permission, updateRolePermissions, createRole, deleteRole } from '@/app/actions/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Shield, Save, Check, Loader2, Search, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RoleManagerProps {
    roles: Role[]
    permissions: Permission[]
}

export function RoleManager({ roles, permissions }: RoleManagerProps) {
    const router = useRouter()
    const [selectedRole, setSelectedRole] = useState<Role>(roles[0] || null)
    const [unsavedPermissions, setUnsavedPermissions] = useState<string[]>(roles[0]?.permissions || [])
    const [isSaving, setIsSaving] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // New Role Form
    const [newRoleData, setNewRoleData] = useState({ name: '', display_name: '', description: '' })

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = []
        acc[perm.category].push(perm)
        return acc
    }, {} as Record<string, Permission[]>)

    // Handle role selection
    const handleSelectRole = (role: Role) => {
        if (role.name === selectedRole?.name) return
        setSelectedRole(role)
        setUnsavedPermissions(role.permissions || [])
    }

    // Toggle Permission
    const togglePermission = (permId: string) => {
        if (selectedRole?.name === 'admin') return // Admin has all rights

        setUnsavedPermissions(prev => {
            if (prev.includes(permId)) return prev.filter(p => p !== permId)
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
            toast.success('Đã cập nhật quyền hạn')
            // Update local state is handled by revalidation, but for UX let's update reflected role
            // Actually router.refresh() is better
            router.refresh()
        }
        setIsSaving(false)
    }

    // Create Role
    const handleCreateRole = async () => {
        if (!newRoleData.display_name || !newRoleData.name) {
            toast.error('Vui lòng điền đầy đủ tên và mã')
            return
        }
        setIsCreating(true)
        const res = await createRole(newRoleData)
        setIsCreating(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Tạo vai trò thành công')
            setIsCreateModalOpen(false)
            setNewRoleData({ name: '', display_name: '', description: '' })
            router.refresh()
        }
    }

    // Delete Role
    const handleDeleteRole = async (roleId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa vai trò này? Hành động này không thể hoàn tác.')) return

        const res = await deleteRole(roleId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Đã xóa vai trò')
            // Select admin as fallback
            const admin = roles.find(r => r.name === 'admin')
            if (admin) handleSelectRole(admin)
            router.refresh()
        }
    }

    // Checking if dirty
    const isDirty = JSON.stringify(unsavedPermissions.sort()) !== JSON.stringify((selectedRole?.permissions || []).sort())

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            {/* LEFT SIDEBAR: ROLES LIST */}
            <div className="w-1/4 min-w-[280px] bg-[#161b22] border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Vai trò hệ thống
                        </h3>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-primary text-black hover:bg-primary/90"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Mới
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input placeholder="Tìm kiếm vai trò..." className="pl-9 bg-slate-900 border-slate-700" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {roles.map(role => (
                        <div
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={cn(
                                "flex items-center justify-between p-3 mb-1 rounded-lg cursor-pointer transition-all border border-transparent",
                                selectedRole?.id === role.id
                                    ? "bg-primary/10 border-primary/20"
                                    : "hover:bg-slate-800 hover:border-slate-700"
                            )}
                        >
                            <div>
                                <div className={cn(
                                    "font-bold text-sm",
                                    selectedRole?.id === role.id ? "text-primary" : "text-slate-200"
                                )}>
                                    {role.display_name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                                    {role.permissions.length === 1 && role.permissions[0] === '*' ? 'FULL ACCESS' : `${role.permissions.length} quyền`}
                                </div>
                            </div>

                            {!role.is_system_role && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-red-400"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteRole(role.id)
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            {role.is_system_role && (
                                <Badge variant="secondary" className="text-[9px] h-5 bg-slate-700 text-slate-400">System</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: PERMISSIONS MATRIX */}
            <div className="flex-1 bg-[#161b22] border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                {selectedRole ? (
                    <>
                        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-white">{selectedRole.display_name}</h2>
                                    {selectedRole.is_system_role && <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">Default</Badge>}
                                </div>
                                <p className="text-slate-400 mt-1 max-w-2xl">{selectedRole.description || 'Không có mô tả'}</p>
                                <div className="text-xs text-slate-500 font-mono mt-2 flex items-center gap-2">
                                    <span className="bg-slate-800 px-2 py-0.5 rounded">ID: {selectedRole.name}</span>
                                    {selectedRole.name === 'admin' && <span className="text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Admin có toàn quyền (Không thể chỉnh sửa)</span>}
                                </div>
                            </div>

                            {selectedRole.name !== 'admin' && (
                                <Button
                                    onClick={handleSave}
                                    disabled={!isDirty || isSaving}
                                    className="min-w-[120px]"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Lưu thay đổi
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {selectedRole.name === 'admin' ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50">
                                    <Shield className="h-24 w-24 text-primary mb-4" />
                                    <h3 className="text-xl font-bold text-white">Administrator Access</h3>
                                    <p className="text-slate-400 max-w-md mt-2">Vai trò Admin có toàn quyền truy cập hệ thống mặc định. Bạn không cần (và không thể) cấu hình quyền hạn cho vai trò này.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <Card key={category} className="bg-[#0d1117] border-slate-700 shadow-sm">
                                            <CardHeader className="pb-3 border-b border-slate-800">
                                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">
                                                    {category}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-3">
                                                {perms.map(perm => (
                                                    <div key={perm.id} className="flex items-start gap-3 select-none">
                                                        <Checkbox
                                                            id={perm.id}
                                                            checked={unsavedPermissions.includes(perm.id) || unsavedPermissions.includes('*')}
                                                            onCheckedChange={() => togglePermission(perm.id)}
                                                            className="data-[state=checked]:bg-primary data-[state=checked]:text-black border-slate-600 mt-0.5"
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label
                                                                htmlFor={perm.id}
                                                                className="text-sm font-medium leading-none text-slate-200 cursor-pointer hover:text-primary transition-colors"
                                                            >
                                                                {perm.display_name}
                                                            </label>
                                                            <p className="text-[11px] text-slate-500 font-mono">{perm.id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        Chọn một vai trò để xem chi tiết
                    </div>
                )}
            </div>

            {/* CREATE ROLE DIALOG */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Tạo vai trò mới</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Định nghĩa tên và mã định danh cho nhóm quyền mới.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên hiển thị <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="Ví dụ: Senior Manager"
                                className="bg-slate-800 border-slate-700"
                                value={newRoleData.display_name}
                                onChange={e => setNewRoleData(p => ({ ...p, display_name: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mã định danh (ID) <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="senior_manager"
                                className="bg-slate-800 border-slate-700 font-mono"
                                value={newRoleData.name}
                                onChange={e => setNewRoleData(p => ({ ...p, name: e.target.value }))}
                            />
                            <p className="text-xs text-slate-500">Dùng để định danh trong hệ thống (không dấu, không khoảng trắng).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mô tả</label>
                            <Textarea
                                placeholder="Mô tả trách nhiệm của vai trò này..."
                                className="bg-slate-800 border-slate-700"
                                value={newRoleData.description}
                                onChange={e => setNewRoleData(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
                        <Button
                            className="bg-primary text-black hover:bg-primary/90"
                            onClick={handleCreateRole}
                            disabled={isCreating}
                        >
                            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Tạo vai trò
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

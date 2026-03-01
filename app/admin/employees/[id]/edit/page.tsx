'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from '@/contexts/i18n-context'
import { getEmployeeById, updateEmployee, getDepartments, getRoles, getManagers, Employee } from '@/app/actions/employees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PasswordResetManager } from './PasswordResetManager'

export default function EditEmployeePage() {
    const params = useParams()
    const router = useRouter()
    const { t } = useI18n()
    const employeeId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [departments, setDepartments] = useState<string[]>([])
    const [roles, setRoles] = useState<any[]>([])
    const [managers, setManagers] = useState<any[]>([])

    // Form state
    const [formData, setFormData] = useState<Partial<Employee>>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        employee_code: '',
        job_title: '',
        department: '',
        contract_type: '',
        role_id: '',
        start_date: '',
        dob: '',
        gender: null,
        status: 'active',
        skills: [],
        emergency_contact: null
    })

    // Load employee data
    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // Load employee
            const result = await getEmployeeById(employeeId)
            if (result.error || !result.employee) {
                toast.error(t.admin.edit.notFound)
                router.push('/admin/employees')
                return
            }

            // Load departments, roles, and managers
            const [depts, rolesData, managersData] = await Promise.all([
                getDepartments(),
                getRoles(),
                getManagers()
            ])

            setDepartments(depts)
            setRoles(rolesData)
            setManagers(managersData)
            setFormData(result.employee)
            setLoading(false)
        }
        loadData()
    }, [employeeId, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const result = await updateEmployee(employeeId, formData)

            if ('error' in result) {
                toast.error(result.error)
            } else {
                toast.success(t.admin.edit.success)
                router.push(`/admin/employees/${employeeId}`)
            }
        } catch (error) {
            toast.error(t.admin.edit.error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-slate-400">{t.admin.detail.messages.loading}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Header */}
            <div className="bg-[#161b22] border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-8 py-6">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                        <Link href="/admin" className="hover:text-white transition-colors">
                            {t.admin.detail.breadcrumbAdmin}
                        </Link>
                        <span>/</span>
                        <Link href="/admin/employees" className="hover:text-white transition-colors">
                            {t.admin.detail.breadcrumbList}
                        </Link>
                        <span>/</span>
                        <Link href={`/admin/employees/${employeeId}`} className="hover:text-white transition-colors">
                            {formData.full_name}
                        </Link>
                        <span>/</span>
                        <span className="text-primary">{t.common.edit}</span>
                    </div>

                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{t.admin.edit.title}</h1>
                            <p className="text-slate-400">
                                {t.admin.edit.subtitle.replace('employee', formData.full_name || '')}
                            </p>
                        </div>
                        <Link href={`/admin/employees/${employeeId}`}>
                            <Button variant="outline" className="bg-slate-800 border-slate-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t.common.back}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-5xl mx-auto px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <Card className="bg-[#161b22] border-slate-800">
                        <CardHeader>
                            <CardTitle>{t.admin.edit.sections.account}</CardTitle>
                            <CardDescription className="text-slate-400">
                                {t.admin.employeeManagement.create.desc}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">{t.admin.employeeManagement.create.firstName} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">{t.admin.employeeManagement.create.lastName} <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t.admin.employeeManagement.create.email}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t.admin.detail.labels.phone}</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dob">{t.admin.detail.labels.dob}</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob || ''}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">{t.admin.detail.labels.gender}</Label>
                                    <Select
                                        value={formData.gender || undefined}
                                        onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue placeholder="Chọn giới tính" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">{t.common.male || 'Male'}</SelectItem>
                                            <SelectItem value="Female">{t.common.female || 'Female'}</SelectItem>
                                            <SelectItem value="Other">{t.common.other || 'Other'}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address">{t.admin.detail.labels.address}</Label>
                                    <Input
                                        id="address"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">Thành phố</Label>
                                    <Input
                                        id="city"
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Work Information */}
                    <Card className="bg-[#161b22] border-slate-800">
                        <CardHeader>
                            <CardTitle>{t.admin.edit.sections.internal}</CardTitle>
                            <CardDescription className="text-slate-400">
                                {t.admin.employeeManagement.subtitle}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="employee_code">{t.admin.employeeManagement.create.employeeCode}</Label>
                                    <Input
                                        id="employee_code"
                                        value={formData.employee_code || ''}
                                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="job_title">{t.admin.employeeManagement.create.jobTitle}</Label>
                                    <Input
                                        id="job_title"
                                        value={formData.job_title || ''}
                                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="department">{t.admin.detail.labels.department}</Label>
                                    <Select
                                        value={formData.department || undefined}
                                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue placeholder={t.admin.employeeManagement.create.selectDept} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contract_type">{t.admin.employeeManagement.create.contractType}</Label>
                                    <Select
                                        value={formData.contract_type || undefined}
                                        onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue placeholder={t.admin.employeeManagement.create.selectContractType} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="full-time">{t.admin.employeeManagement.create.contractTypes.fullTime}</SelectItem>
                                            <SelectItem value="part-time">{t.admin.employeeManagement.create.contractTypes.partTime}</SelectItem>
                                            <SelectItem value="intern">{t.admin.employeeManagement.create.contractTypes.intern}</SelectItem>
                                            <SelectItem value="probation">{t.admin.employeeManagement.create.contractTypes.probation}</SelectItem>
                                            <SelectItem value="freelance">{t.admin.employeeManagement.create.contractTypes.freelance}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role_id">{t.admin.employeeManagement.create.role}</Label>
                                    <Select
                                        value={formData.role_id || undefined}
                                        onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue placeholder={t.admin.employeeManagement.create.selectRole} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => {
                                                const label = (t.adminSettings.roleSettings as any).roleLabels?.[role.name] || role.display_name;
                                                return (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {label}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manager_id">{t.admin.detail.labels.manager}</Label>
                                    <Select
                                        value={formData.manager_id || 'none'}
                                        onValueChange={(value) => setFormData({ ...formData, manager_id: value === 'none' ? null : value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue placeholder="Chọn người quản lý" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-slate-500 italic">{t.common.none || 'None'}</SelectItem>
                                            {managers.map((mgr) => (
                                                <SelectItem key={mgr.id} value={mgr.id}>
                                                    {mgr.full_name} ({mgr.employee_code || 'N/A'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">{t.admin.detail.labels.joined}</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date || ''}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">{t.admin.employeeManagement.filters.status}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t.admin.detail.statusActive}</SelectItem>
                                            <SelectItem value="inactive">{t.admin.detail.statusInactive}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card className="bg-[#161b22] border-slate-800">
                        <CardHeader>
                            <CardTitle>{t.admin.detail.sections.emergency}</CardTitle>
                            <CardDescription className="text-slate-400">
                                {t.admin.detail.emergencyLabels.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ec_name">{t.admin.detail.emergencyLabels.name}</Label>
                                    <Input
                                        id="ec_name"
                                        value={(formData.emergency_contact as any)?.name || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: {
                                                ...(formData.emergency_contact as any || {}),
                                                name: e.target.value
                                            }
                                        })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ec_phone">{t.admin.detail.emergencyLabels.phone}</Label>
                                    <Input
                                        id="ec_phone"
                                        value={(formData.emergency_contact as any)?.phone || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: {
                                                ...(formData.emergency_contact as any || {}),
                                                phone: e.target.value
                                            }
                                        })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ec_relationship">{t.admin.detail.emergencyLabels.relationship}</Label>
                                    <Input
                                        id="ec_relationship"
                                        value={(formData.emergency_contact as any)?.relationship || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            emergency_contact: {
                                                ...(formData.emergency_contact as any || {}),
                                                relationship: e.target.value
                                            }
                                        })}
                                        className="bg-[#0d1117] border-slate-700"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mật khẩu và Bảo mật (PasswordResetManager) */}
                    {formData.id && (
                        <PasswordResetManager
                            employeeId={formData.id}
                            email={formData.email || ''}
                            employeeName={formData.full_name || ''}
                        />
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link href={`/admin/employees/${employeeId}`}>
                            <Button
                                type="button"
                                variant="outline"
                                className="bg-slate-800 border-slate-700"
                            >
                                {t.common.cancel}
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 text-black font-bold"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t.admin.edit.saving}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {t.admin.edit.saveButton}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

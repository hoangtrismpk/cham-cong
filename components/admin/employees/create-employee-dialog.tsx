'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/i18n-context';
import { createEmployee, getDepartments, getRoles, getJobTitles } from '@/app/actions/employees';
import { getOrganizationSettings } from '@/app/actions/organization';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Role {
    id: string;
    name: string;
    display_name: string;
}

export default function CreateEmployeeDialog() {
    const { t } = useI18n();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);

    // Lists for selection
    const [departments, setDepartments] = useState<string[]>([]);
    const [departmentMode, setDepartmentMode] = useState<'select' | 'text'>('select');

    const [jobTitles, setJobTitles] = useState<string[]>([]);
    const [jobTitleMode, setJobTitleMode] = useState<'select' | 'text'>('text');

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [contractType, setContractType] = useState('full-time');
    const [roleId, setRoleId] = useState('');

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open]);

    const fetchData = async () => {
        try {
            const [fetchedRoles, fetchedDepts, fetchedTitles, orgSettings] = await Promise.all([
                getRoles(),
                getDepartments(),
                getJobTitles(),
                getOrganizationSettings()
            ]);
            setRoles(fetchedRoles);

            // LOGIC FOR DEPARTMENTS
            // If settings exist, use strict mode. If not, use mixed mode.
            if (orgSettings.departments && orgSettings.departments.length > 0) {
                setDepartments(orgSettings.departments);
                setDepartmentMode('select');
            } else {
                // Hybrid mode: defaults + dynamic existing
                const defaultDepts = ['Engineering', 'Technician', 'Human Resources', 'Sales', 'Marketing', 'Product', 'Design', 'Customer Support', 'Finance', 'Operations', 'Management'];
                const uniqueDepts = Array.from(new Set([...defaultDepts, ...(fetchedDepts || [])])).sort();
                setDepartments(uniqueDepts);
                setDepartmentMode('select');
            }

            // LOGIC FOR JOB TITLES
            if (orgSettings.job_titles && orgSettings.job_titles.length > 0) {
                setJobTitles(orgSettings.job_titles);
                setJobTitleMode('select');
            } else {
                setJobTitleMode('text'); // Default to free text
            }

        } catch (error) {
            console.error('Failed to fetch roles/depts', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await createEmployee({
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                department,
                job_title: jobTitle,
                employee_code: employeeCode,
                contract_type: contractType,
                role_id: roleId
            });

            if ('error' in result) {
                toast.error(result.error);
            } else {
                toast.success(t.admin.employeeManagement.create.success);
                setOpen(false);
                resetForm();
                router.refresh();
            }
        } catch (error) {
            toast.error(t.admin.employeeManagement.create.error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setDepartment('');
        setJobTitle('');
        setEmployeeCode('');
        setContractType('full-time');
        setRoleId('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                    <Plus className="w-4 h-4 mr-2" />
                    {t.admin.employeeManagement.addNew}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-[#1a1f2e] border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{t.admin.employeeManagement.create.title}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {t.admin.employeeManagement.create.desc}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Employee Code & Name */}
                    <div className="space-y-2">
                        <Label>{t.admin.employeeManagement.create.employeeCode} <span className="text-red-500">*</span></Label>
                        <Input
                            required
                            placeholder="EMP-001"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                            className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26] transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t.admin.employeeManagement.create.firstName} <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.admin.employeeManagement.create.lastName} <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t.admin.employeeManagement.create.email} <span className="text-red-500">*</span></Label>
                        <Input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26] transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t.admin.employeeManagement.create.password} <span className="text-red-500">*</span></Label>
                        <Input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26] transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Department Selection */}
                        <div className="space-y-2">
                            <Label>{t.admin.employeeManagement.create.department}</Label>
                            {departmentMode === 'select' ? (
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="bg-[#0d1117] border-slate-700 text-white w-full h-10">
                                        <SelectValue placeholder={t.admin.employeeManagement.create.selectDept} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1f2e] border-slate-800 text-white max-h-[200px] overflow-y-auto">
                                        {departments.map(dept => (
                                            <SelectItem
                                                key={dept}
                                                value={dept}
                                                className="cursor-pointer hover:bg-slate-800/50"
                                            >
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26]"
                                />
                            )}
                        </div>

                        {/* Job Title Selection */}
                        <div className="space-y-2">
                            <Label>{t.admin.employeeManagement.create.jobTitle}</Label>
                            {jobTitleMode === 'select' ? (
                                <Select value={jobTitle} onValueChange={setJobTitle}>
                                    <SelectTrigger className="bg-[#0d1117] border-slate-700 text-white w-full h-10">
                                        <SelectValue placeholder={t.admin.employeeManagement.create.selectJobTitle} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1f2e] border-slate-800 text-white max-h-[200px] overflow-y-auto">
                                        {jobTitles.map(title => (
                                            <SelectItem
                                                key={title}
                                                value={title}
                                                className="cursor-pointer hover:bg-slate-800/50"
                                            >
                                                {title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="bg-[#0d1117] border-slate-700 text-white focus:bg-[#161b26]"
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t.admin.employeeManagement.create.contractType} <span className="text-red-500">*</span></Label>
                        <Select value={contractType} onValueChange={setContractType} required>
                            <SelectTrigger className="bg-[#0d1117] border-slate-700 text-white w-full h-10">
                                <SelectValue placeholder={t.admin.employeeManagement.create.selectContractType} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1f2e] border-slate-800 text-white">
                                <SelectItem value="full-time" className="cursor-pointer hover:bg-slate-800/50">{t.admin.employeeManagement.create.contractTypes.fullTime}</SelectItem>
                                <SelectItem value="part-time" className="cursor-pointer hover:bg-slate-800/50">{t.admin.employeeManagement.create.contractTypes.partTime}</SelectItem>
                                <SelectItem value="intern" className="cursor-pointer hover:bg-slate-800/50">{t.admin.employeeManagement.create.contractTypes.intern}</SelectItem>
                                <SelectItem value="probation" className="cursor-pointer hover:bg-slate-800/50">{t.admin.employeeManagement.create.contractTypes.probation}</SelectItem>
                                <SelectItem value="freelance" className="cursor-pointer hover:bg-slate-800/50">{t.admin.employeeManagement.create.contractTypes.freelance}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{t.admin.employeeManagement.create.role}</Label>
                        <Select value={roleId} onValueChange={setRoleId}>
                            <SelectTrigger className="bg-[#0d1117] border-slate-700 text-white w-full h-10">
                                <SelectValue placeholder={t.admin.employeeManagement.create.selectRole} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1f2e] border-slate-800 text-white">
                                {roles.map(role => (
                                    <SelectItem
                                        key={role.id}
                                        value={role.id}
                                        className="cursor-pointer hover:bg-slate-800/50"
                                    >
                                        {role.display_name || role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                            {t.admin.employeeManagement.create.cancel}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t.admin.employeeManagement.create.loading : t.admin.employeeManagement.create.submit}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

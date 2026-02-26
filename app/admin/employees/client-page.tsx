/**
 * Employee Management Page - Client Side
 * Matches the original Chronos Admin employee management interface
 * Created: 2026-02-07
 * Updated: Add translations (i18n)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Search, ChevronLeft, ChevronRight,
    MoreVertical, Plus, Filter, Download, Check, Trash2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useI18n } from '@/contexts/i18n-context';
import CreateEmployeeDialog from '@/components/admin/employees/create-employee-dialog';
import { getDepartments } from '@/app/actions/employees';
import { usePermissions } from '@/contexts/permission-context';


interface Employee {
    id: string;
    numeric_id?: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone?: string;
    dob?: string;
    gender?: string;
    address?: string;
    city?: string;
    employee_code?: string;
    job_title?: string;
    department?: string;
    status: string;
    start_date?: string;
    avatar_url?: string;
    emergency_contact?: any;
    roles?: { display_name: string };
    manager?: { full_name: string; employee_code: string };
}

export default function EmployeesClientPage() {
    const { t } = useI18n();
    const { can } = usePermissions();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [deptList, setDeptList] = useState<string[]>([]);

    // Constants
    const limit = 10;

    // Load static data once
    useEffect(() => {
        loadDepartments();
    }, []);

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchDebounce(searchTerm);
            setPage(1); // Reset to page 1 when search changes
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Fetch data when filters or page change
    useEffect(() => {
        loadEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchDebounce, deptFilter, statusFilter, roleFilter]);

    const loadDepartments = async () => {
        const depts = await getDepartments();
        setDeptList(depts);
    };

    const loadEmployees = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            if (searchDebounce) params.append('search', searchDebounce);
            if (deptFilter !== 'all') params.append('department', deptFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (roleFilter !== 'all') params.append('role', roleFilter);

            const response = await fetch(`/api/employees?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setEmployees(result.data || []);
                setTotalPages(result.meta.totalPages || 1);
                setTotalEmployees(result.meta.total || 0);
            } else {
                // Determine if it was a 404 (no data) or actual error
                if (response.status === 404) {
                    setEmployees([]);
                }
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

    // Extract unique values for filters (Roles from current view is not ideal but acceptable for filter list if dynamic API not available)
    const departments = ['all', ...deptList];
    // In a real server-side scenario, we should fetch roles lists separately, but for now we hardcode or keep lightweight
    // We'll keep the predefined filters for roles based on common roles or fetch them properly if an API existed.
    // For now let's assume standard roles since we can't extract all roles from partial data.
    const roles = ['all', 'Admin', 'Manager', 'Human Resources', 'Accountant', 'Member'];
    const statuses = ['all', 'active', 'inactive'];

    const handleExport = () => {
        // Warning: Exporting only current page in server-side pagination, or need a separate "Export All" API
        // For better UX, we'll implement a separate "Export All" functionality or warn the user.
        // For now, let's export ALL matches by making a separate large request (careful with performance)
        exportAllEmployees();
    };

    const exportAllEmployees = async () => {
        const loadingToast = toast.loading('Đang chuẩn bị dữ liệu xuất...');
        try {
            // Build query params for ALL data
            const params = new URLSearchParams();
            params.append('page', '1');
            params.append('limit', '1000'); // Limit to 1000 for safety
            if (searchDebounce) params.append('search', searchDebounce);
            if (deptFilter !== 'all') params.append('department', deptFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (roleFilter !== 'all') params.append('role', roleFilter);

            const response = await fetch(`/api/employees?${params.toString()}`);
            const result = await response.json();
            const allData = result.data || [];

            if (allData.length === 0) {
                toast.dismiss(loadingToast);
                toast.error('Không có dữ liệu để xuất');
                return;
            }

            const exportData = allData.map((emp: Employee) => {
                const emergencyRaw = emp.emergency_contact;
                const emergency = Array.isArray(emergencyRaw) ? (emergencyRaw[0] || {}) : (emergencyRaw || {});

                return {
                    firstName: emp.first_name || '',
                    lastName: emp.last_name || '',
                    email: emp.email,
                    phone: emp.phone || 'N/A',
                    empCode: emp.employee_code || `EMP-${emp.id.substring(0, 4).toUpperCase()}`,
                    job: emp.job_title || 'N/A',
                    dept: emp.department || 'N/A',
                    role: emp.roles?.display_name || 'Thành viên',
                    manager: emp.manager ? `${emp.manager.full_name}` : 'N/A',
                    status: emp.status === 'active' ? 'Active' : 'Inactive',
                };
            });

            const columns = [
                { header: 'Họ', key: 'firstName', width: 20 },
                { header: 'Tên', key: 'lastName', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Số điện thoại', key: 'phone', width: 15 },
                { header: 'Mã nhân viên', key: 'empCode', width: 15 },
                { header: 'Chức danh', key: 'job', width: 20 },
                { header: 'Phòng ban', key: 'dept', width: 20 },
                { header: 'Vai trò', key: 'role', width: 15 },
                { header: 'Người quản lý trực tiếp', key: 'manager', width: 25 },
                { header: 'Trạng thái', key: 'status', width: 10 }
            ]

            import('@/lib/export-utils').then(({ exportToExcel }) => {
                exportToExcel(exportData, `Danh_sach_nhan_vien_${new Date().toISOString().split('T')[0]}.xlsx`, 'Danh sách nhân viên', columns)
                toast.dismiss(loadingToast);
                toast.success('Đã xuất danh sách thành công');
            })

        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error('Lỗi khi xuất dữ liệu');
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117]">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t.admin.employeeManagement.title}
                    </h1>
                    <p className="text-slate-400">
                        {t.admin.employeeManagement.subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="bg-[#1a1f2e] border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={handleExport}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t.admin.employeeManagement.export}
                    </Button>
                    {can('users.create') && <CreateEmployeeDialog />}
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="bg-[#1a1f2e] border-slate-800/50 p-4 mb-6 shadow-md">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder={t.admin.employeeManagement.searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-[#0d1117] border-slate-700/50 text-white placeholder-slate-500 w-full focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {/* Department Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[140px] justify-between">
                                    <span className="truncate max-w-[100px]">
                                        {deptFilter === 'all' ? t.admin.employeeManagement.filters.department : deptFilter}
                                    </span>
                                    <ChevronRight className="w-4 h-4 rotate-90 shrink-0 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-700 text-slate-300 w-56 max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel>{t.admin.employeeManagement.filters.department}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-700/50" />
                                {departments.map(dept => (
                                    <DropdownMenuItem
                                        key={dept as string}
                                        onClick={() => { setDeptFilter(dept as string); setPage(1); }}
                                        className="justify-between cursor-pointer"
                                    >
                                        {dept === 'all' ? 'All Departments' : dept}
                                        {deptFilter === dept && <Check className="h-4 w-4 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Status Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[120px] justify-between">
                                    {statusFilter === 'all' ? t.admin.employeeManagement.filters.status : (statusFilter === 'active' ? 'Active' : 'Inactive')}
                                    <ChevronRight className="w-4 h-4 rotate-90 shrink-0 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-700 text-slate-300 w-48">
                                <DropdownMenuLabel>{t.admin.employeeManagement.filters.status}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-700/50" />
                                {statuses.map(status => (
                                    <DropdownMenuItem
                                        key={status}
                                        onClick={() => { setStatusFilter(status); setPage(1); }}
                                        className="justify-between cursor-pointer"
                                    >
                                        {status === 'all' ? 'All Statuses' : (status === 'active' ? 'Active' : 'Inactive')}
                                        {statusFilter === status && <Check className="h-4 w-4 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Role Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[120px] justify-between">
                                    <span className="truncate max-w-[80px]">
                                        {roleFilter === 'all' ? t.admin.employeeManagement.filters.role : roleFilter}
                                    </span>
                                    <ChevronRight className="w-4 h-4 rotate-90 shrink-0 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-700 text-slate-300 w-56">
                                <DropdownMenuLabel>{t.admin.employeeManagement.filters.role}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-700/50" />
                                {roles.map(role => (
                                    <DropdownMenuItem
                                        key={role as string}
                                        onClick={() => { setRoleFilter(role as string); setPage(1); }}
                                        className="justify-between cursor-pointer"
                                    >
                                        {role === 'all' ? 'All Roles' : role}
                                        {roleFilter === role && <Check className="h-4 w-4 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 w-10 px-0 shrink-0"
                            onClick={() => {
                                setDeptFilter('all');
                                setStatusFilter('all');
                                setRoleFilter('all');
                                setSearchTerm('');
                                setPage(1);
                            }}
                            title="Reset Filters"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Employee Table */}
            <Card className="bg-[#1a1f2e] border-slate-800/50 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800/50 bg-[#161b26]">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-[80px]">
                                    {t.admin.employeeManagement.table.user}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t.admin.employeeManagement.table.fullName}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t.admin.employeeManagement.table.employeeId}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t.admin.employeeManagement.table.department}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t.admin.employeeManagement.table.status}
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-[100px]">
                                    {t.admin.employeeManagement.table.actions}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                                        {loading ? (
                                            <div className="flex flex-col justify-center items-center">
                                                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <span className="text-sm">{t.admin.employeeManagement.table.loading}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col justify-center items-center">
                                                <span className="text-4xl mb-2">🔍</span>
                                                <span className="text-lg font-medium text-slate-300">{t.admin.employeeManagement.table.noData}</span>
                                                <span className="text-sm text-slate-500 mt-1">{t.admin.employeeManagement.table.tryAdjust}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee, idx) => {
                                    const displayId = employee.numeric_id ? employee.numeric_id.toString().padStart(6, '0') : employee.id;

                                    return (
                                        <tr key={employee.id} className="hover:bg-[#1c2128] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                                                    {employee.avatar_url ? (
                                                        <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        employee.full_name?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                                        <Link href={`/admin/employees/${displayId}`}>
                                                            {employee.full_name || 'N/A'}
                                                        </Link>
                                                    </span>
                                                    <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                                        {employee.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-300 font-mono bg-[#0d1117] px-2 py-1 rounded border border-slate-800">
                                                    {employee.employee_code || displayId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-300">
                                                    {employee.department || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                                                    {t.admin.employeeManagement.table.active}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-700 text-slate-300 w-48 shadow-xl">
                                                        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-3 py-2">
                                                            {t.admin.employeeManagement.actions.title}
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-slate-700/50" />

                                                        {can('users.edit') && (
                                                            <DropdownMenuItem asChild className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors group/item">
                                                                <Link href={`/admin/employees/${displayId}/edit`}>
                                                                    <span className="flex items-center w-full">{t.admin.employeeManagement.actions.editProfile}</span>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}

                                                        {can('users.edit') && (
                                                            <DropdownMenuItem asChild className="hover:bg-blue-600/10 focus:bg-blue-600/10 text-blue-400 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                                <Link href={`/admin/employees/${displayId}/employment`}>
                                                                    {t.admin.employeeManagement.actions.manageEmployment}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}

                                                        {can('users.delete') && (
                                                            <>
                                                                <DropdownMenuSeparator className="bg-slate-700/50" />
                                                                <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                                    {t.admin.employeeManagement.actions.deactivate}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between bg-[#1a1f2e]">
                    <div className="text-sm text-slate-400 hidden md:block">
                        {t.admin.employeeManagement.pagination.showing} <span className="font-medium text-white">{employees.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> {t.admin.employeeManagement.pagination.to} <span className="font-medium text-white">{Math.min(page * limit, totalEmployees)}</span> {t.admin.employeeManagement.pagination.of} <span className="font-medium text-white">{totalEmployees}</span> {t.admin.employeeManagement.pagination.employees}
                    </div>
                    <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-9 w-9 p-0 border-slate-700 bg-[#0d1117] hover:bg-slate-800 text-white disabled:opacity-30 disabled:border-slate-800 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="mx-2 text-sm text-slate-400 font-medium md:hidden">
                            {t.admin.employeeManagement.pagination.page} {page} / {Math.max(1, totalPages)}
                        </span>

                        <div className="hidden md:flex space-x-1">
                            {/* Simple pagination logic: Show previous, current, next */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                                .map((p, i, arr) => {
                                    // Add ellipsis
                                    if (i > 0 && p - arr[i - 1] > 1) {
                                        return (
                                            <span key={`ellipsis-${p}`} className="px-2 text-slate-500">...</span>
                                        );
                                    }
                                    return (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(p)}
                                            className={`h-9 w-9 p-0 font-medium transition-colors ${page === p
                                                ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-lg shadow-blue-900/20"
                                                : "border-slate-700 bg-[#0d1117] hover:bg-slate-800 text-slate-400 hover:text-white"
                                                }`}
                                        >
                                            {p}
                                        </Button>
                                    );
                                })}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="h-9 w-9 p-0 border-slate-700 bg-[#0d1117] hover:bg-slate-800 text-white disabled:opacity-30 disabled:border-slate-800 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

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
import * as XLSX from 'xlsx';

interface Employee {
    id: string;
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
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [deptList, setDeptList] = useState<string[]>([]);
    const limit = 10;

    useEffect(() => {
        loadEmployees();
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        const depts = await getDepartments();
        setDeptList(depts);
    };

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/employees');
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

    // Extract unique values for filters
    const departments = ['all', ...deptList];
    const roles = ['all', ...Array.from(new Set(employees.map(e => e.roles?.display_name).filter(Boolean)))];
    const statuses = ['all', 'active', 'inactive'];

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
        const matchesRole = roleFilter === 'all' || emp.roles?.display_name === roleFilter;

        return matchesSearch && matchesDept && matchesStatus && matchesRole;
    });

    const totalPages = Math.ceil(filteredEmployees.length / limit);
    // Add defensive check for empty array slicing
    const paginatedEmployees = filteredEmployees.slice(
        Math.max(0, (page - 1) * limit),
        Math.min(filteredEmployees.length, page * limit)
    );

    const handleExport = () => {
        if (employees.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        const exportData = filteredEmployees.map((emp) => {
            const emergencyRaw = emp.emergency_contact;
            const emergency = Array.isArray(emergencyRaw) ? (emergencyRaw[0] || {}) : (emergencyRaw || {});

            return {
                // Personal Information
                'Họ': emp.first_name || '',
                'Tên': emp.last_name || '',
                'Email': emp.email,
                'Số điện thoại': emp.phone || 'N/A',
                'Ngày sinh': emp.dob ? new Date(emp.dob).toLocaleDateString('vi-VN') : 'N/A',
                'Giới tính': emp.gender || 'N/A',
                'Địa chỉ': emp.address || 'N/A',
                'Thành phố': emp.city || 'N/A',

                // Work Information
                'Mã nhân viên': emp.employee_code || `EMP-${emp.id.substring(0, 4).toUpperCase()}`,
                'Chức danh': emp.job_title || 'N/A',
                'Phòng ban': emp.department || 'N/A',
                'Vai trò': emp.roles?.display_name || 'Thành viên',
                'Người quản lý trực tiếp': emp.manager ? `${emp.manager.full_name}${emp.manager.employee_code ? ` (${emp.manager.employee_code})` : ''}` : 'N/A',
                'Ngày bắt đầu': emp.start_date ? new Date(emp.start_date).toLocaleDateString('vi-VN') : 'N/A',
                'Trạng thái': emp.status === 'active' ? 'Active' : 'Inactive',

                // Emergency Contact
                'Tên người liên hệ khẩn cấp': emergency.name || 'N/A',
                'SĐT người liên hệ khẩn cấp': emergency.phone || 'N/A',
                'Mối quan hệ khẩn cấp': emergency.relationship || 'N/A',
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto-size columns
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân viên');

        XLSX.writeFile(wb, `Danh_sach_nhan_vien_chi_tiet_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Đã xuất danh sách nhân viên chi tiết thành công');
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
                    <CreateEmployeeDialog />
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
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
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
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-slate-700 text-slate-300 w-56">
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
                            {paginatedEmployees.length === 0 ? (
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
                                paginatedEmployees.map((employee, idx) => (
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
                                                    {employee.full_name || 'N/A'}
                                                </span>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                                    {employee.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-300 font-mono bg-[#0d1117] px-2 py-1 rounded border border-slate-800">
                                                EMP-{employee.id.substring(0, 4).toUpperCase()}
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

                                                    <DropdownMenuItem asChild className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors group/item">
                                                        <Link href={`/admin/employees/${employee.id}/edit`}>
                                                            <span className="flex items-center w-full">{t.admin.employeeManagement.actions.editProfile}</span>
                                                        </Link>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem asChild className="hover:bg-blue-600/10 focus:bg-blue-600/10 text-blue-400 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                        <Link href={`/admin/employees/${employee.id}/employment`}>
                                                            {t.admin.employeeManagement.actions.manageEmployment}
                                                        </Link>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-slate-700/50" />
                                                    <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                        {t.admin.employeeManagement.actions.deactivate}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between bg-[#1a1f2e]">
                    <div className="text-sm text-slate-400 hidden md:block">
                        {t.admin.employeeManagement.pagination.showing} <span className="font-medium text-white">{filteredEmployees.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> {t.admin.employeeManagement.pagination.to} <span className="font-medium text-white">{Math.min(page * limit, filteredEmployees.length)}</span> {t.admin.employeeManagement.pagination.of} <span className="font-medium text-white">{filteredEmployees.length}</span> {t.admin.employeeManagement.pagination.employees}
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
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                const p = i + 1;
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

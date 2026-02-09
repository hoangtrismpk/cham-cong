/**
 * Employee Management Page - Chronos Admin Design
 * Matches the original Chronos Admin employee management interface
 * Created: 2026-02-07
 * Updated: Add missing Edit/Add buttons and link to edit pages
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
    MoreVertical, Plus, Filter, Download
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

interface Employee {
    id: string;
    full_name: string;
    email: string;
    employment_type?: string;
    role_id?: string;
    avatar_url?: string;
    phone?: string;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    useEffect(() => {
        loadEmployees();
    }, []);

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

    const filteredEmployees = employees.filter(emp =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredEmployees.length / limit);
    // Add defensive check for empty array slicing
    const paginatedEmployees = filteredEmployees.slice(
        Math.max(0, (page - 1) * limit),
        Math.min(filteredEmployees.length, page * limit)
    );

    // Fake department data for demo purposes (as requested by design mock)
    const getDepartment = (index: number) => {
        const depts = ['Engineering', 'Product Design', 'Marketing', 'Operations', 'Sales'];
        return depts[index % depts.length];
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117]">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Employee Management
                    </h1>
                    <p className="text-slate-400">
                        Manage and track your organization's human resources.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-[#1a1f2e] border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Link href="/admin/employees/new">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Employee
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="bg-[#1a1f2e] border-slate-800/50 p-4 mb-6 shadow-md">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search by name, ID or email"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 bg-[#0d1117] border-slate-700/50 text-white placeholder-slate-500 w-full focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[140px] justify-between">
                            Department
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[120px] justify-between">
                            Status
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 min-w-[120px] justify-between">
                            Role
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button variant="outline" className="bg-[#0d1117] border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 w-10 px-0 shrink-0">
                            <Filter className="w-4 h-4" />
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
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Full Name
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Employee ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-[100px]">
                                    Actions
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
                                                <span className="text-sm">Loading employees...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col justify-center items-center">
                                                <span className="text-4xl mb-2">🔍</span>
                                                <span className="text-lg font-medium text-slate-300">No employees found</span>
                                                <span className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</span>
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
                                                {getDepartment(idx)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                                                Active
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
                                                        User Actions
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-700/50" />

                                                    <Link href={`/admin/employees/${employee.id}/edit`}>
                                                        <DropdownMenuItem className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors group/item">
                                                            <span className="flex items-center w-full">Edit Profile</span>
                                                        </DropdownMenuItem>
                                                    </Link>

                                                    <Link href={`/admin/employees/${employee.id}/employment`}>
                                                        <DropdownMenuItem className="hover:bg-blue-600/10 focus:bg-blue-600/10 text-blue-400 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                            Manage Employment
                                                        </DropdownMenuItem>
                                                    </Link>

                                                    <DropdownMenuSeparator className="bg-slate-700/50" />
                                                    <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer py-2.5 px-3 rounded-md m-1 transition-colors">
                                                        Deactivate User
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
                        Showing <span className="font-medium text-white">{filteredEmployees.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> to <span className="font-medium text-white">{Math.min(page * limit, filteredEmployees.length)}</span> of <span className="font-medium text-white">{filteredEmployees.length}</span> employees
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
                            Page {page} of {Math.max(1, totalPages)}
                        </span>

                        <div className="hidden md:flex space-x-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                const p = i + 1; // Simplify logic for now
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

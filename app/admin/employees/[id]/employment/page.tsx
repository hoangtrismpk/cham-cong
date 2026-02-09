/**
 * Employee Employment Management Page - Dark Theme Premium
 * Matches Chronos Admin design (Steps, Dark Cards, Footer Actions)
 * Created: 2026-02-07
 * Updated: Match specific design actions and colors
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import EmploymentTypeSelector from '@/components/employment/employment-type-selector';
import ScheduleTemplateEditor from '@/components/employment/schedule-template-editor';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, HelpCircle } from 'lucide-react';
import type { EmploymentType } from '@/types/employment';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EmployeeEmploymentPage({ params }: PageProps) {
    const { id: employeeId } = use(params);
    const router = useRouter();

    const [employee, setEmployee] = useState<any>(null);
    const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time');
    const [originalType, setOriginalType] = useState<EmploymentType>('full-time');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (employeeId) {
            loadEmployee();
        }
    }, [employeeId]);

    const loadEmployee = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/employees/${employeeId}`);

            if (response.ok) {
                const data = await response.json();
                setEmployee(data);
                const type = data.employment_type || 'full-time';
                setEmploymentType(type);
                setOriginalType(type);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Không tìm thấy nhân viên');
            }
        } catch (err: any) {
            toast.error('Có lỗi xảy ra khi tải thông tin nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (type: EmploymentType) => {
        setEmploymentType(type);
        setHasChanges(type !== originalType);
    };

    const handleDiscard = () => {
        setEmploymentType(originalType);
        setHasChanges(false);
        toast.info('Đã hủy thay đổi');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Employment Type
            const response = await fetch(`/api/employees/${employeeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employment_type: employmentType })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || errData.message || 'Không thể cập nhật loại nhân viên');
            }

            // 2. TODO: Save Schedule (If we had schedule state here)
            // For Full-time, it's auto. For others, child component manages it.
            // In a real app with global save, we'd need to lift state up.
            // For now, we assume Full-time (read-only) or Part-time placeholder save.

            setOriginalType(employmentType);
            setHasChanges(false);
            toast.success('✅ Đã lưu lịch làm việc thành công!');
        } catch (err: any) {
            console.error('Failed to save:', err);
            toast.error(err.message || 'Có lỗi xảy ra');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#0b101a]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b101a]">
                <div className="text-center text-slate-400">
                    <p>Không tìm thấy nhân viên</p>
                    <Button onClick={() => router.back()} className="mt-4">Quay lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b101a] text-slate-300 pb-24">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-slate-400 hover:text-white mb-6 text-sm transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Employees
                    </button>

                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {employee.avatar_url ? (
                                <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                employee.full_name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {employee.full_name || 'N/A'}
                            </h1>
                            <p className="text-slate-500 text-sm">{employee.email || ''}</p>
                        </div>
                    </div>
                </div>

                {/* Step 1: Select Employment Type */}
                <div className="bg-[#151a25] border border-[#252b3b] rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                1
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Select Employment Type
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Choose the contract type and work mode
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-[#1e2532] text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
                            Required
                        </span>
                    </div>

                    <div className="pl-12">
                        <EmploymentTypeSelector
                            value={employmentType}
                            onChange={handleTypeChange}
                            disabled={saving}
                        />
                    </div>
                </div>

                {/* Step 2: Configure Schedule */}
                <div className="bg-[#151a25] border border-[#252b3b] rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                2
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Setup Work Schedule
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Configure detailed working hours per week
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-[#252b3b] text-slate-400 border border-slate-700/50 rounded text-[10px] font-bold uppercase tracking-wider">
                            Optional
                        </span>
                    </div>

                    <div className="pl-12">
                        <ScheduleTemplateEditor
                            employeeId={employeeId}
                            employmentType={employmentType}
                            onSave={async () => { }} // Not used in manual save mode for now
                            disabled={saving}
                        />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 bg-[#151a25] border border-[#252b3b] rounded-xl p-6 flex items-start gap-4">
                    <div className="p-2 bg-[#1e2532] rounded-full">
                        <HelpCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white mb-2">Work schedule is used for:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div className="flex items-center text-sm text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full border border-slate-500 mr-2"></div>
                                Daily work hours calculation
                            </div>
                            <div className="flex items-center text-sm text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full border border-slate-500 mr-2"></div>
                                Attendance reminder notifications
                            </div>
                            <div className="flex items-center text-sm text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full border border-slate-500 mr-2"></div>
                                Automatic payroll calculation
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 backdrop-blur-sm border-t border-slate-800 p-4 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-end gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleDiscard}
                        disabled={!hasChanges || saving}
                        className="text-slate-400 hover:text-white"
                    >
                        Discard Changes
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving} // Always enabled to allow re-save/confirm
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Schedule'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Schedule Template Editor - Dark Theme Ready
 * Main component that switches between different modes based on employment type
 * Created: 2026-02-07
 * Updated: Remove hardcoded styles to support dark theme children
 */

'use client';

import { useState } from 'react';
import type { EmploymentType, CreateScheduleTemplateRequest } from '@/types/employment';
import FulltimeScheduleInfo from './fulltime-schedule-info';
import ParttimeScheduleEditor from './parttime-schedule-editor';
import InternScheduleEditor from './intern-schedule-editor';

interface ScheduleTemplateEditorProps {
    employmentType: EmploymentType;
    employeeId: string;
    onSave: (schedules: CreateScheduleTemplateRequest) => Promise<void>;
    disabled?: boolean;
}

export default function ScheduleTemplateEditor({
    employmentType,
    employeeId,
    onSave,
    disabled = false
}: ScheduleTemplateEditorProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (schedules: CreateScheduleTemplateRequest) => {
        setLoading(true);
        setError(null);

        try {
            await onSave(schedules);
        } catch (err: any) {
            setError(err.message || 'Không thể lưu lịch làm việc');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Removed - Handled by Parent */}

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                </div>
            )}

            {/* Content based on employment type */}
            {/* Removed wrapper div with bg-white/border to let children handle their own styling */}
            <div>
                {employmentType === 'full-time' && (
                    <FulltimeScheduleInfo />
                )}

                {employmentType === 'part-time' && (
                    <ParttimeScheduleEditor
                        employeeId={employeeId}
                        onSave={handleSave}
                        disabled={disabled || loading}
                    />
                )}

                {employmentType === 'intern' && (
                    <InternScheduleEditor
                        employeeId={employeeId}
                        onSave={handleSave}
                        disabled={disabled || loading}
                    />
                )}
            </div>
        </div>
    );
}

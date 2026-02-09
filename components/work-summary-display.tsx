/**
 * Work Summary Display Component
 * Displays daily work summary with attendance + leave integration
 * Created: 2026-02-07
 */

'use client';

import { useState, useEffect } from 'react';
import type { DailyWorkSummary } from '@/types/employment';

interface WorkSummaryDisplayProps {
    employeeId: string;
    date: string; // YYYY-MM-DD
}

export default function WorkSummaryDisplay({ employeeId, date }: WorkSummaryDisplayProps) {
    const [summary, setSummary] = useState<DailyWorkSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSummary();
    }, [employeeId, date]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/work-summary?employee_id=${employeeId}&date=${date}`);
            if (response.ok) {
                const { data } = await response.json();
                setSummary(data);
            }
        } catch (error) {
            console.error('Failed to load work summary:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-lg h-32"></div>
        );
    }

    if (!summary) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                Chưa có dữ liệu cho ngày này
            </div>
        );
    }

    const hasLeave = summary.total_leave_hours > 0;
    const isFullDayLeave = summary.has_full_day_leave;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <div className="text-sm opacity-90">Tóm tắt công việc</div>
                        <div className="text-lg font-semibold">
                            {new Date(date).toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </div>
                    </div>
                    {isFullDayLeave && (
                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                            📅 Nghỉ cả ngày
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Schedule Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-xs text-gray-500">⏰ Lịch làm việc</div>
                        <div className="font-semibold text-gray-900">
                            {summary.scheduled_start_time && summary.scheduled_end_time
                                ? `${summary.scheduled_start_time} - ${summary.scheduled_end_time}`
                                : 'Không có lịch'}
                        </div>
                        <div className="text-sm text-gray-600">
                            {summary.scheduled_hours ? `${summary.scheduled_hours.toFixed(1)} giờ` : '—'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs text-gray-500">🕐 Thực tế chấm công</div>
                        <div className="font-semibold text-gray-900">
                            {summary.clock_in_time && summary.clock_out_time
                                ? `${summary.clock_in_time} - ${summary.clock_out_time}`
                                : 'Chưa chấm công'}
                        </div>
                        <div className="text-sm text-gray-600">
                            {summary.clocked_hours ? `${summary.clocked_hours.toFixed(1)} giờ` : '—'}
                        </div>
                    </div>
                </div>

                {/* Leave Info */}
                {hasLeave && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">📝</span>
                            <span className="font-semibold text-yellow-900">Thông tin nghỉ phép</span>
                        </div>
                        <div className="space-y-1">
                            {summary.leave_details?.map((leave, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">
                                        {leave.leave_type === 'full_day' && '📅 Nghỉ cả ngày'}
                                        {leave.leave_type === 'half_day_morning' && '🌅 Nghỉ nửa ngày (Sáng)'}
                                        {leave.leave_type === 'half_day_afternoon' && '🌆 Nghỉ nửa ngày (Chiều)'}
                                        {leave.leave_type === 'partial' && `⏰ Nghỉ từ ${leave.start_time} - ${leave.end_time}`}
                                    </span>
                                    <span className="font-medium text-yellow-800">
                                        {leave.duration_hours.toFixed(1)} giờ
                                    </span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-yellow-300 flex justify-between">
                                <span className="font-semibold text-yellow-900">Tổng nghỉ:</span>
                                <span className="font-bold text-yellow-900">
                                    {summary.total_leave_hours.toFixed(1)} giờ
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Actual Working Hours */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-xs text-blue-700 mb-1">💼 Giờ làm thực tế</div>
                        <div className="text-2xl font-bold text-blue-900">
                            {summary.actual_working_hours?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-blue-600">giờ</div>
                    </div>

                    {/* Payable Hours */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-xs text-green-700 mb-1">💰 Giờ được tính lương</div>
                        <div className="text-2xl font-bold text-green-900">
                            {summary.payable_hours?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-green-600">giờ</div>
                    </div>
                </div>

                {/* Calculation Info */}
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                        <span>Tính toán lúc:</span>
                        <span className="font-medium">
                            {new Date(summary.calculated_at).toLocaleString('vi-VN')}
                        </span>
                    </div>
                    {summary.needs_recalculation && (
                        <div className="mt-2 text-orange-600 font-medium">
                            ⚠️ Cần tính toán lại
                        </div>
                    )}
                </div>

                {/* Formula Explanation */}
                <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                        📊 Cách tính toán
                    </summary>
                    <div className="mt-2 space-y-1 pl-4">
                        <div>• <strong>Giờ làm thực tế</strong> = Giờ chấm công - Giờ nghỉ phép</div>
                        <div>• <strong>Giờ tính lương</strong> = Giờ làm thực tế + Nghỉ phép có phép</div>
                        <div>• Nghỉ cả ngày: Tính = Giờ theo lịch</div>
                        <div>• Nghỉ nửa ngày/theo giờ: Trừ khỏi giờ chấm công</div>
                    </div>
                </details>
            </div>
        </div>
    );
}

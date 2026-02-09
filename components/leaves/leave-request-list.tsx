/**
 * Leave Request List Component
 * Displays employee's leave request history with status
 * Created: 2026-02-07
 */

'use client';

import { useState, useEffect } from 'react';
import type { LeaveRequest } from '@/types/employment';

interface LeaveRequestListProps {
    employeeId: string;
}

const statusConfig = {
    pending: {
        label: 'Chờ duyệt',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⏳'
    },
    approved: {
        label: 'Đã duyệt',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅'
    },
    rejected: {
        label: 'Từ chối',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '❌'
    },
    cancelled: {
        label: 'Đã hủy',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: '🚫'
    }
};

const leaveTypeLabels: Record<string, string> = {
    full_day: 'Nghỉ cả ngày',
    half_day_morning: 'Nghỉ nửa ngày (Sáng)',
    half_day_afternoon: 'Nghỉ nửa ngày (Chiều)',
    partial: 'Nghỉ theo giờ'
};

export default function LeaveRequestList({ employeeId }: LeaveRequestListProps) {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        loadLeaves();
    }, [employeeId, filter]);

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ employee_id: employeeId });
            if (filter !== 'all') {
                params.append('status', filter);
            }

            const response = await fetch(`/api/leave-requests?${params}`);
            if (response.ok) {
                const { data } = await response.json();
                setLeaves(data || []);
            }
        } catch (error) {
            console.error('Failed to load leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (leaveId: string) => {
        if (!confirm('Bạn có chắc muốn hủy đơn xin nghỉ này?')) return;

        try {
            const response = await fetch(`/api/leave-requests/${leaveId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('✅ Đã hủy đơn xin nghỉ');
                loadLeaves();
            } else {
                alert('❌ Không thể hủy đơn');
            }
        } catch (error) {
            console.error('Failed to cancel:', error);
            alert('❌ Có lỗi xảy ra');
        }
    };

    const filteredLeaves = leaves;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
                {[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'pending', label: 'Chờ duyệt' },
                    { value: 'approved', label: 'Đã duyệt' },
                    { value: 'rejected', label: 'Từ chối' }
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`
              px-4 py-2 font-medium text-sm border-b-2 transition-colors
              ${filter === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }
            `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Leave List */}
            {filteredLeaves.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-500">Chưa có đơn xin nghỉ nào</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredLeaves.map((leave) => {
                        const status = statusConfig[leave.status as keyof typeof statusConfig];

                        return (
                            <div
                                key={leave.id}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    {/* Left Side */}
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            {/* Date */}
                                            <div className="flex items-center space-x-2">
                                                <span className="text-2xl">📅</span>
                                                <div>
                                                    <div className="font-semibold text-gray-900">
                                                        {new Date(leave.leave_date).toLocaleDateString('vi-VN', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {leaveTypeLabels[leave.leave_type] || leave.leave_type}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Leave Details */}
                                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                            <span className="flex items-center">
                                                ⏰ <span className="ml-1 font-medium">{leave.duration_hours} giờ</span>
                                            </span>
                                            {leave.start_time && leave.end_time && (
                                                <span className="flex items-center">
                                                    🕐 <span className="ml-1">{leave.start_time} - {leave.end_time}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Reason */}
                                        {leave.reason && (
                                            <div className="text-sm text-gray-600 mb-2">
                                                <span className="font-medium">Lý do:</span> {leave.reason}
                                            </div>
                                        )}

                                        {/* Rejection Reason */}
                                        {leave.status === 'rejected' && leave.rejection_reason && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                                                <span className="font-medium text-red-800">Lý do từ chối:</span>
                                                <span className="text-red-700 ml-2">{leave.rejection_reason}</span>
                                            </div>
                                        )}

                                        {/* Approval Info */}
                                        {leave.status === 'approved' && leave.approved_at && (
                                            <div className="text-xs text-gray-500 mt-2">
                                                Duyệt lúc: {new Date(leave.approved_at).toLocaleString('vi-VN')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex flex-col items-end space-y-2">
                                        {/* Status Badge */}
                                        <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
                      ${status?.color || 'bg-gray-100 text-gray-800'}
                    `}>
                                            {status?.icon} <span className="ml-1">{status?.label}</span>
                                        </span>

                                        {/* Cancel Button */}
                                        {leave.status === 'pending' && (
                                            <button
                                                onClick={() => handleCancel(leave.id)}
                                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                                            >
                                                🗑️ Hủy đơn
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Image Preview */}
                                {leave.image_url && (
                                    <div className="mt-3">
                                        <img
                                            src={leave.image_url}
                                            alt="Minh chứng"
                                            className="max-w-xs h-32 object-cover rounded border border-gray-200"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

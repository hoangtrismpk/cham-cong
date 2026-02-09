/**
 * Leave Approval Queue Component
 * For managers to approve/reject leave requests
 * Created: 2026-02-07
 */

'use client';

import { useState, useEffect } from 'react';
import type { LeaveRequestWithEmployee } from '@/types/employment';

const leaveTypeLabels: Record<string, string> = {
    full_day: '📅 Nghỉ cả ngày',
    half_day_morning: '🌅 Nghỉ nửa ngày (Sáng)',
    half_day_afternoon: '🌆 Nghỉ nửa ngày (Chiều)',
    partial: '⏰ Nghỉ theo giờ'
};

export default function LeaveApprovalQueue() {
    const [leaves, setLeaves] = useState<LeaveRequestWithEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequestWithEmployee | null>(null);

    useEffect(() => {
        loadPendingLeaves();
    }, []);

    const loadPendingLeaves = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/leave-requests?status=pending');
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

    const handleApprove = async (leaveId: string) => {
        if (!confirm('Xác nhận duyệt đơn xin nghỉ này?')) return;

        setProcessingId(leaveId);
        try {
            const response = await fetch(`/api/leave-requests/${leaveId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });

            if (response.ok) {
                alert('✅ Đã duyệt đơn xin nghỉ');
                loadPendingLeaves();
            } else {
                const { error } = await response.json();
                alert(`❌ Không thể duyệt: ${error}`);
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            alert('❌ Có lỗi xảy ra');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (leave: LeaveRequestWithEmployee) => {
        setSelectedLeave(leave);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!selectedLeave) return;
        if (!rejectionReason.trim()) {
            alert('Vui lòng nhập lý do từ chối');
            return;
        }

        setProcessingId(selectedLeave.id);
        try {
            const response = await fetch(`/api/leave-requests/${selectedLeave.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    rejection_reason: rejectionReason
                })
            });

            if (response.ok) {
                alert('✅ Đã từ chối đơn xin nghỉ');
                setShowRejectModal(false);
                setSelectedLeave(null);
                loadPendingLeaves();
            } else {
                const { error } = await response.json();
                alert(`❌ Không thể từ chối: ${error}`);
            }
        } catch (error) {
            console.error('Failed to reject:', error);
            alert('❌ Có lỗi xảy ra');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        📋 Đơn xin nghỉ chờ duyệt
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {leaves.length} đơn đang chờ xử lý
                    </p>
                </div>
                <button
                    onClick={loadPendingLeaves}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                    🔄 Làm mới
                </button>
            </div>

            {/* Leave Queue */}
            {leaves.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                        Không có đơn chờ duyệt
                    </p>
                    <p className="text-gray-500">
                        Tất cả đơn xin nghỉ đã được xử lý
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {leaves.map((leave) => (
                        <div
                            key={leave.id}
                            className="bg-white border-2 border-yellow-200 rounded-lg p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                {/* Left: Employee & Leave Info */}
                                <div className="flex-1">
                                    {/* Employee Info */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {leave.employee_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 text-lg">
                                                {leave.employee_name || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Gửi lúc: {new Date(leave.created_at!).toLocaleString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leave Date */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
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
                                                <div className="text-sm text-gray-600">
                                                    {leaveTypeLabels[leave.leave_type] || leave.leave_type}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leave Details */}
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <span className="text-gray-600">⏰ Thời gian:</span>
                                            <span className="font-semibold">{leave.duration_hours} giờ</span>
                                        </div>
                                        {leave.start_time && leave.end_time && (
                                            <div className="flex items-center space-x-2 text-sm">
                                                <span className="text-gray-600">🕐 Giờ:</span>
                                                <span className="font-semibold">
                                                    {leave.start_time} - {leave.end_time}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reason */}
                                    {leave.reason && (
                                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                            <div className="text-sm font-medium text-gray-700 mb-1">
                                                📝 Lý do:
                                            </div>
                                            <div className="text-sm text-gray-600">{leave.reason}</div>
                                        </div>
                                    )}

                                    {/* Image */}
                                    {leave.image_url && (
                                        <div className="mb-3">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                🖼️ Minh chứng:
                                            </div>
                                            <img
                                                src={leave.image_url}
                                                alt="Minh chứng"
                                                className="max-w-md h-40 object-cover rounded-lg border border-gray-200"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="ml-6 flex flex-col space-y-3 min-w-[140px]">
                                    <button
                                        onClick={() => handleApprove(leave.id)}
                                        disabled={processingId === leave.id}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === leave.id ? '⏳' : '✅'} Duyệt
                                    </button>
                                    <button
                                        onClick={() => openRejectModal(leave)}
                                        disabled={processingId === leave.id}
                                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === leave.id ? '⏳' : '❌'} Từ chối
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && selectedLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            ❌ Từ chối đơn xin nghỉ
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Nhân viên: <strong>{selectedLeave.employee_name}</strong><br />
                            Ngày nghỉ: <strong>{new Date(selectedLeave.leave_date).toLocaleDateString('vi-VN')}</strong>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Lý do từ chối <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                                placeholder="Nhập lý do từ chối đơn xin nghỉ..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setSelectedLeave(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === selectedLeave.id}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {processingId === selectedLeave.id ? '⏳ Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

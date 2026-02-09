/**
 * Leave Request Form Component
 * Form for employees to submit leave requests
 * Supports: Full day, Half day (morning/afternoon), Partial (custom hours)
 * Created: 2026-02-07
 */

'use client';

import { useState } from 'react';
import type { LeaveType, CreateLeaveRequestDTO } from '@/types/employment';
import { MediaPicker } from '@/components/wordpress/media-picker';

interface LeaveRequestFormProps {
    employeeId: string;
    onSubmit: (request: CreateLeaveRequestDTO) => Promise<void>;
    onCancel?: () => void;
}

const leaveTypeOptions = [
    {
        value: 'full_day' as LeaveType,
        label: 'Nghỉ cả ngày',
        icon: '📅',
        description: 'Nghỉ toàn bộ ngày làm việc'
    },
    {
        value: 'half_day_morning' as LeaveType,
        label: 'Nghỉ nửa ngày (Sáng)',
        icon: '🌅',
        description: 'Nghỉ buổi sáng (08:30 - 12:30)'
    },
    {
        value: 'half_day_afternoon' as LeaveType,
        label: 'Nghỉ nửa ngày (Chiều)',
        icon: '🌆',
        description: 'Nghỉ buổi chiều (13:30 - 18:00)'
    },
    {
        value: 'partial' as LeaveType,
        label: 'Nghỉ theo giờ',
        icon: '⏰',
        description: 'Tự chọn khoảng thời gian nghỉ'
    }
];

export default function LeaveRequestForm({
    employeeId,
    onSubmit,
    onCancel
}: LeaveRequestFormProps) {
    const [leaveType, setLeaveType] = useState<LeaveType>('full_day');
    const [leaveDate, setLeaveDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('15:00');
    const [reason, setReason] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateDuration = (): number => {
        if (leaveType === 'full_day') return 8;
        if (leaveType === 'half_day_morning' || leaveType === 'half_day_afternoon') return 4;

        // Partial leave
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        return (endMinutes - startMinutes) / 60;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!leaveDate) {
            setError('Vui lòng chọn ngày nghỉ');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(leaveDate);

        if (selectedDate < today) {
            setError('Không thể xin nghỉ cho ngày đã qua');
            return;
        }

        if (leaveType === 'partial') {
            const duration = calculateDuration();
            if (duration <= 0) {
                setError('Giờ kết thúc phải sau giờ bắt đầu');
                return;
            }
        }

        setLoading(true);

        try {
            const request: CreateLeaveRequestDTO = {
                employee_id: employeeId,
                leave_date: leaveDate,
                leave_type: leaveType,
                reason,
                image_url: imageUrl || undefined
            };

            if (leaveType === 'partial') {
                request.start_time = startTime;
                request.end_time = endTime;
            }

            await onSubmit(request);

            // Reset form
            setLeaveDate('');
            setReason('');
            setImageUrl('');
            setLeaveType('full_day');
        } catch (err: any) {
            setError(err.message || 'Không thể gửi đơn xin nghỉ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="ml-3 text-sm text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Leave Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày nghỉ <span className="text-red-500">*</span>
                </label>
                <input
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Leave Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Loại nghỉ phép <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {leaveTypeOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setLeaveType(option.value)}
                            className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${leaveType === option.value
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
              `}
                        >
                            <div className="flex items-start space-x-3">
                                <span className="text-2xl">{option.icon}</span>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{option.label}</div>
                                    <div className="text-sm text-gray-500 mt-1">{option.description}</div>
                                </div>
                                {leaveType === option.value && (
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Partial Leave Time Selection */}
            {leaveType === 'partial' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Chọn khoảng thời gian nghỉ
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Từ giờ:</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Đến giờ:</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
                        <div className="text-sm text-gray-700">
                            <span className="font-medium">Tổng thời gian:</span>{' '}
                            <span className="text-lg font-bold text-blue-600">
                                {calculateDuration().toFixed(1)} giờ
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Reason */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lý do nghỉ
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Nhập lý do xin nghỉ (không bắt buộc)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
            </div>

            {/* Image Upload (Optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đính kèm ảnh (nếu có)
                </label>
                <MediaPicker
                    onUploadSuccess={(url) => {
                        setImageUrl(url)
                    }}
                    accept="image/*"
                    maxSize={5}
                />
                {imageUrl && (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                        <img
                            src={imageUrl}
                            alt="Preview"
                            className="max-w-full h-auto max-h-64 object-contain mx-auto"
                        />
                        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                            <a
                                href={imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate block"
                            >
                                {imageUrl}
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">📋 Tóm tắt đơn xin nghỉ</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Ngày nghỉ:</span>
                        <span className="font-medium">
                            {leaveDate ? new Date(leaveDate).toLocaleDateString('vi-VN') : '—'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Loại nghỉ:</span>
                        <span className="font-medium">
                            {leaveTypeOptions.find(o => o.value === leaveType)?.label}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Thời gian:</span>
                        <span className="font-medium text-blue-600">
                            {calculateDuration()} giờ
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading || !leaveDate}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? '⏳ Đang gửi...' : '📤 Gửi đơn xin nghỉ'}
                </button>
            </div>
        </form>
    );
}

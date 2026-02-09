/**
 * Fulltime Schedule Info - Dark Theme Premium
 * Read-only display matching the dark mode design
 * Fetches dynamic schedule config from API (Real-time, No Cache)
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, Coffee, Calendar, Timer, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleConfig {
    working_days: number[]; // 0=Sun, 1=Mon...
    start_time: string;
    end_time: string;
    break_start: string;
    break_end: string;
}

export default function FulltimeScheduleInfo() {
    const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScheduleConfig();
    }, []);

    const fetchScheduleConfig = async () => {
        try {
            // Add timestamp to prevent browser cache
            const response = await fetch(`/api/config/schedule?t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache' }
            });

            if (response.ok) {
                setSchedule(await response.json());
            } else {
                toast.error('Không thể tải cấu hình lịch làm việc');
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateHours = (start?: string, end?: string, breakStart?: string, breakEnd?: string) => {
        if (!start || !end) return 0;

        // Safety: ensure strings are clean
        const cleanTime = (t: string) => t.replace(/"/g, '').trim();

        const [sH, sM] = cleanTime(start).split(':').map(Number);
        const [eH, eM] = cleanTime(end).split(':').map(Number);

        // Calculate total minutes
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        let totalMin = endMin - startMin;

        // Subtract break time if valid
        if (breakStart && breakEnd) {
            const [bSH, bSM] = cleanTime(breakStart).split(':').map(Number);
            const [bEH, bEM] = cleanTime(breakEnd).split(':').map(Number);
            const breakMin = (bEH * 60 + bEM) - (bSH * 60 + bSM);
            if (breakMin > 0) totalMin -= breakMin;
        }

        return Math.max(0, (totalMin / 60)).toFixed(1); // Return with 1 decimal
    };

    const getOffDaysText = (workingDays: number[]) => {
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const offDays = allDays.filter(day => !workingDays.includes(day));

        if (offDays.length === 0) return 'Không có ngày nghỉ cố định';

        // Sort: T2...T7, CN (move 0 to end for display if needed, but 0 is Sunday)
        // Custom sort to make Sunday last if we want T2, T3... CN
        offDays.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

        return offDays.map(d => d === 0 ? 'Chủ nhật' : `Thứ ${d + 1}`).join(', ');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Đang tải thông tin...
            </div>
        );
    }

    if (!schedule) return null;

    const totalHours = calculateHours(
        schedule.start_time,
        schedule.end_time,
        schedule.break_start,
        schedule.break_end
    );

    const breakDuration = calculateHours(
        schedule.break_start,
        schedule.break_end,
        '00:00', '00:00' // No internal breaks within break time
    );

    const days = [
        { name: 'CN', index: 0 },
        { name: 'T2', index: 1 },
        { name: 'T3', index: 2 },
        { name: 'T4', index: 3 },
        { name: 'T5', index: 4 },
        { name: 'T6', index: 5 },
        { name: 'T7', index: 6 }
    ].map(day => ({
        ...day,
        active: schedule.working_days.includes(day.index),
        time: `${schedule.start_time.replace(/"/g, '')} - ${schedule.end_time.replace(/"/g, '')}`
    }));

    const workingDaysCount = schedule.working_days.length;
    const offDaysText = getOffDaysText(schedule.working_days);

    return (
        <div className="space-y-6 text-white">
            {/* Alert Banner */}
            <div className="flex items-start bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="ml-3">
                    <h4 className="text-sm font-bold text-blue-400">Lịch làm việc cố định</h4>
                    <p className="text-sm text-blue-200/80 mt-1 leading-relaxed">
                        Nhân viên chính thức làm việc theo lịch cố định của công ty. Hệ thống sẽ tự động tính toán giờ công và gửi thông báo chấm công.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Working Hours */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">GIỜ LÀM VIỆC</p>
                        <h3 className="text-2xl font-bold text-white mb-1">
                            {schedule.start_time.replace(/"/g, '')} - {schedule.end_time.replace(/"/g, '')}
                        </h3>
                        <p className="text-sm text-slate-500">(Bao gồm {breakDuration} giờ nghỉ trưa)</p>
                    </div>
                </div>

                {/* Break Time */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Coffee className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">GIỜ NGHỈ TRƯA</p>
                        <h3 className="text-2xl font-bold text-white mb-1">
                            {schedule.break_start.replace(/"/g, '')} - {schedule.break_end.replace(/"/g, '')}
                        </h3>
                        <p className="text-sm text-slate-500">
                            ({breakDuration} giờ)
                        </p>
                    </div>
                </div>

                {/* Total Hours */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <Timer className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">TỔNG GIỜ LÀM</p>
                        <h3 className="text-2xl font-bold text-white mb-1">
                            {totalHours} giờ/ngày
                        </h3>
                        <p className="text-sm text-slate-500">
                            ({(Number(totalHours) * workingDaysCount).toFixed(1)} giờ/tuần)
                        </p>
                    </div>
                </div>

                {/* Working Days */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NGÀY LÀM VIỆC</p>
                        <h3 className="text-2xl font-bold text-white mb-1">
                            {workingDaysCount} ngày
                        </h3>
                        <p className="text-sm text-slate-500">
                            {schedule.working_days.includes(1) ? 'T2' : ''}
                            {schedule.working_days.length > 2 ? ' - ' : ', '}
                            {schedule.working_days.includes(6) ? 'T7' : (schedule.working_days.includes(5) ? 'T6' : '')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Week View */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> LỊCH TUẦN
                </h4>
                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, idx) => (
                        <div
                            key={idx}
                            className={`
                flex flex-col items-center justify-center py-4 px-2 rounded-lg border text-center transition-all
                ${day.active
                                    ? 'bg-[#1c2230] border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                    : 'bg-[#1a1f2e] border-slate-700/50 opacity-60'
                                }
              `}
                        >
                            <span className={`text-xs font-bold mb-2 ${day.active ? 'text-blue-400' : 'text-slate-500'}`}>
                                {day.name}
                            </span>
                            {day.active ? (
                                <div className="text-[10px] text-slate-300 font-medium leading-tight">
                                    <div className="text-white font-bold">{day.time?.split(' - ')[0]}</div>
                                    <div className="text-slate-500 text-[9px] my-0.5">↓</div>
                                    <div className="text-white font-bold">{day.time?.split(' - ')[1]}</div>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-500 font-medium">Out</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto Notification */}
            <div className="bg-[#131720] rounded-lg p-5 border border-slate-800">
                <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    🔔 THÔNG BÁO TỰ ĐỘNG
                </h4>
                <ul className="space-y-2">
                    <li className="flex items-center text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></div>
                        Nhắc chấm công vào lúc <span className="text-white font-bold mx-1">
                            {/* Calculate reminder time 15m before start */}
                            {schedule.start_time.replace(/"/g, '').split(':').map((v, i) => i === 1 ? String(Math.max(0, Number(v) - 15)).padStart(2, '0') : v).join(':')}
                        </span> mỗi sáng
                    </li>
                    <li className="flex items-center text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></div>
                        Nhắc chấm công tan làm lúc <span className="text-white font-bold mx-1">
                            {/* Calculate reminder time 15m before end */}
                            {schedule.end_time.replace(/"/g, '').split(':').map((v, i) => i === 1 ? String(Math.max(0, Number(v) - 15)).padStart(2, '0') : v).join(':')}
                        </span> mỗi chiều
                    </li>
                    <li className="flex items-center text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></div>
                        Không nhắc nhở vào <span className="text-white font-bold mx-1">{offDaysText}</span> (bao gồm cả ngày xin phép nghỉ)
                    </li>
                </ul>
            </div>
        </div>
    );
}

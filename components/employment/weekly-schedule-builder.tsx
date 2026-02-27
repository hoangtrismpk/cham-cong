/**
 * Weekly Schedule Builder Component
 * Used for building default schedules for Part-time and Intern employees
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, Save, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/contexts/i18n-context';

export type ShiftType = 'morning' | 'evening' | 'full' | 'custom' | 'off';

export interface ScheduleItem {
    day_of_week: number; // 0=Sun, 1=Mon...
    shift_type: ShiftType;
    custom_start_time?: string;
    custom_end_time?: string;
    active: boolean; // Virtual property for UI state
}

interface Props {
    initialSchedules?: any[];
    onSave: (schedules: ScheduleItem[]) => Promise<void>;
    loading?: boolean;
    companyConfig?: any; // Full config: { start_time, end_time, working_days, ... }
    companyWorkingDays?: number[]; // Backward compatibility
}

export default function WeeklyScheduleBuilder({ initialSchedules, onSave, loading, companyConfig, companyWorkingDays: propWorkingDays }: Props) {
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useI18n();
    const sb = t.admin.employeeManagement.employment.scheduleBuilder;

    // Prioritize working days from companyConfig
    const companyWorkingDays = companyConfig?.working_days || propWorkingDays || [1, 2, 3, 4, 5, 6];

    // Official working hours
    const officialStart = companyConfig?.start_time || '08:30';
    const officialEnd = companyConfig?.end_time || '17:30';

    // Day names from locale
    const dayNames = [
        t.time.sunday,
        t.time.monday,
        t.time.tuesday,
        t.time.wednesday,
        t.time.thursday,
        t.time.friday,
        t.time.saturday,
    ];

    // Initialize with full week or auto-fill from company config
    useEffect(() => {
        const newSchedules: ScheduleItem[] = [];
        for (let i = 0; i <= 6; i++) {
            const existing = initialSchedules?.find(s => s.day_of_week === i);

            if (existing) {
                let shift = existing.shift_type as ShiftType;
                let start = existing.custom_start_time;
                let end = existing.custom_end_time;

                if (shift === 'morning') { shift = 'custom'; start = '08:30'; end = '12:00'; }
                if (shift === 'evening') { shift = 'custom'; start = '13:30'; end = '17:30'; }

                newSchedules.push({
                    day_of_week: i,
                    shift_type: shift,
                    custom_start_time: start,
                    custom_end_time: end,
                    active: existing.active !== undefined ? existing.active : existing.shift_type !== 'off'
                });
            } else {
                const isCompanyWorkDay = companyWorkingDays?.includes(i);
                if (companyWorkingDays && companyWorkingDays.length > 0 && isCompanyWorkDay) {
                    newSchedules.push({ day_of_week: i, shift_type: 'full', active: true });
                } else {
                    newSchedules.push({ day_of_week: i, shift_type: 'off', active: false });
                }
            }
        }
        const displayOrder = [...newSchedules.slice(1), newSchedules[0]];
        setSchedules(displayOrder);
    }, [initialSchedules, companyWorkingDays]);

    const parseMinutes = (time?: string) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const validateTimeInput = (time: string, type: 'start' | 'end') => {
        if (!time) return null;
        const minutes = parseMinutes(time);
        const minTime = parseMinutes(officialStart);
        const maxTime = parseMinutes(officialEnd);
        if (minutes < minTime || minutes > maxTime) {
            return sb.timeMustBeInRange.replace('{type}', type === 'start' ? 'bắt đầu' : 'kết thúc') + ` (${officialStart} - ${officialEnd})`;
        }
        return null;
    };

    const formatSmartTime = (val: string) => {
        const digits = val.replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length === 1) return `0${digits}:00`;
        if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
        if (digits.length === 4) {
            const h = parseInt(digits.slice(0, 2));
            const m = parseInt(digits.slice(2));
            if (h > 23 || m > 59) return val;
            return `${digits.slice(0, 2)}:${digits.slice(2)}`;
        }
        return val;
    };

    const handleTimeBlur = (dayIndex: number, field: 'start' | 'end', val: string) => {
        const formatted = formatSmartTime(val);
        const error = validateTimeInput(formatted, field);
        if (error) toast.error(error);

        const currentParams = schedules.find(s => s.day_of_week === dayIndex);
        const otherTime = field === 'start' ? currentParams?.custom_end_time : currentParams?.custom_start_time;

        if (otherTime) {
            const t1 = field === 'start' ? parseMinutes(formatted) : parseMinutes(otherTime);
            const t2 = field === 'start' ? parseMinutes(otherTime) : parseMinutes(formatted);
            if (t1 >= t2) toast.error(sb.startBeforeEnd);
        }

        updateDay(dayIndex, { [field === 'start' ? 'custom_start_time' : 'custom_end_time']: formatted });
    };

    const updateDay = (dayIndex: number, updates: Partial<ScheduleItem>) => {
        setSchedules(prev => prev.map(s => {
            if (s.day_of_week === dayIndex) {
                const updated = { ...s, ...updates };
                if (updates.shift_type && updates.shift_type !== 'off') updated.active = true;
                if (updates.shift_type === 'off') updated.active = false;
                return updated;
            }
            return s;
        }));
    };

    const formatWorkingDaysSimple = (days: number[]) => {
        const map = [t.time.sunday, t.time.monday, t.time.tuesday, t.time.wednesday, t.time.thursday, t.time.friday, t.time.saturday];
        return days.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(d => map[d]).join(', ');
    };

    const applyToAllWorkingDays = (sourceDay: ScheduleItem) => {
        const targetDays = companyWorkingDays;
        setSchedules(prev => prev.map(s => {
            if (s.day_of_week === sourceDay.day_of_week) return s;
            if (targetDays.includes(s.day_of_week)) {
                return { ...s, shift_type: sourceDay.shift_type, custom_start_time: sourceDay.custom_start_time, custom_end_time: sourceDay.custom_end_time, active: sourceDay.shift_type !== 'off' };
            }
            return { ...s, shift_type: 'off', active: false, custom_start_time: undefined, custom_end_time: undefined };
        }));
        toast.success(`${sb.applySuccess} (${formatWorkingDaysSimple(targetDays)})`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const activeSchedules = schedules.filter(s => s.active && s.shift_type !== 'off');
            await onSave(activeSchedules);
            toast.success(sb.saveSuccess);
        } catch (error) {
            console.error(error);
            toast.error(sb.saveError);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>
                    {sb.systemConfig}
                    <span className="font-bold text-white ml-2">
                        {formatWorkingDaysSimple(companyWorkingDays)}
                    </span>
                    <span className="ml-2 text-slate-400">
                        ({sb.workHours} {officialStart} - {officialEnd})
                    </span>
                </span>
            </div>

            <div className="grid gap-4">
                {schedules.map((day) => (
                    <div
                        key={day.day_of_week}
                        className={`
                            relative p-4 rounded-xl border transition-all duration-200
                            ${day.active
                                ? 'bg-[#1a202e] border-blue-500/30'
                                : 'bg-[#161b26] border-[#2d3342] opacity-80 hover:opacity-100'
                            }
                        `}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                            {/* Day Label */}
                            <div className="min-w-[100px] flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${day.active ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className={`font-bold block ${day.active ? 'text-white' : 'text-slate-400'}`}>
                                        {dayNames[day.day_of_week]}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium uppercase">
                                        {day.active ? sb.working : sb.dayOff}
                                    </span>
                                </div>
                            </div>

                            {/* Shift Selector */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    value={day.shift_type}
                                    onValueChange={(val: ShiftType) => updateDay(day.day_of_week, { shift_type: val })}
                                >
                                    <SelectTrigger className="bg-[#131720] border-slate-700 h-10 w-full min-w-[180px]">
                                        <SelectValue placeholder={sb.selectShift} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full">{sb.fullDay} ({officialStart} - {officialEnd})</SelectItem>
                                        <SelectItem value="custom">{sb.customHours}</SelectItem>
                                        <SelectItem value="off">{sb.off}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Time Inputs */}
                                {day.shift_type === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            placeholder="HH:MM"
                                            className="bg-[#131720] border-slate-700 h-10 text-sm font-mono text-center"
                                            value={day.custom_start_time || ''}
                                            onChange={(e) => updateDay(day.day_of_week, { custom_start_time: e.target.value })}
                                            onBlur={(e) => handleTimeBlur(day.day_of_week, 'start', e.target.value)}
                                        />
                                        <span className="text-slate-500">-</span>
                                        <Input
                                            type="text"
                                            placeholder="HH:MM"
                                            className="bg-[#131720] border-slate-700 h-10 text-sm font-mono text-center"
                                            value={day.custom_end_time || ''}
                                            onChange={(e) => updateDay(day.day_of_week, { custom_end_time: e.target.value })}
                                            onBlur={(e) => handleTimeBlur(day.day_of_week, 'end', e.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Readonly Time Display for Full Shift */}
                                {day.shift_type === 'full' && (
                                    <div className="flex items-center text-sm text-slate-500 px-3 h-10 bg-[#131720]/50 rounded border border-transparent">
                                        {officialStart} - {officialEnd}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {day.active && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    title={sb.applyAllTooltip}
                                    onClick={() => applyToAllWorkingDays(day)}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {sb.applyAll}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || loading}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
                >
                    {isSaving ? (
                        <>{sb.saving}</>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {sb.saveSchedule}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

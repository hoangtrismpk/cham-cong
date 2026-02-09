/**
 * Intern Schedule Editor - Dark Theme Premium
 * Allows detailed weekly schedule configuration for Interns
 */

'use client';

import { useState, useEffect } from 'react';
import WeeklyScheduleBuilder, { ScheduleItem } from './weekly-schedule-builder';
import { toast } from 'sonner';

interface Props {
    employeeId: string;
    onSave?: (data: any) => Promise<void>;
    disabled?: boolean;
}

export default function InternScheduleEditor({ employeeId, disabled }: Props) {
    const [initialSchedules, setInitialSchedules] = useState<any[]>([]);
    const [companyConfig, setCompanyConfig] = useState<any>(null); // Store full config
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchSchedules(),
            fetchCompanyConfig()
        ]).finally(() => setLoading(false));
    }, [employeeId]);

    const fetchSchedules = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/schedule`);
            if (res.ok) {
                const data = await res.json();
                setInitialSchedules(data);
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
            toast.error('Không thể tải lịch làm việc của thực tập sinh');
        }
    };

    const fetchCompanyConfig = async () => {
        try {
            const res = await fetch('/api/config/schedule', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setCompanyConfig(data);
            }
        } catch (e) {
            console.error('Error fetching company config', e);
        }
    };

    const handleSaveSchedule = async (schedules: ScheduleItem[]) => {
        try {
            const res = await fetch(`/api/employees/${employeeId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules })
            });

            if (!res.ok) {
                throw new Error('Lỗi khi lưu lịch làm việc thực tập sinh');
            }

            const data = await res.json();
            setInitialSchedules(data.data);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-bold text-white">Cấu hình lịch Thực tập sinh</h3>
                <p className="text-slate-400 text-sm">
                    Thiết lập các ca làm việc cụ thể.
                    Hệ thống sẽ dựa vào lịch này để theo dõi chuyên cần.
                </p>
            </div>

            <WeeklyScheduleBuilder
                initialSchedules={initialSchedules}
                onSave={handleSaveSchedule}
                loading={loading}
                companyConfig={companyConfig}
                companyWorkingDays={companyConfig?.working_days || []}
            />
        </div>
    );
}

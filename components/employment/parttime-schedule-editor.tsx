/**
 * Parttime Schedule Editor - Dark Theme Premium
 * Allows detailed weekly schedule configuration
 */

'use client';

import { useState, useEffect } from 'react';
import WeeklyScheduleBuilder, { ScheduleItem } from './weekly-schedule-builder';
import { toast } from 'sonner';
import { useI18n } from '@/contexts/i18n-context';

interface Props {
    employeeId: string;
    onSave?: (data: any) => Promise<void>;
    disabled?: boolean;
}

export default function ParttimeScheduleEditor({ employeeId, disabled }: Props) {
    const [initialSchedules, setInitialSchedules] = useState<any[]>([]);
    const [companyConfig, setCompanyConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useI18n();
    const sb = t.admin.employeeManagement.employment.scheduleBuilder;

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
            toast.error(sb.loadError);
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
                throw new Error(sb.saveError);
            }

            const data = await res.json();
            setInitialSchedules(data.data); // Update local state with saved data
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-bold text-white">{sb.parttimeTitle}</h3>
                <p className="text-slate-400 text-sm">
                    {sb.parttimeDesc}
                </p>
            </div>

            <WeeklyScheduleBuilder
                initialSchedules={initialSchedules}
                onSave={handleSaveSchedule}
                loading={loading}
                companyConfig={companyConfig}
                companyWorkingDays={companyConfig?.working_days || []} // Pass separately for backward compatibility if needed, but we should use companyConfig.working_days inside
            />
        </div>
    );
}

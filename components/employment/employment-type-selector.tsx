/**
 * Employment Type Selector - Dark Theme Premium
 * Matches the provided design mockup
 */

'use client';

import { useState, useEffect } from 'react';
import type { EmploymentType } from '@/types/employment';
import { Briefcase, Clock, GraduationCap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';

interface EmploymentTypeSelectorProps {
    value: EmploymentType;
    onChange: (value: EmploymentType) => void;
    disabled?: boolean;
}

export default function EmploymentTypeSelector({
    value,
    onChange,
    disabled = false
}: EmploymentTypeSelectorProps) {
    const [selected, setSelected] = useState<EmploymentType>(value);
    const { t } = useI18n();

    const sel = t.admin.employeeManagement.employment.selector;

    const employmentTypes = [
        {
            id: 'full-time',
            label: sel.fullTime.label,
            enLabel: sel.fullTime.enLabel,
            description: sel.fullTime.desc,
            icon: Briefcase,
            activeColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
            borderColor: 'border-blue-500',
        },
        {
            id: 'part-time',
            label: sel.partTime.label,
            enLabel: sel.partTime.enLabel,
            description: sel.partTime.desc,
            icon: Clock,
            activeColor: 'text-orange-400',
            iconBg: 'bg-orange-500/10',
            borderColor: 'border-orange-500',
        },
        {
            id: 'intern',
            label: sel.intern.label,
            enLabel: sel.intern.enLabel,
            description: sel.intern.desc,
            icon: GraduationCap,
            activeColor: 'text-purple-400',
            iconBg: 'bg-purple-500/10',
            borderColor: 'border-purple-500',
        }
    ];

    useEffect(() => {
        setSelected(value);
    }, [value]);

    const handleSelect = (type: EmploymentType) => {
        if (disabled) return;
        setSelected(type);
        onChange(type);
    };

    return (
        <div className="space-y-4">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employmentTypes.map((type) => {
                    const isSelected = selected === type.id;
                    const Icon = type.icon;

                    return (
                        <button
                            key={type.id}
                            onClick={() => handleSelect(type.id as EmploymentType)}
                            disabled={disabled}
                            className={cn(
                                "relative flex flex-col items-start p-5 rounded-xl border-2 text-left h-full transition-all duration-200",
                                isSelected
                                    ? `bg-[#1a202e] ${type.borderColor} shadow-[0_0_15px_rgba(59,130,246,0.1)]`
                                    : "bg-[#161b26] border-[#2d3342] hover:border-slate-600 hover:bg-[#1c2230]",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-4 right-4 text-blue-500">
                                    <CheckCircle2 className="w-5 h-5 fill-blue-500/20" />
                                </div>
                            )}

                            <div className={cn(
                                "p-3 rounded-lg mb-4",
                                isSelected ? type.iconBg : "bg-[#252b3b]"
                            )}>
                                <Icon className={cn(
                                    "w-5 h-5",
                                    isSelected ? type.activeColor : "text-slate-400"
                                )} />
                            </div>

                            <div className="space-y-1">
                                <h3 className={cn(
                                    "font-bold text-base",
                                    isSelected ? "text-white" : "text-slate-300"
                                )}>
                                    {type.label}
                                </h3>
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                                    {type.enLabel}
                                </p>
                                <p className="text-sm text-slate-500 pt-2 leading-relaxed">
                                    {type.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Warning Alert */}
            <div className="mt-4 p-3 bg-[#2a1f18] border border-[#4d3220] rounded-lg flex items-center gap-3">
                <span className="text-orange-400 text-lg">💡</span>
                <span className="text-orange-200/80 text-sm">
                    {sel.warning}
                </span>
            </div>
        </div>
    );
}

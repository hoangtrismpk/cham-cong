'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/i18n-context'

interface DataPoint {
    name: string
    value: number
}

interface WeeklyAttendanceChartProps {
    data7Days: DataPoint[]
    data30Days: DataPoint[]
}

export function WeeklyAttendanceChart({ data7Days, data30Days }: WeeklyAttendanceChartProps) {
    const { t } = useI18n()
    const [range, setRange] = useState<'7d' | '30d'>('7d')
    const data = range === '7d' ? data7Days : data30Days

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className="text-white font-bold text-lg">{t.admin.attendanceTrend}</h3>
                    <p className="text-slate-500 text-xs">{t.admin.visualizingWorkforce}</p>
                </div>
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                    <button
                        onClick={() => setRange('7d')}
                        className={cn(
                            "text-[10px] px-3 py-1.5 rounded-md transition-all",
                            range === '7d'
                                ? "bg-primary text-slate-900 font-bold shadow-lg shadow-primary/25"
                                : "text-slate-400 font-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        {t.admin.days7}
                    </button>
                    <button
                        onClick={() => setRange('30d')}
                        className={cn(
                            "text-[10px] px-3 py-1.5 rounded-md transition-all",
                            range === '30d'
                                ? "bg-primary text-slate-900 font-bold shadow-lg shadow-primary/25"
                                : "text-slate-400 font-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        {t.admin.days30}
                    </button>
                </div>
            </div>

            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradient-blue" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            interval={range === '30d' ? 6 : 0} // Show fewer labels for 30 days
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            width={25}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#gradient-blue)"
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { getMissingReports } from '@/app/actions/work-reports'
import { AlertTriangle, ChevronRight, Calendar, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Props {
    userId: string
    onSelectDate: (date: Date) => void
    refreshTrigger?: number
    excludedDates?: Set<string>
}

export default function MissingReports({ userId, onSelectDate, refreshTrigger = 0, excludedDates }: Props) {
    const [missingDates, setMissingDates] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                // Fetch missing reports for last 30 days
                const dates = await getMissingReports(userId, 30)
                setMissingDates(dates)
            } catch (error) {
                console.error('Failed to load missing reports', error)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [userId, refreshTrigger]) // Refresh when notified

    // Filter out optimistically excluded dates
    const displayDates = missingDates.filter(d => !excludedDates?.has(d))

    if (isLoading) return null
    if (displayDates.length === 0) {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 animate-in fade-in duration-500">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                    <h3 className="font-bold text-green-500 text-sm">Tuyệt vời!</h3>
                    <p className="text-xs text-green-600/80">Bạn đã báo cáo đầy đủ trong 30 ngày qua.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 animate-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 animate-pulse" />
                    <h3 className="font-bold text-orange-500 text-sm">Cần báo cáo bù ({displayDates.length})</h3>
                </div>
                <span className="text-[10px] text-orange-500/70 bg-orange-500/10 px-2 py-0.5 rounded-full">30 ngày qua</span>
            </div>

            <p className="text-xs text-orange-400/80 mb-3">
                Các ngày sau đây chưa có báo cáo hoạt động. Vui lòng bổ sung để đảm bảo chấm công.
            </p>

            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {displayDates.map(dateStr => (
                    <button
                        key={dateStr}
                        onClick={() => onSelectDate(new Date(dateStr))}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0d131a] border border-orange-500/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group text-left"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                                <Calendar className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-300 group-hover:text-orange-400 transition-colors block">
                                    {format(new Date(dateStr), 'EEEE, dd/MM/yyyy', { locale: vi })}
                                </span>
                                <span className="text-[10px] text-slate-500">Chưa báo cáo</span>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-orange-500 transition-colors transform group-hover:translate-x-1" />
                    </button>
                ))}
            </div>
        </div>
    )
}

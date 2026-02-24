'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { format, parse, isAfter } from 'date-fns'
import { createOvertimeRequest } from '@/app/actions/overtime'
import { getEffectiveSchedule } from '@/app/actions/overtime'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface OvertimeRequestModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    onSuccess?: () => void
}

export function OvertimeRequestModal({ isOpen, onClose, userId, onSuccess }: OvertimeRequestModalProps) {
    const [loading, setLoading] = useState(false)
    const [fetchingSchedule, setFetchingSchedule] = useState(false)
    const [date, setDate] = useState<Date>(new Date())
    const [plannedHours, setPlannedHours] = useState('1')
    const [reason, setReason] = useState('')
    const [scheduleInfo, setScheduleInfo] = useState<{ startTime: string, endTime: string, shiftType: string } | null>(null)
    const [nextScheduleInfo, setNextScheduleInfo] = useState<{ startTime: string, endTime: string, shiftType: string, date: string } | null>(null)
    const [maxPossibleHours, setMaxPossibleHours] = useState(16)

    // Fetch schedule info when date changes to show boundaries
    useEffect(() => {
        if (isOpen && date) {
            const fetchSchedules = async () => {
                setFetchingSchedule(true)
                try {
                    const workDateStr = format(date, 'yyyy-MM-dd')
                    const info = await getEffectiveSchedule(userId, workDateStr)
                    setScheduleInfo(info)

                    // Fetch next day schedule to find the ceiling
                    const nextDay = new Date(date)
                    nextDay.setDate(nextDay.getDate() + 1)
                    const nextDayStr = format(nextDay, 'yyyy-MM-dd')
                    const nextInfo = await getEffectiveSchedule(userId, nextDayStr)
                    setNextScheduleInfo({ ...nextInfo, date: nextDayStr })

                    // Logic to calculate exact max hours
                    if (nextInfo && nextInfo.shiftType !== 'off') {
                        const [currH, currM] = info.endTime.split(':').map(Number)
                        const [nextH, nextM] = nextInfo.startTime.split(':').map(Number)

                        // Total hours from current end to next start (plus 24h if overnight)
                        let totalDiffMins = (nextH * 60 + nextM) - (currH * 60 + currM)
                        if (totalDiffMins <= 0) totalDiffMins += 24 * 60

                        const maxH = Math.floor(totalDiffMins / 60) + (totalDiffMins % 60) / 60
                        setMaxPossibleHours(Math.max(0.5, maxH))
                    } else {
                        setMaxPossibleHours(16) // No shift tomorrow, allow max
                    }
                } catch (error) {
                    console.error('Error fetching schedule:', error)
                } finally {
                    setFetchingSchedule(false)
                }
            }
            fetchSchedules()
        }
    }, [isOpen, date, userId])

    const handleSubmit = async () => {
        if (!date) return toast.error('Vui lòng chọn ngày')
        if (!plannedHours || parseFloat(plannedHours) <= 0) return toast.error('Vui lòng nhập số giờ hợp lệ')
        if (!reason) return toast.error('Vui lòng nhập lý do tăng ca')

        setLoading(true)
        try {
            const res = await createOvertimeRequest({
                requestDate: format(date, 'yyyy-MM-dd'),
                plannedHours: parseFloat(plannedHours),
                reason
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Gửi yêu cầu tăng ca thành công!')
                onSuccess?.()
                onClose()
                // Reset form
                setPlannedHours('1')
                setReason('')
            }
        } catch (error: any) {
            toast.error('Lỗi hệ thống: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Đăng ký Tăng ca (OT)</DialogTitle>
                    <DialogDescription>
                        Yêu cầu sẽ được gửi tới Admin để phê duyệt. Chỉ được tính tăng ca sau giờ làm việc chính thức.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Ngày tăng ca</Label>
                        <DatePicker date={date} setDate={(d) => d && setDate(d)} />
                        {fetchingSchedule ? (
                            <span className="text-xs text-muted-foreground flex items-center">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang kiểm tra lịch...
                            </span>
                        ) : scheduleInfo && (
                            <div className="text-xs text-blue-400 font-medium bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    <span>Lịch làm việc: {scheduleInfo.startTime} - {scheduleInfo.endTime} ({scheduleInfo.shiftType})</span>
                                </div>
                                <div className="text-blue-300/80 italic pl-5">
                                    💡 OT được tính từ sau {scheduleInfo.endTime}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="hours" className="flex justify-between">
                            <span>Số giờ dự kiến (h)</span>
                            {parseFloat(plannedHours) > maxPossibleHours && (
                                <span className="text-[10px] text-rose-500 font-bold animate-pulse">⚠️ Vượt mốc ca sau!</span>
                            )}
                        </Label>
                        <Select value={plannedHours} onValueChange={setPlannedHours}>
                            <SelectTrigger className={`w-full bg-slate-950/50 border-slate-800 ${parseFloat(plannedHours) > maxPossibleHours ? 'border-rose-500/50 ring-1 ring-rose-500/20' : ''}`}>
                                <SelectValue placeholder="Chọn số giờ" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] bg-slate-900 border-slate-800 text-white">
                                {Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5).map((h) => {
                                    const isTooLong = h > maxPossibleHours
                                    return (
                                        <SelectItem key={h} value={h.toString()} className={`cursor-pointer ${isTooLong ? 'text-slate-500 line-through opacity-50' : 'hover:bg-primary/20'}`}>
                                            {h.toFixed(1)} giờ {isTooLong ? ' (Lố ca sau)' : (h >= 8 ? ' (Tăng ca dài)' : '')}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        {parseFloat(plannedHours) > maxPossibleHours ? (
                            <p className="text-[10px] text-rose-400 italic">
                                * Ca tiếp theo bắt đầu lúc {nextScheduleInfo?.startTime}. Bạn chỉ có thể OT tối đa {maxPossibleHours.toFixed(1)}h.
                            </p>
                        ) : (
                            <p className="text-[10px] text-slate-500 italic">
                                * Vui lòng chọn tổng số giờ bạn dự định làm thêm.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reason">Lý do tăng ca</Label>
                        <Textarea
                            id="reason"
                            placeholder="Nhập nội dung công việc làm thêm..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || fetchingSchedule || parseFloat(plannedHours) > maxPossibleHours}
                        className={parseFloat(plannedHours) > maxPossibleHours ? 'bg-rose-900/50 text-rose-200 cursor-not-allowed' : ''}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {parseFloat(plannedHours) > maxPossibleHours ? 'Vượt mốc ca sau' : 'Gửi yêu cầu'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

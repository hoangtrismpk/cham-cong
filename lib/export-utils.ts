
import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export function exportAttendanceToExcel(logs: any[], rangeLabel: string) {
    // 1. Prepare data for Excel - matching the exact requested columns
    const worksheetData = logs.map(log => {
        const dateObj = parseISO(log.work_date + 'T12:00:00')
        return {
            'NGÀY': format(dateObj, 'dd/MM/yyyy'),
            'Thứ': format(dateObj, 'EEEE', { locale: vi }),
            'Clock In': log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm') : '-',
            'Clock Out': log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm') : '-',
            'Thời gian nghỉ': `${Math.floor(log.breakDurationMin / 60)}h ${log.breakDurationMin % 60}m`,
            'Tổng giờ': `${Math.floor(log.totalHours)}h ${Math.round((log.totalHours % 1) * 60)}m`
        }
    })

    // 2. Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(worksheetData)

    // Adjusting column widths for readability
    const colWidths = [
        { wch: 15 }, // NGÀY
        { wch: 15 }, // Thứ
        { wch: 12 }, // Check-In
        { wch: 12 }, // Check-Out
        { wch: 18 }, // Thời gian nghỉ
        { wch: 15 }  // Tổng giờ
    ]
    ws['!cols'] = colWidths

    // 3. Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs')

    // 4. Generate and download file
    const fileName = `Attendance_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
    XLSX.writeFile(wb, fileName)
}


import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Generic function to export JSON data to Excel
 * @param data Array of objects to export
 * @param fileName Name of the file to save
 * @param sheetName Name of the worksheet
 * @param columns Optional column definitions
 */
export async function exportToExcel(
    data: any[],
    fileName: string,
    sheetName: string = 'Sheet1',
    columns?: Partial<ExcelJS.Column>[]
) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    // Auto-generate columns from data keys if not provided
    if (!columns && data.length > 0) {
        columns = Object.keys(data[0]).map(key => ({
            header: key,
            key: key,
            width: 20
        }))
    }

    if (columns) {
        worksheet.columns = columns as ExcelJS.Column[]
    }

    // Add rows
    worksheet.addRows(data)

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, fileName)
}

export function exportAttendanceToExcel(logs: any[], rangeLabel: string) {
    // 1. Prepare data for Excel
    const worksheetData = logs.map(log => {
        const dateObj = parseISO(log.work_date + 'T12:00:00')
        return {
            date: format(dateObj, 'dd/MM/yyyy'),
            day: format(dateObj, 'EEEE', { locale: vi }),
            clockIn: log.check_in_time ? format(parseISO(log.check_in_time), 'HH:mm') : '-',
            clockOut: log.check_out_time ? format(parseISO(log.check_out_time), 'HH:mm') : '-',
            breakTime: `${Math.floor(log.breakDurationMin / 60)}h ${log.breakDurationMin % 60}m`,
            totalHours: `${Math.floor(log.totalHours)}h ${Math.round((log.totalHours % 1) * 60)}m`
        }
    })

    const columns = [
        { header: 'NGÀY', key: 'date', width: 15 },
        { header: 'Thứ', key: 'day', width: 15 },
        { header: 'Clock In', key: 'clockIn', width: 12 },
        { header: 'Clock Out', key: 'clockOut', width: 12 },
        { header: 'Thời gian nghỉ', key: 'breakTime', width: 18 },
        { header: 'Tổng giờ', key: 'totalHours', width: 15 }
    ]

    const fileName = `Attendance_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
    exportToExcel(worksheetData, fileName, 'Attendance Logs', columns)
}

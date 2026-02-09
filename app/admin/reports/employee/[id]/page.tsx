import { getEmployeeReportAnalytics } from '@/app/actions/work-reports-admin'
import { Metadata } from 'next'
import EmployeeReportAnalytics from '@/components/reports/employee-report-analytics'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Phân tích Báo cáo Nhân viên | Admin',
}

export default async function EmployeeReportPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    const { id } = await params
    const sParams = await searchParams

    const currentDate = new Date()
    const month = sParams.month ? parseInt(sParams.month) : currentDate.getMonth() + 1
    const year = sParams.year ? parseInt(sParams.year) : currentDate.getFullYear()

    const analyticsData = await getEmployeeReportAnalytics(id, month, year)

    if (!analyticsData) {
        notFound()
    }

    return (
        <EmployeeReportAnalytics
            data={analyticsData}
            month={month}
            year={year}
            userId={id}
        />
    )
}

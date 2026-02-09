import { getAllReports, getReportStats } from '@/app/actions/work-reports'
import { Metadata } from 'next'
import AdminReportsDashboard from '@/components/reports/admin-reports-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Quản lý Báo cáo | Admin',
}

export default async function AdminReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; month?: string; year?: string; status?: string; type?: string }>
}) {
    const params = await searchParams
    const page = parseInt(params.page || '1')
    const currentDate = new Date()
    const month = params.month ? parseInt(params.month) : currentDate.getMonth() + 1
    const year = params.year ? parseInt(params.year) : currentDate.getFullYear()
    const status = params.status
    const type = params.type

    const [reportsData, stats] = await Promise.all([
        getAllReports(page, 10, { month, year, status, type }),
        getReportStats(month, year)
    ])

    return (
        <div className="p-6 space-y-6">
            <AdminReportsDashboard
                reports={reportsData.reports}
                total={reportsData.total}
                stats={stats}
                currentPage={page}
                filters={{ month, year, status, type }}
            />
        </div>
    )
}
// Forces rebuild

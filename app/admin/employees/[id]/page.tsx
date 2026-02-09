'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEmployeeById, Employee } from '@/app/actions/employees'
import { getAttendanceLogsRange, getEmployeeQuickStats } from '@/app/actions/attendance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    ArrowLeft,
    Edit,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    FileText,
    Clock,
    Download,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EmployeeDetailPage() {
    const params = useParams()
    const router = useRouter()
    const employeeId = params.id as string

    const [employee, setEmployee] = useState<Employee | null>(null)
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([])
    const [attendanceStats, setAttendanceStats] = useState<any>(null)
    const [quickStats, setQuickStats] = useState<any>({ punctuality: 0, ptoBalance: '0', overtime: '0' })
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('personal')

    // Load employee data
    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const result = await getEmployeeById(employeeId)

            if (result.error || !result.employee) {
                router.push('/admin/employees')
                return
            }

            setEmployee(result.employee)

            // Load attendance data for current month
            const now = new Date()
            const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
            const endDate = format(now, 'yyyy-MM-dd')

            const attendanceData = await getAttendanceLogsRange(startDate, endDate, 1, 20)
            setAttendanceLogs(attendanceData.logs || [])
            setAttendanceStats(attendanceData.stats || {})

            // Load quick stats
            const statsResult = await getEmployeeQuickStats(result.employee.id)
            console.log('📊 Quick Stats Result:', statsResult)
            if (statsResult._debug) {
                console.log('🔍 Debug Info:', statsResult._debug)
            }

            // Always set stats, even if there are partial errors (e.g. leave requests failed but attendance worked)
            setQuickStats(statsResult)

            if (statsResult.error) {
                console.warn('⚠️ Quick stats partial error:', statsResult.error)
            }

            setLoading(false)
        }
        loadData()
    }, [employeeId, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
                <div className="text-center">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Đang tải thông tin nhân viên...</p>
                </div>
            </div>
        )
    }

    if (!employee) return null

    const getAvatarFallback = (name: string) => {
        const colors = [
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-fuchsia-600',
            'from-emerald-400 to-cyan-500',
        ]
        const index = name.length % colors.length
        return colors[index]
    }

    const getStatusBadge = (status: string) => {
        if (status === 'active') {
            return (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                </Badge>
            )
        }
        return (
            <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
            </Badge>
        )
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Header */}
            <div className="bg-[#161b22] border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link href="/admin" className="hover:text-white transition-colors">
                            Main Console
                        </Link>
                        <span>/</span>
                        <Link href="/admin/employees" className="hover:text-white transition-colors">
                            Employee Directory
                        </Link>
                        <span>/</span>
                        <span className="text-primary">{employee.full_name}</span>
                    </div>

                    {/* Profile Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white font-black bg-gradient-to-br border-4 border-slate-700 shadow-xl overflow-hidden ${!employee.avatar_url ? getAvatarFallback(employee.full_name) : 'bg-slate-800'}`}>
                                {employee.avatar_url ? (
                                    <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl uppercase">
                                        {`${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`}
                                    </span>
                                )}
                                <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-2 border-[#161b22] rounded-full"></div>
                            </div>

                            {/* Info */}
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{employee.full_name}</h1>
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                        FULL-TIME
                                    </Badge>
                                </div>
                                <p className="text-lg text-slate-300 mb-1">
                                    {employee.job_title} • {employee.department}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="h-3.5 w-3.5" />
                                        ID: #{employee.employee_code}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Joined {employee.start_date ? format(new Date(employee.start_date), 'MMM yyyy') : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="bg-slate-800 border-slate-700"
                                onClick={() => toast.info('Export PDF feature coming soon!')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export PDF
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-black"
                                onClick={() => router.push(`/admin/employees/${employeeId}/edit`)}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 p-1 h-12">
                        <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <FileText className="h-4 w-4 mr-2" />
                            Personal Info
                        </TabsTrigger>
                        <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <Calendar className="h-4 w-4 mr-2" />
                            Work Schedule
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <Clock className="h-4 w-4 mr-2" />
                            Attendance History
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <FileText className="h-4 w-4 mr-2" />
                            Documents
                        </TabsTrigger>
                    </TabsList>

                    {/* Personal Info Tab */}
                    <TabsContent value="personal" className="mt-6 space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* LEFT COLUMN - Contact Details & Emergency */}
                            <div className="col-span-2 space-y-6">
                                {/* Contact Details */}
                                <Card className="bg-[#161b22] border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Mail className="h-5 w-5 text-primary" />
                                            Contact Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Mã NV</p>
                                                <p className="text-white font-medium">{employee.employee_code || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Phòng ban</p>
                                                <p className="text-white font-medium">{employee.department || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Họ và tên</p>
                                                <p className="text-white font-medium">{employee.full_name || `${employee.first_name} ${employee.last_name}`}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Ngày sinh</p>
                                                <p className="text-white font-medium">
                                                    {employee.dob ? format(new Date(employee.dob), 'dd/MM/yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Giới tính</p>
                                                <p className="text-white font-medium">{employee.gender || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Email</p>
                                                <p className="text-white font-medium">{employee.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">SĐT</p>
                                                <p className="text-white font-medium">{employee.phone || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Chức danh</p>
                                                <p className="text-white font-medium">{employee.job_title || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Báo cáo trực tiếp (Sếp)</p>
                                                <p className="text-white font-medium flex items-center gap-2">
                                                    {employee.manager_name ? <span className="text-emerald-400 font-bold">{employee.manager_name}</span> : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Địa chỉ</p>
                                                <p className="text-white font-medium">
                                                    {employee.address || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Emergency Contacts */}
                                <Card className="bg-[#161b22] border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <AlertCircle className="h-5 w-5 text-rose-500" />
                                            SOS - Liên hệ khẩn cấp
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {(() => {
                                            const contact = Array.isArray(employee.emergency_contact)
                                                ? employee.emergency_contact[0]
                                                : employee.emergency_contact

                                            if (!contact || !contact.name) {
                                                return <p className="text-slate-500 italic">Chưa có thông tin liên hệ khẩn cấp</p>
                                            }

                                            return (
                                                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Tên liên hệ</p>
                                                        <p className="text-white font-medium">{contact.name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">SĐT liên hệ</p>
                                                        <p className="text-white font-medium">{contact.phone}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Mối quan hệ</p>
                                                        <p className="text-white font-medium">{contact.relationship}</p>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* RIGHT COLUMN - Quick Stats & Next Shift */}
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <Card className="bg-[#161b22] border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-base font-bold uppercase tracking-wide text-slate-400">
                                            Thống kê nhanh
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                                    <Activity className="h-5 w-5 text-emerald-400" />
                                                </div>
                                                <span className="text-sm text-slate-300 font-medium">Tỷ lệ đúng giờ</span>
                                            </div>
                                            <span className="text-2xl font-black text-emerald-500">
                                                {quickStats.punctuality > 0 ? `${quickStats.punctuality}%` : 'N/A'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                                    <Calendar className="h-5 w-5 text-cyan-400" />
                                                </div>
                                                <span className="text-sm text-slate-300 font-medium">Phép năm còn lại</span>
                                            </div>
                                            <span className="text-2xl font-black text-cyan-500">
                                                {parseFloat(quickStats.ptoBalance) > 0 ? `${quickStats.ptoBalance} ngày` : '12.0 ngày'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                                    <Clock className="h-5 w-5 text-amber-400" />
                                                </div>
                                                <span className="text-sm text-slate-300 font-medium">Tăng ca (Tháng)</span>
                                            </div>
                                            <span className="text-2xl font-black text-amber-500">
                                                {parseFloat(quickStats.overtime) > 0 ? `${quickStats.overtime}h` : '0h'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Next Shift */}
                                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/50 shadow-xl shadow-blue-500/20">
                                    <CardHeader className="pb-3">
                                        <p className="text-xs text-blue-200 uppercase tracking-wider font-bold">NEXT SHIFT</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-white mb-1">Tomorrow, 09:00 AM</h3>
                                            <p className="text-sm text-blue-100 font-medium">Remote • 8 Hours Standard</p>
                                        </div>
                                        <Button
                                            className="w-full bg-white hover:bg-blue-50 text-blue-700 font-bold shadow-lg"
                                            size="lg"
                                        >
                                            View Full Schedule
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Skills & Tags */}
                                {employee.skills && employee.skills.length > 0 && (
                                    <Card className="bg-[#161b22] border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <Briefcase className="h-5 w-5 text-cyan-400" />
                                                Kỹ năng
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {employee.skills.map((skill, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="bg-slate-800/60 text-slate-300 border-slate-700 px-3 py-1.5 text-xs font-medium"
                                                    >
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Work Schedule Tab */}
                    <TabsContent value="schedule" className="mt-6">
                        <Card className="bg-[#161b22] border-slate-800">
                            <CardHeader>
                                <CardTitle>Weekly Schedule (Coming Soon)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400">Work schedule visualization will be implemented here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Attendance History Tab */}
                    <TabsContent value="attendance" className="mt-6 space-y-6">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="bg-[#161b22] border-slate-800">
                                <CardContent className="pt-6">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Monthly Rate</p>
                                    <p className="text-3xl font-black text-emerald-500">94%</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#161b22] border-slate-800">
                                <CardContent className="pt-6">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">On-Time</p>
                                    <p className="text-3xl font-black text-cyan-500">{attendanceStats?.daysPresent || 0}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#161b22] border-slate-800">
                                <CardContent className="pt-6">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Late</p>
                                    <p className="text-3xl font-black text-amber-500">2</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#161b22] border-slate-800">
                                <CardContent className="pt-6">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Absent</p>
                                    <p className="text-3xl font-black text-rose-500">1</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Log Entries */}
                        <Card className="bg-[#161b22] border-slate-800">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Log Entries: Oct 2023</CardTitle>
                                    <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700">
                                        October 2023
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700 hover:bg-slate-800/40">
                                            <TableHead className="text-slate-400">DATE</TableHead>
                                            <TableHead className="text-slate-400">CHECK-IN</TableHead>
                                            <TableHead className="text-slate-400">CHECK-OUT</TableHead>
                                            <TableHead className="text-slate-400">TOTAL HOURS</TableHead>
                                            <TableHead className="text-slate-400">STATUS</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendanceLogs.length > 0 ? (
                                            attendanceLogs.map((log) => (
                                                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/40">
                                                    <TableCell className="font-medium">
                                                        {format(new Date(log.work_date), 'MMM dd, yyyy')}
                                                    </TableCell>
                                                    <TableCell className="text-slate-300">
                                                        {log.check_in_time ? format(new Date(log.check_in_time), 'hh:mm a') : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-300">
                                                        {log.check_out_time ? format(new Date(log.check_out_time), 'hh:mm a') : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-bold">
                                                        {log.totalHours ? `${log.totalHours}h` : '0h'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                log.status === 'present'
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                    : log.status === 'late'
                                                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                            }
                                                        >
                                                            {log.status === 'present' ? 'ON-TIME' : log.status === 'late' ? 'LATE' : 'ABSENT'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                                    No attendance logs found for this period
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="mt-6">
                        <Card className="bg-[#161b22] border-slate-800">
                            <CardHeader>
                                <CardTitle>Documents (Coming Soon)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400">Employee documents will be available here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

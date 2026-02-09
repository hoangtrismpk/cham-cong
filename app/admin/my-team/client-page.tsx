'use client'

import React, { useState } from 'react'
import { TeamMember, TeamStats } from '@/app/actions/my-team'
import OrgChart from '@/components/org-chart/org-chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, AlertCircle, Calendar, Shield, Layout, List } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface MyTeamClientProps {
    team: TeamMember[]
    stats: TeamStats
    currentUserId: string
}

export default function MyTeamClient({ team, stats, currentUserId }: MyTeamClientProps) {
    const [activeTab, setActiveTab] = useState('overview')

    const getStatusVariant = (status?: string) => {
        switch (status) {
            case 'present': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'late': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'absent': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            case 'leave': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            default: return 'bg-slate-700/50 text-slate-400 border-slate-700'
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Đội ngũ của tôi
                    </h1>
                    <p className="text-slate-400 mt-1">Quản lý trực quan hiệu suất và cấu trúc nhân sự.</p>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-widest">Tổng nhân sự</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">{stats.total}</div>
                        <p className="text-xs text-slate-500 mt-1">Thành viên trực thuộc</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-widest">Có mặt</CardTitle>
                        <Clock className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-500">{stats.present}</div>
                        <p className="text-xs text-slate-500 mt-1">Check-in hôm nay</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-widest">Đi muộn</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-500">{stats.late}</div>
                        <p className="text-xs text-slate-500 mt-1">Cần nhắc nhở</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-widest">Nghỉ phép/Vắng</CardTitle>
                        <Calendar className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-500">{stats.absent + stats.leave}</div>
                        <p className="text-xs text-slate-500 mt-1">Nhân sự vắng mặt</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-slate-800/50 border border-slate-700">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <List className="h-4 w-4 mr-2" />
                            Danh sách
                        </TabsTrigger>
                        <TabsTrigger value="org-chart" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <Layout className="h-4 w-4 mr-2" />
                            Sơ đồ tổ chức (Org Chart)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="mt-0">
                    <Card className="bg-[#161b22] border-slate-800">
                        <CardHeader>
                            <CardTitle>Danh sách nhân viên</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                        <TableHead className="text-slate-400">Nhân viên</TableHead>
                                        <TableHead className="text-slate-400">Vị trí</TableHead>
                                        <TableHead className="text-slate-400">Phòng ban</TableHead>
                                        <TableHead className="text-slate-400">Trạng thái chấm công</TableHead>
                                        <TableHead className="text-slate-400">Check-in</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {team.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                                Chưa có nhân viên nào trong đội ngũ của bạn
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        team.map((member) => (
                                            <TableRow key={member.id} className="border-slate-800 hover:bg-slate-800/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white bg-slate-700 border border-slate-600 overflow-hidden`}>
                                                            {member.avatar_url ? (
                                                                <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs font-bold">
                                                                    {`${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <Link href={`/admin/employees/${member.id}`} className="font-bold text-white hover:text-primary transition-colors">
                                                                {member.full_name}
                                                            </Link>
                                                            {member.manager_id === currentUserId && (
                                                                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                                                                    <Shield className="h-3 w-3" /> Direct Report
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300">{member.job_title || 'N/A'}</TableCell>
                                                <TableCell className="text-slate-300">{member.department || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getStatusVariant(member.attendance?.status || 'absent')}>
                                                        {(member.attendance?.status || 'absent').toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-300 font-mono text-xs">
                                                    {member.attendance?.check_in
                                                        ? format(new Date(member.attendance.check_in), 'HH:mm:ss')
                                                        : '--:--:--'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="org-chart" className="mt-0 h-[700px]">
                    <Card className="bg-[#161b22] border-slate-800 h-full flex flex-col">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle>Cấu trúc đội nhóm</CardTitle>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    Interactive
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative">
                            <OrgChart members={team} currentUserId={currentUserId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

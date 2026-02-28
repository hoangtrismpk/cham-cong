'use client'

import React, { useState } from 'react'
import { TeamMember, TeamStats, getMyTeamData } from '@/app/actions/my-team'
import OrgChart from '@/components/org-chart/org-chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, Layout, List, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useI18n } from '@/contexts/i18n-context'
import { toast } from 'sonner'

interface MyTeamClientProps {
    team: TeamMember[]
    stats: TeamStats
    currentUserId: string
    meta?: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

export default function MyTeamClient({ team: initialTeam, stats: initialStats, currentUserId, meta: initialMeta }: MyTeamClientProps) {
    const { t } = useI18n()
    const [activeTab, setActiveTab] = useState('overview')

    // Server-side Pagination State
    const [team, setTeam] = useState<TeamMember[]>(initialTeam)
    const [stats, setStats] = useState<TeamStats>(initialStats)
    const [page, setPage] = useState(initialMeta?.page || 1)
    const [totalPages, setTotalPages] = useState(initialMeta?.totalPages || 1)
    const [totalRecords, setTotalRecords] = useState(initialMeta?.total || 0)
    const [loading, setLoading] = useState(false)

    // Fetch data when page changes
    const loadTeamData = async (newPage: number) => {
        setLoading(true)
        try {
            const { team: newTeam, stats: newStats, meta } = await getMyTeamData({
                page: newPage,
                limit: 10
            })

            if (newTeam) {
                setTeam(newTeam)
                setStats(newStats)
                setPage(meta?.page || newPage)
                setTotalPages(meta?.totalPages || 1)
                setTotalRecords(meta?.total || 0)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load team data')
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            loadTeamData(newPage)
        }
    }

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
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117] space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        {t.admin.myTeam.title}
                    </h1>
                    <p className="text-slate-400">
                        {t.admin.myTeam.subtitle}
                    </p>
                </div>
            </header>

            {/* KPI Cards - Matching Admin Dashboard Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {/* Total Team Members */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-blue-500/50 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                    <div className="flex justify-between items-center mb-3 md:mb-4 relative z-10">
                        <div className="p-1.5 md:p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">groups_3</span>
                        </div>
                        <span className="text-blue-500 text-[9px] md:text-xs font-bold bg-blue-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">100%</span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider relative z-10">{t.admin.myTeam.stats.total}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1 relative z-10">{stats.total}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden relative z-10">
                        <div className="bg-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* Present / Check-in */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-emerald-500/50 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                    <div className="flex justify-between items-center mb-3 md:mb-4 relative z-10">
                        <div className="p-1.5 md:p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">login</span>
                        </div>
                        <span className="text-emerald-500 text-[9px] md:text-xs font-bold bg-emerald-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">
                            {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                        </span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider relative z-10">{t.admin.myTeam.stats.present}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1 relative z-10">{stats.present}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden relative z-10">
                        <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${stats.total > 0 ? (stats.present / stats.total) * 100 : 0}%` }}></div>
                    </div>
                </div>

                {/* Late */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-amber-500/50 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
                    <div className="flex justify-between items-center mb-3 md:mb-4 relative z-10">
                        <div className="p-1.5 md:p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">schedule_send</span>
                        </div>
                        <span className="text-amber-500 text-[9px] md:text-xs font-bold bg-amber-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">
                            {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%
                        </span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider relative z-10">{t.admin.myTeam.stats.late}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1 relative z-10">{stats.late}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden relative z-10">
                        <div className="bg-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${stats.total > 0 ? (stats.late / stats.total) * 100 : 0}%` }}></div>
                    </div>
                </div>

                {/* Absent / Leave */}
                <div className="bg-[#161b2c] p-4 md:p-5 rounded-2xl border border-[#2d3748] shadow-sm group hover:border-rose-500/50 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
                    <div className="flex justify-between items-center mb-3 md:mb-4 relative z-10">
                        <div className="p-1.5 md:p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px] md:text-[24px]">logout</span>
                        </div>
                        <span className="text-slate-400 text-[9px] md:text-xs font-bold bg-slate-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">{t.admin.today || 'Hôm nay'}</span>
                    </div>
                    <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-wider relative z-10">{t.admin.myTeam.stats.absent}</p>
                    <p className="text-xl md:text-3xl font-black text-white mt-1 relative z-10">{stats.absent + stats.leave}</p>
                    <div className="mt-2 md:mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden relative z-10">
                        <div className="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${stats.total > 0 ? ((stats.absent + stats.leave) / stats.total) * 100 : 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-slate-800/50 border border-slate-700">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <List className="h-4 w-4 mr-2" />
                            {t.admin.myTeam.tabs.list}
                        </TabsTrigger>
                        <TabsTrigger value="org-chart" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                            <Layout className="h-4 w-4 mr-2" />
                            {t.admin.myTeam.tabs.orgChart}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="mt-0">
                    <Card className="bg-[#161b22] border-slate-800">
                        <CardHeader>
                            <CardTitle>{t.admin.myTeam.table.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-slate-900/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-md">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                    </div>
                                )}
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                            <TableHead className="text-slate-400">{t.admin.myTeam.table.employee}</TableHead>
                                            <TableHead className="text-slate-400">{t.admin.myTeam.table.position}</TableHead>
                                            <TableHead className="text-slate-400">{t.admin.myTeam.table.department}</TableHead>
                                            <TableHead className="text-slate-400">{t.admin.myTeam.table.status}</TableHead>
                                            <TableHead className="text-slate-400">{t.admin.myTeam.table.checkin}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {team.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                                    {t.admin.myTeam.table.empty}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            team.map((member) => {
                                                const displayId = member.numeric_id ? member.numeric_id.toString().padStart(6, '0') : member.id;

                                                return (
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
                                                                    <Link href={`/admin/employees/${displayId}`} className="font-bold text-white hover:text-primary transition-colors block leading-tight">
                                                                        {member.full_name}
                                                                    </Link>
                                                                    <p className="text-[11px] text-slate-500 mt-0.5">{member.email}</p>
                                                                    {member.manager_id === currentUserId && (
                                                                        <p className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1.5">
                                                                            <Shield className="h-3 w-3" /> {t.admin.myTeam.table.directReport}
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
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between mt-4 py-2 border-t border-slate-800">
                                <div className="text-sm text-slate-400">
                                    Showing <span className="text-white font-medium">{Math.min((page - 1) * 10 + 1, totalRecords)}</span> to <span className="text-white font-medium">{Math.min(page * 10, totalRecords)}</span> of <span className="text-white font-medium">{totalRecords}</span> members
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page === 1 || loading}
                                        className="bg-[#0d1117] border-slate-700 hover:bg-slate-800 text-slate-300"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            // Simple logic to show near pages. For simplicity showing first 5 or current window.
                                            // Let's implement simple window: Current - 2 to Current + 2
                                            let p = page;
                                            if (page < 3) p = 3;
                                            if (page > totalPages - 2) p = totalPages - 2;

                                            // Fallback to simple map if pages are few
                                            if (totalPages <= 5) return i + 1;
                                            return p - 2 + i;
                                        })
                                            .filter(p => p > 0 && p <= totalPages)
                                            .map(p => (
                                                <Button
                                                    key={p}
                                                    variant={p === page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(p)}
                                                    disabled={loading}
                                                    className={p === page
                                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                        : "bg-[#0d1117] border-slate-700 hover:bg-slate-800 text-slate-300"}
                                                >
                                                    {p}
                                                </Button>
                                            ))}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page >= totalPages || loading}
                                        className="bg-[#0d1117] border-slate-700 hover:bg-slate-800 text-slate-300"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="org-chart" className="mt-0 h-[700px]">
                    <Card className="bg-[#161b22] border-slate-800 h-full flex flex-col">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle>{t.admin.myTeam.orgChart.title}</CardTitle>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    {t.admin.myTeam.orgChart.badge}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative">
                            {/* Note: OrgChart currently visualizes only paginated data.
                                In future, we should fetch full tree for chart. 
                            */}
                            <div className="absolute top-2 right-2 z-10">
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                                    Visualizing current page only
                                </Badge>
                            </div>
                            <OrgChart members={team} currentUserId={currentUserId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

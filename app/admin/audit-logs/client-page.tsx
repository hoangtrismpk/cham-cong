'use client'

import { useState, useEffect } from 'react'
import { getAuditLogs, exportAuditLogs, type AuditLogEntry } from '@/app/actions/audit-logs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Loader2, Download, ChevronLeft, ChevronRight, Search, Filter, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { usePermissions } from '@/contexts/permission-context'

export default function AuditLogsClientPage() {
    const { can } = usePermissions()
    const canExport = can('audit_logs.export')

    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [limit] = useState(20)
    const [total, setTotal] = useState(0)
    const totalPages = Math.ceil(total / limit)

    // Filters
    const [actionFilter, setActionFilter] = useState<string | undefined>(undefined)
    const [resourceFilter, setResourceFilter] = useState<string | undefined>(undefined)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedLog, setExpandedLog] = useState<string | null>(null)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    // Load logs
    useEffect(() => {
        loadLogs()
    }, [page, actionFilter, resourceFilter])

    async function loadLogs() {
        setLoading(true)
        try {
            const result = await getAuditLogs({
                page,
                limit,
                action: actionFilter || undefined,
                resourceType: resourceFilter || undefined
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                setLogs(result.logs)
                setTotal(result.total)
            }
        } catch (error) {
            console.error('Failed to load audit logs:', error)
            toast.error('Không thể tải audit logs')
        } finally {
            setLoading(false)
        }
    }

    // Export to CSV
    async function handleExport() {
        setExporting(true)
        try {
            const result = await exportAuditLogs({
                action: actionFilter || undefined,
                resourceType: resourceFilter || undefined
            })

            if (result.error) {
                toast.error(result.error)
                return
            }

            // Download CSV
            const blob = new Blob([result.csv || ''], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)

            toast.success('Đã xuất audit logs')
        } catch (error) {
            console.error('Export failed:', error)
            toast.error('Không thể xuất file')
        } finally {
            setExporting(false)
        }
    }

    // Filter logs by search query
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            log.user_name?.toLowerCase().includes(q) ||
            log.user_email?.toLowerCase().includes(q) ||
            log.description?.toLowerCase().includes(q) ||
            log.action.toLowerCase().includes(q)
        )
    })

    // Action badge colors
    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-500/20 text-green-400 border-green-500/30'
            case 'UPDATE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30'
            case 'APPROVE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            case 'REJECT': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            case 'ASSIGN_ROLE': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        }
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-[#0d1117] space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-400">
                        Theo dõi tất cả hoạt động của admin trong hệ thống
                    </p>
                </div>
            </header>

            {/* Filters */}
            {mounted && (
                <Card className="bg-[#161b22] border-slate-800 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-[#0d1117] border-slate-700"
                            />
                        </div>

                        {/* Action Filter */}
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                <SelectValue placeholder="Tất cả actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CREATE">CREATE</SelectItem>
                                <SelectItem value="UPDATE">UPDATE</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                                <SelectItem value="APPROVE">APPROVE</SelectItem>
                                <SelectItem value="REJECT">REJECT</SelectItem>
                                <SelectItem value="ASSIGN_ROLE">ASSIGN_ROLE</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Resource Filter */}
                        <Select value={resourceFilter} onValueChange={setResourceFilter}>
                            <SelectTrigger className="bg-[#0d1117] border-slate-700">
                                <SelectValue placeholder="Tất cả resources" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="role">Role</SelectItem>
                                <SelectItem value="setting">Setting</SelectItem>
                                <SelectItem value="approval">Approval</SelectItem>
                                <SelectItem value="leave_request">Leave Request</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {(actionFilter || resourceFilter || searchQuery) && (
                            <Button
                                onClick={() => {
                                    setActionFilter(undefined)
                                    setResourceFilter(undefined)
                                    setSearchQuery('')
                                }}
                                variant="outline"
                                className="border-slate-700 bg-[#0d1117] hover:bg-slate-800"
                            >
                                Xóa lọc
                            </Button>
                        )}

                        {/* Export Button */}
                        {canExport && (
                            <Button
                                onClick={handleExport}
                                disabled={exporting}
                                variant="outline"
                                className="border-slate-700 bg-[#0d1117] hover:bg-slate-800"
                            >
                                {exporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Xuất CSV
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Logs List */}
            {!mounted ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : filteredLogs.length === 0 ? (
                <Card className="bg-[#161b22] border-slate-800 p-12">
                    <div className="text-center">
                        <Filter className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Không có audit logs nào</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map((log) => (
                        <Card
                            key={log.id}
                            className="bg-[#161b22] border-slate-800 p-4 hover:bg-[#1c2128] transition-colors cursor-pointer"
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge className={getActionColor(log.action)}>
                                            {log.action}
                                        </Badge>
                                        <span className="text-xs text-slate-500">
                                            {log.resource_type}
                                        </span>
                                        <span className="text-xs text-slate-600">•</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(log.created_at).toLocaleString('vi-VN', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-white mb-1">
                                        {log.description || 'No description'}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>👤 {log.user_name || log.user_email || 'System'}</span>
                                        <span>🎭 {log.user_role || '-'}</span>
                                        {log.ip_address && <span>📍 {log.ip_address}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedLog === log.id && (
                                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                                    {log.old_values && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">Old Values:</p>
                                            <pre className="text-xs bg-[#0d1117] p-2 rounded border border-slate-700 overflow-auto">
                                                {JSON.stringify(log.old_values, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {log.new_values && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">New Values:</p>
                                            <pre className="text-xs bg-[#0d1117] p-2 rounded border border-slate-700 overflow-auto">
                                                {JSON.stringify(log.new_values, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {log.user_agent && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">User Agent:</p>
                                            <p className="text-xs text-slate-500">{log.user_agent}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-slate-700 bg-[#0d1117] hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Trước
                    </Button>

                    <span className="text-sm text-slate-400">
                        Trang {page} / {totalPages} ({total} logs)
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-slate-700 bg-[#0d1117] hover:bg-slate-800"
                    >
                        Sau
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    )
}

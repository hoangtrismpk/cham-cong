'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle, Smartphone, Monitor, Tablet, Users, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/contexts/i18n-context'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

type DiagnosticData = {
    fcm_tokens: {
        total: number
        unique_users: number
        by_device: Record<string, number>
        error: string | null
    }
    recent_logs: {
        count: number
        logs: Array<{
            user_id: string
            shift_id: string
            type: string
            status: string
            sent_at: string
            clicked_at: string | null
        }>
    }
    env: Record<string, string>
    today_shifts: {
        date: string
        total: number
        shifts: Array<{
            id: string
            user_id: string
            title: string
            start_time: string
            end_time: string
        }>
    }
    user_coverage: {
        total_users: number
        users_with_tokens: number
        users_without_tokens: number
        missing_users: Array<{ id: string; name: string }>
    }
} | null

type TestResult = {
    success: boolean
    total_tokens: number
    success_count: number
    failure_count: number
    stale_tokens_removed: number
    token_details: Array<{
        device_type: string
        status: string
        error: string | null
    }>
} | null

type UserItem = {
    id: string
    full_name: string
    department: string | null
}

export default function NotificationsSettingsClientPage() {
    const { t } = useI18n()
    const nt = t.adminSettings.notificationDashboard

    const [activeTab, setActiveTab] = useState<'diagnostics' | 'testPush' | 'logs'>('diagnostics')
    const [diagnostics, setDiagnostics] = useState<DiagnosticData>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [testResult, setTestResult] = useState<TestResult>(null)
    const [users, setUsers] = useState<UserItem[]>([])
    const [selectedUserId, setSelectedUserId] = useState('')
    const [notifTitle, setNotifTitle] = useState('')
    const [notifMessage, setNotifMessage] = useState('')

    // Load users for test push
    useEffect(() => {
        const loadUsers = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, department')
                .order('full_name')
            if (data) setUsers(data)
        }
        loadUsers()
    }, [])

    // Run diagnostics
    const runDiagnostics = async () => {
        setIsRunning(true)
        try {
            const res = await fetch('/api/admin/notification-diagnostics')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setDiagnostics(data.diagnostics)
            toast.success('Kiểm tra hoàn tất!')
        } catch (err: any) {
            toast.error(`Lỗi: ${err.message}`)
        } finally {
            setIsRunning(false)
        }
    }

    // Send test push
    const sendTestPush = async () => {
        if (!selectedUserId) {
            toast.error('Vui lòng chọn nhân viên')
            return
        }
        setIsSending(true)
        setTestResult(null)
        try {
            const res = await fetch('/api/admin/test-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: selectedUserId,
                    title: notifTitle || '🔔 Test Notification',
                    message: notifMessage || 'Đây là thông báo test từ Admin Dashboard',
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Gửi thất bại')
                return
            }
            setTestResult(data)
            if (data.success_count > 0) {
                toast.success(nt.testPush.success)
            } else {
                toast.error(nt.testPush.failed)
            }
        } catch (err: any) {
            toast.error(`Lỗi: ${err.message}`)
        } finally {
            setIsSending(false)
        }
    }

    const tabs = [
        { id: 'diagnostics' as const, label: nt.tabs.diagnostics, icon: Activity },
        { id: 'testPush' as const, label: nt.tabs.testPush, icon: Send },
        { id: 'logs' as const, label: nt.tabs.logs, icon: Clock },
    ]

    const getDeviceIcon = (type: string) => {
        if (type === 'mobile') return <Smartphone className="h-4 w-4" />
        if (type === 'tablet') return <Tablet className="h-4 w-4" />
        return <Monitor className="h-4 w-4" />
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                    <Bell className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{nt.title}</h2>
                    <p className="text-sm text-slate-400">{nt.subtitle}</p>
                </div>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${activeTab === tab.id
                                ? 'bg-slate-800 text-white shadow-md border border-slate-700/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="space-y-4">
                {/* === DIAGNOSTICS TAB === */}
                {activeTab === 'diagnostics' && (
                    <div className="space-y-4">
                        <button
                            onClick={runDiagnostics}
                            disabled={isRunning}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                            {isRunning ? nt.diagnostics.running : nt.diagnostics.runCheck}
                        </button>

                        {!diagnostics && !isRunning && (
                            <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50">
                                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>{nt.diagnostics.noData}</p>
                            </div>
                        )}

                        {diagnostics && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Env Vars */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-yellow-400" />
                                        {nt.diagnostics.envVars}
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries(diagnostics.env).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between text-xs">
                                                <code className="text-slate-400 font-mono">{key}</code>
                                                <span className={val.includes('✅') ? 'text-emerald-400' : 'text-red-400'}>{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* FCM Tokens */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Smartphone className="h-4 w-4 text-blue-400" />
                                        {nt.diagnostics.fcmTokens}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-white">{diagnostics.fcm_tokens.total}</div>
                                            <div className="text-[11px] text-slate-400">{nt.diagnostics.totalTokens}</div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-cyan-400">{diagnostics.fcm_tokens.unique_users}</div>
                                            <div className="text-[11px] text-slate-400">{nt.diagnostics.uniqueUsers}</div>
                                        </div>
                                    </div>
                                    {diagnostics.fcm_tokens.by_device && (
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(diagnostics.fcm_tokens.by_device).map(([device, count]) => (
                                                <Badge key={device} variant="outline" className="text-xs gap-1 border-slate-700">
                                                    {getDeviceIcon(device)}
                                                    {device}: {count}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* User Coverage */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-emerald-400" />
                                        {nt.diagnostics.userCoverage}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-white">{diagnostics.user_coverage.total_users}</div>
                                            <div className="text-[10px] text-slate-400">{nt.diagnostics.totalUsers}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-emerald-400">{diagnostics.user_coverage.users_with_tokens}</div>
                                            <div className="text-[10px] text-slate-400">{nt.diagnostics.withTokens}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-amber-400">{diagnostics.user_coverage.users_without_tokens}</div>
                                            <div className="text-[10px] text-slate-400">{nt.diagnostics.withoutTokens}</div>
                                        </div>
                                    </div>

                                    {/* Coverage bar */}
                                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${diagnostics.user_coverage.total_users > 0 ? (diagnostics.user_coverage.users_with_tokens / diagnostics.user_coverage.total_users * 100) : 0}%` }}
                                        />
                                    </div>

                                    {diagnostics.user_coverage.missing_users && diagnostics.user_coverage.missing_users.length > 0 && (
                                        <div className="text-xs text-amber-400/70">
                                            <span className="font-medium">⚠ {nt.diagnostics.withoutTokens}:</span>{' '}
                                            {diagnostics.user_coverage.missing_users.map(u => u.name || 'N/A').join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Today's Shifts */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-purple-400" />
                                        {nt.diagnostics.todayShifts}
                                        <Badge variant="outline" className="text-[10px] border-slate-700 ml-auto">
                                            {diagnostics.today_shifts.date}
                                        </Badge>
                                    </h3>
                                    {diagnostics.today_shifts.total === 0 ? (
                                        <p className="text-xs text-slate-500">Không có ca làm nào hôm nay</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                            {diagnostics.today_shifts.shifts?.map(s => (
                                                <div key={s.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                                                    <span className="text-slate-300 font-medium truncate max-w-[120px]">{s.title || 'Ca làm'}</span>
                                                    <span className="text-cyan-400 font-mono">{s.start_time} - {s.end_time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500 text-right">{diagnostics.today_shifts.total} ca</div>
                                </div>

                                {/* Recent Logs */}
                                <div className="col-span-full bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-orange-400" />
                                        {nt.diagnostics.recentLogs}
                                    </h3>
                                    {(!diagnostics.recent_logs.logs || diagnostics.recent_logs.logs.length === 0) ? (
                                        <p className="text-xs text-slate-500 text-center py-4">{nt.logs.empty}</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-800">
                                                        <th className="text-left py-2 text-slate-500 font-medium">{nt.logs.type}</th>
                                                        <th className="text-left py-2 text-slate-500 font-medium">{nt.logs.status}</th>
                                                        <th className="text-left py-2 text-slate-500 font-medium">{nt.logs.sentAt}</th>
                                                        <th className="text-left py-2 text-slate-500 font-medium">{nt.logs.clickedAt}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {diagnostics.recent_logs.logs.map((log, i) => (
                                                        <tr key={i} className="border-b border-slate-800/50">
                                                            <td className="py-2">
                                                                <Badge variant="outline" className="text-[10px] border-slate-700">
                                                                    {log.type}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-2">
                                                                {log.status === 'sent' ? (
                                                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Sent</span>
                                                                ) : (
                                                                    <span className="text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 text-slate-400">{log.sent_at ? new Date(log.sent_at).toLocaleString('vi-VN') : '-'}</td>
                                                            <td className="py-2">
                                                                {log.clicked_at ? (
                                                                    <span className="text-cyan-400">{new Date(log.clicked_at).toLocaleString('vi-VN')}</span>
                                                                ) : (
                                                                    <span className="text-slate-600">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* === TEST PUSH TAB === */}
                {activeTab === 'testPush' && (
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 space-y-5 max-w-lg">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Send className="h-5 w-5 text-cyan-400" />
                            {nt.testPush.title}
                        </h3>

                        {/* Select user */}
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">{nt.testPush.selectUser}</label>
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                            >
                                <option value="">{nt.testPush.selectUserPlaceholder}</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.full_name || 'N/A'} {u.department ? `(${u.department})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">{nt.testPush.notifTitle}</label>
                            <input
                                type="text"
                                value={notifTitle}
                                onChange={e => setNotifTitle(e.target.value)}
                                placeholder={nt.testPush.notifTitlePlaceholder}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">{nt.testPush.notifMessage}</label>
                            <textarea
                                value={notifMessage}
                                onChange={e => setNotifMessage(e.target.value)}
                                placeholder={nt.testPush.notifMessagePlaceholder}
                                rows={3}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none"
                            />
                        </div>

                        {/* Send button */}
                        <button
                            onClick={sendTestPush}
                            disabled={isSending || !selectedUserId}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 w-full justify-center"
                        >
                            <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
                            {isSending ? nt.testPush.sending : nt.testPush.sendTest}
                        </button>

                        {/* Result */}
                        {testResult && (
                            <div className={`rounded-xl border p-4 space-y-3 ${testResult.success_count > 0
                                    ? 'bg-emerald-950/30 border-emerald-500/30'
                                    : 'bg-red-950/30 border-red-500/30'
                                }`}>
                                <h4 className="text-sm font-semibold text-white">{nt.testPush.result}</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <div className="text-lg font-bold text-emerald-400">{testResult.success_count}</div>
                                        <div className="text-[10px] text-slate-400">{nt.testPush.successCount}</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-red-400">{testResult.failure_count}</div>
                                        <div className="text-[10px] text-slate-400">{nt.testPush.failCount}</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-amber-400">{testResult.stale_tokens_removed}</div>
                                        <div className="text-[10px] text-slate-400">{nt.testPush.staleRemoved}</div>
                                    </div>
                                </div>
                                {testResult.token_details && (
                                    <div className="space-y-1">
                                        {testResult.token_details.map((td, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                                                <span className="flex items-center gap-1.5">
                                                    {getDeviceIcon(td.device_type)}
                                                    {td.device_type}
                                                </span>
                                                <span className={td.status === 'delivered' ? 'text-emerald-400' : 'text-red-400'}>
                                                    {td.status === 'delivered' ? '✅' : '❌'} {td.status}
                                                    {td.error && <span className="text-red-300 ml-1">({td.error})</span>}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* === LOGS TAB === */}
                {activeTab === 'logs' && (
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-purple-400" />
                                {nt.logs.title}
                            </h3>
                            <button
                                onClick={runDiagnostics}
                                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <RefreshCw className="h-3 w-3" /> Refresh
                            </button>
                        </div>

                        {(!diagnostics?.recent_logs?.logs || diagnostics.recent_logs.logs.length === 0) ? (
                            <div className="text-center py-12 text-slate-500">
                                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">{nt.logs.empty}</p>
                                <p className="text-xs text-slate-600 mt-1">Chạy tab &quot;Chẩn đoán&quot; để tải dữ liệu</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.userId}</th>
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.shiftId}</th>
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.type}</th>
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.status}</th>
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.sentAt}</th>
                                            <th className="text-left py-2 px-2 text-slate-500 font-medium">{nt.logs.clickedAt}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diagnostics.recent_logs.logs.map((log, i) => (
                                            <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-2 px-2 font-mono text-slate-400">{log.user_id?.substring(0, 8)}...</td>
                                                <td className="py-2 px-2 font-mono text-slate-400">{log.shift_id?.substring(0, 8) || '—'}...</td>
                                                <td className="py-2 px-2">
                                                    <Badge variant="outline" className="text-[10px] border-slate-700">{log.type}</Badge>
                                                </td>
                                                <td className="py-2 px-2">
                                                    {log.status === 'sent' ? (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" /> Sent
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-400 flex items-center gap-1">
                                                            <XCircle className="h-3 w-3" /> {log.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 text-slate-400">{log.sent_at ? new Date(log.sent_at).toLocaleString('vi-VN') : '-'}</td>
                                                <td className="py-2 px-2">
                                                    {log.clicked_at ? (
                                                        <span className="text-cyan-400">{new Date(log.clicked_at).toLocaleString('vi-VN')}</span>
                                                    ) : (
                                                        <span className="text-slate-600">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

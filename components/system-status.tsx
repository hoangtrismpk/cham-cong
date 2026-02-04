'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'

export function SystemStatus() {
    const [status, setStatus] = useState<ConnectionStatus>('CONNECTING')
    const [lastSync, setLastSync] = useState<Date>(new Date())

    useEffect(() => {
        const supabase = createClient()

        // Create a channel to monitor connection state
        const channel = supabase.channel('system_status_monitor')

        channel
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setStatus('CONNECTED')
                    setLastSync(new Date())
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setStatus('DISCONNECTED')
                } else {
                    setStatus('CONNECTING')
                }
            })

        // Listen for ANY changes in attendance_logs to prove sync is working
        const attendanceSubscription = supabase
            .channel('attendance_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance_logs' },
                () => {
                    // When data changes, flash the sync status or update timestamp
                    setLastSync(new Date())
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(attendanceSubscription)
        }
    }, [])

    return (
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-[#1e293b] mb-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase">System Status</p>
                {status === 'CONNECTED' && (
                    <span className="text-[9px] text-slate-600 font-mono">
                        {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    {status === 'CONNECTED' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'CONNECTED' ? 'bg-emerald-500' :
                            status === 'CONNECTING' ? 'bg-amber-500' :
                                'bg-rose-500'
                        }`}></span>
                </span>
                <span className={`text-xs font-medium ${status === 'CONNECTED' ? 'text-slate-300' :
                        status === 'CONNECTING' ? 'text-amber-500' :
                            'text-rose-500'
                    }`}>
                    {status === 'CONNECTED' ? 'Live Sync Active' :
                        status === 'CONNECTING' ? 'Connecting...' :
                            'Sync Offline'}
                </span>
            </div>
        </div>
    )
}

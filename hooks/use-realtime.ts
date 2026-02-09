'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Hook to listen for real-time permission changes
 * Automatically refreshes when user's role or permissions are updated
 */
export function useRealtimePermissions(userId?: string) {
    const router = useRouter()
    const [permissionsUpdated, setPermissionsUpdated] = useState(false)

    useEffect(() => {
        if (!userId) return

        const supabase = createClient()

        // Subscribe to profile changes (role_id updates)
        const profileChannel = supabase
            .channel('profile-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    console.log('[Realtime] Profile updated:', payload)

                    // Check if role_id changed
                    if (payload.new.role_id !== payload.old.role_id) {
                        toast.info('Quyền của bạn đã được cập nhật. Đang tải lại...', {
                            duration: 3000
                        })

                        setPermissionsUpdated(true)

                        // Delay to show toast, then refresh
                        setTimeout(() => {
                            router.refresh()
                        }, 1500)
                    }
                }
            )
            .subscribe()

        // Also subscribe to role table changes (in case permissions array is modified)
        const roleChannel = supabase
            .channel('role-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'roles'
                },
                (payload) => {
                    console.log('[Realtime] Role updated:', payload)

                    // If permissions array changed, refresh
                    const oldPerms = JSON.stringify(payload.old.permissions)
                    const newPerms = JSON.stringify(payload.new.permissions)

                    if (oldPerms !== newPerms) {
                        toast.info('Quyền hạn đã được điều chỉnh. Đang làm mới...', {
                            duration: 3000
                        })

                        setPermissionsUpdated(true)

                        setTimeout(() => {
                            router.refresh()
                        }, 1500)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(profileChannel)
            supabase.removeChannel(roleChannel)
        }
    }, [userId, router])

    return { permissionsUpdated }
}

/**
 * Hook to listen for audit log changes
 * Can be used to show real-time notifications for admin actions
 */
export function useRealtimeAuditLogs(onNewLog?: (log: any) => void) {
    const [newLogsCount, setNewLogsCount] = useState(0)

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel('audit-logs')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'audit_logs'
                },
                (payload) => {
                    console.log('[Realtime] New audit log:', payload)

                    setNewLogsCount(prev => prev + 1)

                    if (onNewLog) {
                        onNewLog(payload.new)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [onNewLog])

    return { newLogsCount, resetCount: () => setNewLogsCount(0) }
}

/**
 * Hook to listen for approval status changes
 * Useful for showing toast notifications when requests are approved/rejected
 */
export function useRealtimeApprovals(userId?: string, onStatusChange?: (approval: any) => void) {
    useEffect(() => {
        if (!userId) return

        const supabase = createClient()

        // Listen for leave_requests updates
        const leaveChannel = supabase
            .channel('leave-approvals')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'leave_requests',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[Realtime] Leave request updated:', payload)

                    // Check if status changed
                    if (payload.new.status !== payload.old.status) {
                        const status = payload.new.status

                        if (status === 'approved') {
                            toast.success('Đơn nghỉ phép của bạn đã được duyệt!', {
                                duration: 5000
                            })
                        } else if (status === 'rejected') {
                            toast.error('Đơn nghỉ phép của bạn đã bị từ chối.', {
                                duration: 5000
                            })
                        }

                        if (onStatusChange) {
                            onStatusChange(payload.new)
                        }
                    }
                }
            )
            .subscribe()

        // Listen for change_requests updates
        const changeChannel = supabase
            .channel('change-approvals')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'change_requests',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[Realtime] Change request updated:', payload)

                    if (payload.new.status !== payload.old.status) {
                        const status = payload.new.status

                        if (status === 'approved') {
                            toast.success('Yêu cầu sửa chấm công đã được duyệt!', {
                                duration: 5000
                            })
                        } else if (status === 'rejected') {
                            toast.error('Yêu cầu sửa chấm công đã bị từ chối.', {
                                duration: 5000
                            })
                        }

                        if (onStatusChange) {
                            onStatusChange(payload.new)
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(leaveChannel)
            supabase.removeChannel(changeChannel)
        }
    }, [userId, onStatusChange])
}

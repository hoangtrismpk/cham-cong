'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface SettingsSyncBannerProps {
    isVisible: boolean
    onReload: () => void
    loading?: boolean
}

/**
 * Banner component that shows when settings have been updated by admin
 * Prompts user to reload to get the latest settings
 */
export function SettingsSyncBanner({
    isVisible,
    onReload,
    loading = false
}: SettingsSyncBannerProps) {
    if (!isVisible) return null

    return (
        <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-yellow-700 dark:text-yellow-300">
                    ⚠️ Quy định chấm công vừa được cập nhật bởi Admin. Vui lòng tải lại để áp dụng thay đổi mới.
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onReload}
                    disabled={loading}
                    className="border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
                >
                    {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Cập nhật ngay
                </Button>
            </AlertDescription>
        </Alert>
    )
}

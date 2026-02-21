'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-6 p-4 text-center">
            <div className="bg-rose-500/10 p-6 rounded-full ring-1 ring-rose-500/20 shadow-2xl">
                <AlertTriangle className="w-16 h-16 text-rose-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Đã xảy ra lỗi!</h1>
                <p className="text-slate-500 max-w-[400px]">
                    Hệ thống gặp sự cố khi tải trang này. Vui lòng thử lại.
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-rose-900/50 text-left w-full max-w-[500px] overflow-auto max-h-[200px]">
                        <p className="font-mono text-xs text-rose-400">{error.message}</p>
                        {error.digest && <p className="font-mono text-[10px] text-slate-600 mt-1">Digest: {error.digest}</p>}
                    </div>
                )}
            </div>
            <div className="flex gap-3">
                <Button
                    onClick={() => reset()}
                    className="bg-primary text-black hover:bg-primary/90 font-bold"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Thử lại
                </Button>
            </div>
        </div>
    )
}

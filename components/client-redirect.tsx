'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ClientRedirect({ url }: { url: string }) {
    const router = useRouter()

    useEffect(() => {
        router.replace(url)
    }, [url, router])

    return (
        <div className="flex h-full items-center justify-center p-8 text-slate-500">
            {/* Optional Loading Indication to prevent blank flash */}
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-primary"></div>
                <p className="text-sm">Đang chuyển hướng...</p>
            </div>
        </div>
    )
}

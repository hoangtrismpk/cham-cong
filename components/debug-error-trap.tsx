'use client'

import { useEffect } from 'react'

export function DebugErrorTrap() {
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            // Prevent default to STOP Next.js dev overlay from showing "Runtime Error: Timeout"
            event.preventDefault()

            // Use console.warn instead of console.error to avoid triggering
            // Next.js dev overlay's console.error interceptor (which causes error 2/2)
            console.warn('⚠️ [DebugErrorTrap] Suppressed unhandled rejection:', event.reason)
        }

        window.addEventListener('unhandledrejection', handler)

        return () => {
            window.removeEventListener('unhandledrejection', handler)
        }
    }, [])

    // This component is purely for error suppression, renders nothing
    return null
}

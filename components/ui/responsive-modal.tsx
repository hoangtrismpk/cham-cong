'use client'

import * as React from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'

/**
 * ResponsiveModal: Bottom Sheet on Mobile, centered Modal on Desktop.
 * - On screens < md (768px): renders as a Drawer (bottom sheet) from `vaul`.
 * - On screens >= md: renders as a traditional fixed centered modal.
 *
 * Uses JS matchMedia instead of CSS because vaul's Portal renders
 * outside the parent DOM, so CSS `md:hidden` has no effect on it.
 */

interface ResponsiveModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
    /** Additional className for the content container */
    className?: string
}

export function ResponsiveModal({ open, onOpenChange, children, className }: ResponsiveModalProps) {
    const [isMobile, setIsMobile] = React.useState(false)

    React.useEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)')
        const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
        handler(mql) // set initial value
        mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
        return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
    }, [])

    // Mobile: Bottom Sheet (Drawer)
    if (isMobile) {
        return (
            <Drawer.Root open={open} onOpenChange={onOpenChange}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
                    <Drawer.Content
                        className={cn(
                            'fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-[#161b22] border-t border-white/10 rounded-t-[2rem] max-h-[92vh] outline-none',
                            className
                        )}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        {/* Accessible title (visually hidden) */}
                        <Drawer.Title className="sr-only">Modal</Drawer.Title>
                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
                            {children}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        )
    }

    // Desktop: Centered Modal
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-md"
                onClick={() => onOpenChange(false)}
            />
            <div
                className={cn(
                    'bg-card w-full max-w-lg rounded-[2.5rem] border border-border shadow-2xl relative z-10 overflow-hidden neon-border animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar',
                    className
                )}
            >
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    )
}

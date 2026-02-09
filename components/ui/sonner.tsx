"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            richColors
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-white group-[.toaster]:border-slate-800 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-[.toaster]:p-5 group-[.toaster]:rounded-2xl group-[.toaster]:text-sm group-[.toaster]:font-medium group-[.toaster]:backdrop-blur-xl group-[.toaster]:border-l-4 data-[type=success]:group-[.toaster]:border-l-emerald-500 data-[type=error]:group-[.toaster]:border-l-red-500 data-[type=info]:group-[.toaster]:border-l-blue-500 data-[type=warning]:group-[.toaster]:border-l-amber-500",
                    description: "group-[.toast]:text-slate-400 group-[.toast]:text-xs group-[.toast]:mt-1",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }

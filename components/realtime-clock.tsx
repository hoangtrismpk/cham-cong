'use client'

import { useEffect, useState } from 'react'

export function RealtimeClock() {
    const [time, setTime] = useState<Date | null>(null)

    useEffect(() => {
        // Initial set to match client time immediately
        setTime(new Date())

        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    if (!time) return null // Hydration mismatch prevention

    // Formatting like design: 09:41 58 AM (Seconds specific)
    // Actually design has: HH:mm (big) ss (small) AM/PM
    const hours = time.getHours()
    const minutes = time.getMinutes()
    const seconds = time.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12

    const pad = (n: number) => n.toString().padStart(2, '0')

    return (
        <div className="flex items-baseline gap-4 font-mono">
            <span className="text-5xl md:text-7xl font-bold text-white neon-glow">
                {pad(displayHours)}:{pad(minutes)}
            </span>
            <span className="text-2xl md:text-3xl text-primary font-bold">
                {pad(seconds)}
            </span>
            <span className="text-xl md:text-2xl text-slate-500 font-medium">
                {ampm}
            </span>
        </div>
    )
}

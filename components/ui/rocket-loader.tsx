'use client'

import React from 'react'

export function RocketLoader({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
            <div className="loader-wrapper">
                <span className="loader"></span>
                <span className="loader-text">{text}</span>
            </div>
        </div>
    )
}

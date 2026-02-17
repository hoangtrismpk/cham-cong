'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { RocketLoader } from '@/components/ui/rocket-loader'

interface LoadingContextType {
    setIsLoading: (loading: boolean, text?: string) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoadingState] = useState(false)
    const [loadingText, setLoadingText] = useState('Đang xử lý...')

    const setIsLoading = (loading: boolean, text?: string) => {
        if (text) setLoadingText(text)
        setIsLoadingState(loading)
    }

    return (
        <LoadingContext.Provider value={{ setIsLoading }}>
            {children}
            {isLoading && <RocketLoader text={loadingText} />}
        </LoadingContext.Provider>
    )
}

export function useLoading() {
    const context = useContext(LoadingContext)
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider')
    }
    return context
}

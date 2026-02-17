'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSettings, getSettingsVersion } from '@/app/actions/settings'

interface UseSettingsSyncOptions {
    category?: string
    pollingInterval?: number // milliseconds, default 10000 (10 seconds)
    enabled?: boolean
}

interface UseSettingsSyncReturn {
    settings: Record<string, unknown>
    isOutdated: boolean
    loading: boolean
    error: Error | null
    reloadSettings: () => Promise<void>
    lastUpdated: Date | null
}

/**
 * Hook to sync settings with server
 * Polls for changes and notifies when settings are outdated
 */
export function useSettingsSync(options: UseSettingsSyncOptions = {}): UseSettingsSyncReturn {
    const {
        category,
        pollingInterval = 60000,
        enabled = true
    } = options

    const [settings, setSettings] = useState<Record<string, unknown>>({})
    const [isOutdated, setIsOutdated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const lastVersionRef = useRef<string | null>(null)
    const isMountedRef = useRef(true)

    // Load settings
    const loadSettings = useCallback(async () => {
        try {
            const data = await getSettings(category)
            if (isMountedRef.current) {
                setSettings(data)
                setLastUpdated(new Date())
                setIsOutdated(false)
                setError(null)

                // Get initial version
                const version = await getSettingsVersion()
                lastVersionRef.current = version
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err : new Error('Failed to load settings'))
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false)
            }
        }
    }, [category])

    // Check for updates
    const checkForUpdates = useCallback(async () => {
        if (!lastVersionRef.current) return

        try {
            const currentVersion = await getSettingsVersion()

            if (currentVersion !== lastVersionRef.current && isMountedRef.current) {
                setIsOutdated(true)
            }
        } catch (err) {
            console.warn('⚠️ [useSettingsSync] Error checking settings version:', err)
        }
    }, [])

    // Reload settings (called when user clicks "Update Now")
    const reloadSettings = useCallback(async () => {
        setLoading(true)
        await loadSettings()
    }, [loadSettings])

    // Initial load
    useEffect(() => {
        isMountedRef.current = true
        loadSettings()

        return () => {
            isMountedRef.current = false
        }
    }, [loadSettings])

    // Polling for updates
    useEffect(() => {
        if (!enabled || loading) return

        const intervalId = setInterval(() => {
            // console.log('🔄 Checking for settings update...')
            checkForUpdates().catch(() => { })
        }, pollingInterval)

        return () => {
            clearInterval(intervalId)
        }
    }, [enabled, loading, pollingInterval, checkForUpdates])

    return {
        settings,
        isOutdated,
        loading,
        error,
        reloadSettings,
        lastUpdated
    }
}

/**
 * Hook to get a specific setting value
 */
export function useSetting<T = unknown>(key: string, defaultValue?: T): {
    value: T | undefined
    loading: boolean
    error: Error | null
} {
    const { settings, loading, error } = useSettingsSync()

    const value = settings[key] as T | undefined

    return {
        value: value !== undefined ? value : defaultValue,
        loading,
        error
    }
}

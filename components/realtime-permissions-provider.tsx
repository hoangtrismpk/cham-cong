'use client'

import { useRealtimePermissions } from '@/hooks/use-realtime'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function RealtimePermissionsProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string>()

    useEffect(() => {
        async function getUser() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
            }
        }
        getUser()
    }, [])

    // Enable realtime permissions monitoring
    useRealtimePermissions(userId)

    return <>{children}</>
}

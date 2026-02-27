'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export function FCMManager() {
    const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "tablet";
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return "mobile";
        }
        return "desktop";
    };

    const saveTokenToDatabase = async (token: string) => {
        const supabase = createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Save token using RPC to handle handover scenario (multiple users, same device)
        const { error } = await supabase.rpc('register_fcm_token', {
            p_token: token,
            p_device_type: getDeviceType()
        });

        if (error) {
            console.error('[FCMManager] Error saving FCM token:', error.message);
            // Fallback: try direct upsert if RPC fails
            const { error: fallbackErr } = await supabase.from('fcm_tokens')
                .upsert({
                    user_id: user.id,
                    token: token,
                    device_type: getDeviceType(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'token' })

            if (fallbackErr) {
                console.error('[FCMManager] Fallback upsert also failed:', fallbackErr.message);
            } else {
                console.log('[FCMManager] FCM token saved via fallback for user:', user.id, '| device:', getDeviceType());
            }
        } else {
            console.log('[FCMManager] FCM token saved for user:', user.id, '| device:', getDeviceType());
        }
    };

    useEffect(() => {
        const setupFCM = async () => {
            try {
                // 0. Check if browser supports notifications
                if (!('Notification' in window)) {
                    console.log('[FCMManager] This browser does not support notifications');
                    return;
                }

                // 1. Check user's push notification preference in database
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('push_enabled')
                    .eq('id', user.id)
                    .single();

                // If user has explicitly disabled push notifications, skip setup
                if (profile && profile.push_enabled === false) {
                    console.log('[FCMManager] Push notifications disabled by user preference');
                    return;
                }

                // 2. Check/Request Permission
                let permission = Notification.permission;

                if (permission === 'denied') {
                    console.log('[FCMManager] Notification permission denied');
                    return;
                }

                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }

                if (permission !== 'granted') {
                    console.log('[FCMManager] Notification permission not granted');
                    return;
                }

                // 3. Dynamically import Firebase (avoid blocking main thread, especially on mobile)
                try {
                    const { messaging, VAPID_KEY, getToken, onMessage } = await import('@/utils/firebase')
                    const msg = await messaging();
                    if (!msg) {
                        console.log('[FCMManager] Firebase Messaging not supported');
                        return;
                    }

                    // Foreground listener (data-only messages)
                    onMessage(msg, (payload) => {
                        console.log('[FCMManager] Foreground message received:', payload);
                        // Read from data field (data-only payloads)
                        const data = payload.data || {};
                        const title = data.title || payload.notification?.title || 'Thông báo';
                        const body = data.body || payload.notification?.body || '';
                        const url = data.url || '/';

                        toast(title, {
                            description: body,
                            duration: 8000,
                            action: url && url !== '/' ? {
                                label: 'Xem',
                                onClick: () => window.location.href = url
                            } : undefined
                        });
                    });

                    const currentToken = await getToken(msg, { vapidKey: VAPID_KEY });

                    if (currentToken) {
                        console.log('[FCMManager] FCM Token obtained, device:', getDeviceType());
                        await saveTokenToDatabase(currentToken);
                    } else {
                        console.log('[FCMManager] No FCM token available');
                    }
                } catch (err) {
                    console.warn('[FCMManager] Firebase init error:', err);
                }
            } catch (err) {
                console.warn('[FCMManager] Setup failed:', err);
            }
        };

        // Delay setup slightly to not block initial page render
        const timer = setTimeout(setupFCM, 2000);
        return () => clearTimeout(timer);
    }, []);

    return null; // This component renders nothing
}

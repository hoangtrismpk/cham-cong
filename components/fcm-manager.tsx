'use client'

import { useEffect } from 'react'
import { messaging, VAPID_KEY, getToken, onMessage } from '@/utils/firebase'
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
            console.error('Error saving FCM token:', error.message, error.details, error.hint);
            toast.error(`Lỗi lưu Token: ${error.message}`);
        } else {
            console.log('FCM token saved successfully for user:', user.id);
        }
    };

    useEffect(() => {
        const setupFCM = async () => {
            try {
                // 0. Check if browser supports notifications
                if (!('Notification' in window)) {
                    console.log('This browser does not support desktop notification');
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
                    console.log('Notification permission denied');
                    return;
                }

                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }

                if (permission !== 'granted') {
                    console.log('Notification permission not granted after request');
                    return;
                }

                // 3. Get Token & Listen
                try {
                    const msg = await messaging();
                    if (!msg) {
                        console.log('Firebase Messaging not supported');
                        return;
                    }

                    // Foreground listener
                    onMessage(msg, (payload) => {
                        console.log('Foreground message received:', payload);
                        toast(payload.notification?.title || 'Thông báo', {
                            description: payload.notification?.body,
                            duration: 5000,
                        });
                    });

                    const currentToken = await getToken(msg, { vapidKey: VAPID_KEY });

                    if (currentToken) {
                        console.log('FCM Token:', currentToken);
                        await saveTokenToDatabase(currentToken);
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                } catch (err) {
                    console.log('An error occurred while retrieving token. ', err);
                }
            } catch (err) {
                console.warn('⚠️ [FCMManager] Setup failed:', err);
            }
        };

        setupFCM();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null; // This component renders nothing
}


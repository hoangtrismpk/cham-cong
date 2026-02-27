import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}
declare const self: ServiceWorkerGlobalScope;

// ========== Firebase Push Notification Logic ==========
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Must match client config
// @ts-ignore
const firebaseConfig = {
    apiKey: "AIzaSyDsCndrOZUcpRaDTuNfut6rVU_uuzCHqN0",
    authDomain: "cham-cong-62e5a.firebaseapp.com",
    projectId: "cham-cong-62e5a",
    storageBucket: "cham-cong-62e5a.firebasestorage.app",
    messagingSenderId: "19738197573",
    appId: "1:19738197573:web:ec2abdb829cbd2be7d2d2c"
};

// @ts-ignore
firebase.initializeApp(firebaseConfig);
// @ts-ignore
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload: any) => {
    console.log('[serwist-sw] Received background message ', payload);

    const data = payload.data || {};
    const notificationTitle = data.title || 'Thông báo mới';
    const notificationOptions = {
        body: data.body || 'Bạn có thông báo mới!',
        icon: '/iconapp.png',
        badge: '/iconapp.png',
        data: {
            url: data.url || '/',
            campaignId: data.campaignId || '',
            shiftId: data.shiftId || '',
            type: data.type || 'general'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click 
self.addEventListener('notificationclick', (event: any) => {
    console.log('[serwist-sw] Notification clicked', event);
    event.notification.close();

    const notificationData = event.notification.data || {};
    let urlToOpen = notificationData.url || '/';

    try {
        urlToOpen = new URL(urlToOpen, self.location.origin).href;
    } catch (e) {
        urlToOpen = self.location.origin;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients: any[]) => {
            // Track Click async
            try {
                fetch('/api/tracking/notification-click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shiftId: notificationData.shiftId,
                        campaignId: notificationData.campaignId,
                        type: notificationData.type || 'server_push'
                    })
                }).catch(() => { });
            } catch (e) { }

            for (const client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'navigate' in client) {
                    return client.navigate(urlToOpen).then((c: any) => c ? c.focus() : null);
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
// ====================================================

// ========== Serwist Caching Logic ==========
const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();

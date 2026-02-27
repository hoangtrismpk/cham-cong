importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDsCndrOZUcpRaDTuNfut6rVU_uuzCHqN0",
    authDomain: "cham-cong-62e5a.firebaseapp.com",
    projectId: "cham-cong-62e5a",
    storageBucket: "cham-cong-62e5a.firebasestorage.app",
    messagingSenderId: "19738197573",
    appId: "1:19738197573:web:ec2abdb829cbd2be7d2d2c"
});

const messaging = firebase.messaging();

// Handle background messages (all messages are data-only now)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Always show notification manually from data payload
    const data = payload.data || {};
    const notificationTitle = data.title || 'Thông báo mới';
    const notificationOptions = {
        body: data.body || 'Bạn có thông báo mới!',
        icon: '/iconapp.png',
        badge: '/iconapp.png',
        // IMPORTANT: Store url in data so notificationclick handler can read it
        data: {
            url: data.url || '/',
            campaignId: data.campaignId || '',
            shiftId: data.shiftId || '',
            type: data.type || 'general'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click - opens the link from data.url
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked', event);
    event.notification.close();

    // Get URL payload from data
    const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        Promise.all([
            // 1. Open Window logic
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                const targetUrl = new URL(urlToOpen, self.location.origin).href;

                // Check if there is already a window/tab open with the target URL
                for (let i = 0; i < windowClients.length; i++) {
                    let client = windowClients[i];
                    if (client.url === targetUrl && 'focus' in client) {
                        return client.focus();
                    }
                    // Or at least focus and navigate the existing window
                    if (client.url.includes(self.location.origin) && 'navigate' in client) {
                        return client.navigate(targetUrl).then(c => c ? c.focus() : null);
                    }
                }
                // If no window is found, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            }),

            // 2. Track Click
            fetch('/api/tracking/notification-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shiftId: event.notification.data?.shiftId,
                    campaignId: event.notification.data?.campaignId,
                    type: event.notification.data?.type || 'server_push'
                })
            }).catch(e => console.error('Tracking error:', e))
        ])
    );
});

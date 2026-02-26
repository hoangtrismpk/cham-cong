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

// Handle background messages
// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // If the payload already has 'notification', Firebase's internal SDK will automatically show it.
    // We only need to manually show it if it's a data-only message.
    if (!payload.notification) {
        const notificationTitle = `[FHB] ${payload.data?.title || 'Nhắc nhở Chấm công'}`;
        const notificationOptions = {
            body: payload.data?.body || 'Bạn có thông báo mới!',
            icon: '/iconapp.png',
            badge: '/iconapp.png',
            data: payload.data || { url: '/' }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

// Also handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();
    event.waitUntil(
        Promise.all([
            // 1. Open Window logic
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                for (let i = 0; i < windowClients.length; i++) {
                    let client = windowClients[i];
                    if (client.url.includes('/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow((event.notification.data && event.notification.data.url) || '/');
                }
            }),

            // 2. Track Click
            fetch('/api/tracking/notification-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shiftId: event.notification.data?.shiftId,
                    campaignId: event.notification.data?.campaignId,
                    type: 'server_push'
                })
            }).catch(e => console.error('Tracking error:', e))
        ])
    );
});

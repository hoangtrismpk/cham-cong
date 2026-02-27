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
    console.log('[firebase-messaging-sw.js] Notification clicked', event);
    event.notification.close();

    // Get URL payload from data or custom data field
    const notificationData = event.notification.data || {};
    let urlToOpen = notificationData.url || '/';

    // Ensure URL is absolute
    try {
        urlToOpen = new URL(urlToOpen, self.location.origin).href;
    } catch (e) {
        urlToOpen = self.location.origin;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
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
            } catch (e) {
                // Ignore tracking errors
            }

            // 1. Try to find exact URL window to focus
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // 2. Try to find ANY window on our origin to navigate
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'navigate' in client) {
                    return client.navigate(urlToOpen).then(c => c ? c.focus() : null);
                }
            }

            // 3. Fallback: open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

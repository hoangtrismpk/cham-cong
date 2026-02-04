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
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received check-in background message ', payload);
    const notificationTitle = payload.notification?.title || 'Nhắc nhở Chấm công';
    const notificationOptions = {
        body: payload.notification?.body || 'Đã đến giờ chấm công rồi!',
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
            url: '/' // Open the app when clicked
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Also handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab and ensure it's focused
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

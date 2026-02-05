// Simple Service Worker for PWA and Notifications
self.addEventListener('install', (event) => {
    console.log('SW installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('SW activated');
});

self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'Nhắc nhở Chấm công';
    const options = {
        body: data.body || 'Bạn sắp đến giờ vào ca rồi, đừng quên chấm công nhé!',
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
            url: '/'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        Promise.all([
            // 1. Open the app
            clients.openWindow(event.notification.data.url || '/'),

            // 2. Track the click
            fetch('/api/tracking/notification-click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    shiftId: event.notification.data.shiftId,
                    type: event.notification.data.type
                })
            }).catch(err => console.error('Tracking failed:', err))
        ])
    );
});

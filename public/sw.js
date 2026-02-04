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
        clients.openWindow(event.notification.data.url)
    );
});

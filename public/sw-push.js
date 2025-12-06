// sw-push.js - Custom Service Worker for Push Notifications
// This will be merged with the Workbox-generated service worker

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let data = {
    title: 'TecnoSports',
    body: 'Tienes una nueva notificación',
    icon: '/favicon2.png',
    badge: '/favicon.png',
    data: {}
  };

  if (event.data) {
    try {
      const jsonData = event.data.json();
      data = { ...data, ...jsonData };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon2.png',
    badge: data.badge || '/favicon.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Ver',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/favicon.png'
      }
    ],
    requireInteraction: true,
    tag: 'tecnosports-notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or focus if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle background sync if needed
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event received:', event.tag);
});

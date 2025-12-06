// service-worker.js

// Escuchador de instalación simple
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker.');
    self.skipWaiting();
});

// 1. Manejo del evento PUSH (con el try/catch que previene fallos de JSON)
self.addEventListener('push', function(event) {
    let data = { 
        title: 'Alerta de Partidos', 
        body: 'Notificación recibida, verificando contenido.', 
        url: '/' 
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[SW] ERROR: Fallo al parsear el JSON del servidor.', e);
        }
    }

    const title = data.title || 'Alerta';
    const options = {
        body: data.body,
        icon: data.icon || '/assets/icon/icon-192.png', // CRÍTICO: debe ser la ruta correcta
        data: {
            url: data.url || '/' 
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
        .catch(error => {
            console.error('[SW] ERROR: Fallo al mostrar la notificación.', error);
        })
    );
});

// 2. Manejo del click en la notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const clickData = event.notification.data;

    event.waitUntil(
        clients.openWindow(clickData.url || '/')
    );
});
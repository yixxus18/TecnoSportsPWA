self.addEventListener('push', function(event) {
  let data = { title: 'Notificación', body: 'Recibiste un mensaje.' };

  if (event.data) {
    // Si hay datos en el payload, los usamos.
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/icon/icon-192.png', // Usa un icono de tu PWA
    data: {
      url: data.url || '/', // URL de destino al hacer clic
    }
  };

  // Muestra la notificación al usuario
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Escuchador opcional para manejar el clic en la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const clickData = event.notification.data;

  // Abre la ventana de la PWA y navega a la URL especificada
  event.waitUntil(
    clients.openWindow(clickData.url || '/')
  );
});
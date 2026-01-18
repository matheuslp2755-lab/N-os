importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

self.addEventListener('notificationclick', function(event) {
  const notificationData = event.notification.data;
  event.notification.close();

  // Se a notificação tiver um ID de conversa, tentamos abrir nela
  let targetUrl = '/';
  if (notificationData && notificationData.conversationId) {
    targetUrl = `/?chat=${notificationData.conversationId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
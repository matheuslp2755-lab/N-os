importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyBscsAkO_yJYfVVtCBh3rNF8Cm51_HLW54",
    authDomain: "teste-rede-fcb99.firebaseapp.com",
    projectId: "teste-rede-fcb99",
    storageBucket: "teste-rede-fcb99.firebasestorage.app",
    messagingSenderId: "1006477304115",
    appId: "1:1006477304115:web:79deabb2a1e97951df5e46"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Trata mensagens quando o app está em segundo plano/fechado
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background: ', payload);
  
  const notificationTitle = payload.data?.title || payload.notification?.title || 'Nova mensagem no Néos';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'Você recebeu uma nova interação.',
    icon: 'https://firebasestorage.googleapis.com/v0/b/teste-rede-fcb99.appspot.com/o/assets%2Ficon-192.png?alt=media',
    badge: 'https://firebasestorage.googleapis.com/v0/b/teste-rede-fcb99.appspot.com/o/assets%2Ficon-192.png?alt=media',
    data: {
        url: '/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
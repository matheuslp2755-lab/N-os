import React, { useState, useEffect, StrictMode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, doc, updateDoc, serverTimestamp } from './firebase';
import Login from './components/Login';
import SignUp from './context/SignUp';
import Feed from './components/Feed';
import { LanguageProvider } from './context/LanguageContext';
import { CallProvider } from './context/CallContext';
import CallUI from './components/call/CallUI';

declare global {
  interface Window {
    OneSignal: any;
  }
}

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');

  // INTEGRAÇÃO ONESIGNAL (PUSH NOTIFICATIONS) - VERSÃO REFORÇADA
  useEffect(() => {
    if (!user) return;

    const setupPush = async () => {
      try {
        const OneSignal = window.OneSignal || [];
        
        // Inicializa com as configurações de permissão automática
        await OneSignal.init({
          appId: "c7219360-ec10-4c6e-a599-0255216ec17e",
          safari_web_id: "web.onesignal.auto.10444390-e374-4b53-9363-239108f97116",
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        // Tenta exibir o prompt de permissão nativo imediatamente após o login
        const permission = await OneSignal.Notifications.permission;
        if (permission !== 'granted') {
          console.log("Néos Push: Solicitando permissão...");
          await OneSignal.Notifications.requestPermission();
        }

        // Captura o ID do usuário (Subscription ID)
        const pushUser = await OneSignal.User;
        const pushId = pushUser?.pushSubscription?.id;
        
        if (pushId) {
          console.log("Néos Push: Dispositivo registrado com ID:", pushId);
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            oneSignalPlayerId: pushId,
            pushEnabled: true,
            lastPushSync: serverTimestamp()
          });
        }

        // Listener para mudanças na inscrição (caso o ID mude)
        OneSignal.Notifications.addEventListener("permissionChange", async (permission: string) => {
          console.log("Néos Push: Permissão alterada para:", permission);
          if (permission === "granted") {
            const newId = OneSignal.User?.pushSubscription?.id;
            if (newId) {
              await updateDoc(doc(db, 'users', user.uid), { oneSignalPlayerId: newId });
            }
          }
        });

      } catch (err) {
        console.error("Néos Push: Falha na configuração:", err);
      }
    };

    setupPush();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {authPage === 'login' ? (
        <Login onSwitchMode={() => setAuthPage('signup')} />
      ) : (
        <SignUp onSwitchMode={() => setAuthPage('login')} />
      )}
    </div>
  );

  return <Feed />;
};

const App: React.FC = () => (
  <StrictMode>
    <LanguageProvider>
      <CallProvider>
        <AppContent />
        <CallUI />
      </CallProvider>
    </LanguageProvider>
  </StrictMode>
);

export default App;
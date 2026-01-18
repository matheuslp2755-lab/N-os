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

  // INICIALIZAÇÃO SILENCIOSA DO ONESIGNAL
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        const OneSignal = window.OneSignal || [];
        await OneSignal.init({
          appId: "c7219360-ec10-4c6e-a599-0255216ec17e",
          safari_web_id: "web.onesignal.auto.10444390-e374-4b53-9363-239108f97116",
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });

        // Tenta sincronizar o ID se já houver permissão
        if (user) {
          const pushUser = await OneSignal.User;
          const pushId = pushUser?.pushSubscription?.id;
          if (pushId) {
            await updateDoc(doc(db, 'users', user.uid), {
              oneSignalPlayerId: pushId,
              pushEnabled: true
            });
          }
        }
      } catch (err) {
        console.warn("OneSignal Init Error:", err);
      }
    };

    initOneSignal();
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
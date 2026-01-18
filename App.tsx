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
    OneSignalDeferred: any[];
  }
}

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (!user) return;

    const syncOneSignal = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          // 1. VINCULAÇÃO CRÍTICA: Diz ao OneSignal que este navegador pertence ao UID do Firebase
          // Isso permite que o backend envie notificações usando apenas o UID
          console.log("Néos Push: Vinculando External ID...", user.uid);
          await OneSignal.login(user.uid);
          
          // 2. GARANTIA DE INSCRIÇÃO (v16): Se houver permissão, força o estado de Subscribed
          if (Notification.permission === 'granted') {
            await OneSignal.User.PushSubscription.optIn();
            console.log("Néos Push: Opt-in realizado com sucesso.");
          }

          // 3. SALVAMENTO DE SEGURANÇA: Registra no banco que este usuário pode receber push
          const pushId = OneSignal.User.PushSubscription.id;
          if (pushId) {
            await updateDoc(doc(db, 'users', user.uid), {
              oneSignalPlayerId: pushId,
              pushEnabled: true,
              lastPushSync: serverTimestamp()
            });
            console.log("Néos Push: Subscription ID sincronizado:", pushId);
          }
        } catch (err) {
          console.error("Néos Push Error:", err);
        }
      });
    };

    // Executa a sincronização logo após o login e garante retry
    const timer = setTimeout(syncOneSignal, 1000);
    const retryTimer = setTimeout(syncOneSignal, 5000);
    return () => {
        clearTimeout(timer);
        clearTimeout(retryTimer);
    };
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
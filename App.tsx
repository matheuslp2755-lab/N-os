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

    // Sincronização Robusta com OneSignal
    const syncOneSignal = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("Néos Push: Iniciando vinculação para o usuário:", user.uid);
          
          // 1. Define o External ID (Link fundamental entre Firebase e OneSignal)
          await OneSignal.login(user.uid);
          
          // 2. Força o Opt-In se a permissão já foi concedida no navegador
          if (Notification.permission === 'granted') {
            await OneSignal.User.PushSubscription.optIn();
          }

          // 3. Loop de verificação: O SDK do OneSignal às vezes demora para gerar o ID de assinatura
          let attempts = 0;
          const verifySubscription = async () => {
            const subscriptionId = OneSignal.User.PushSubscription.id;
            const isOptedIn = OneSignal.User.PushSubscription.optedIn;

            if (subscriptionId && isOptedIn) {
              console.log("Néos Push: Dispositivo vinculado com sucesso. Subscription ID:", subscriptionId);
              
              // Atualiza o Firestore com o ID real para backup e monitoramento
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                oneSignalPlayerId: subscriptionId,
                pushEnabled: true,
                lastPushSync: serverTimestamp()
              });
            } else if (attempts < 8) {
              attempts++;
              console.log(`Néos Push: Aguardando registro do dispositivo... tentativa ${attempts}`);
              setTimeout(verifySubscription, 2000);
            }
          };

          verifySubscription();

        } catch (err) {
          console.error("Néos OneSignal Auth Error:", err);
        }
      });
    };

    // Pequeno delay para garantir que o Firebase Auth esteja estável
    const timer = setTimeout(syncOneSignal, 2000);
    return () => clearTimeout(timer);
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
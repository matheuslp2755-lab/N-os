import React, { useState, useEffect, StrictMode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, doc, updateDoc, serverTimestamp, getDoc } from './firebase';
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
          // Garante que o usuário está "Logado" no OneSignal com o ID do Firebase
          await OneSignal.login(user.uid);
          console.log("Néos OneSignal: User Login executado para", user.uid);
          
          // Força a verificação de inscrição
          const pushUser = await OneSignal.User;
          const pushId = pushUser?.pushSubscription?.id;
          
          if (pushId) {
            console.log("Néos OneSignal: ID de Inscrição Ativo:", pushId);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              oneSignalPlayerId: pushId,
              pushEnabled: true,
              lastPushSync: serverTimestamp()
            });
          } else {
            console.log("Néos OneSignal: Usuário ainda não possui Subscription ID. Solicitando permissão...");
            await OneSignal.Notifications.requestPermission();
          }
        } catch (err) {
          console.error("Néos OneSignal: Erro de sincronização", err);
        }
      });
    };

    // Pequeno delay para garantir que o documento do usuário exista
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
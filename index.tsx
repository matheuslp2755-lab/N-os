import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Néos: Iniciando aplicação...");

// REGISTRO DO SERVICE WORKER (FCM/PWA)
// Para evitar erros de origin em sandboxes, construímos a URL baseada na origem atual do navegador.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Construímos a URL completa para garantir que o navegador saiba que é a mesma origem
    const swUrl = `${window.location.origin}/sw.js`;
    
    console.log('Néos: Tentando registrar SW em:', swUrl);

    navigator.serviceWorker.register(swUrl)
      .then(reg => {
        console.log('Néos: Service Worker ativo no escopo:', reg.scope);
      })
      .catch(err => {
        // Se a URL absoluta falhar (comum em subdiretórios de sandbox), tentamos o caminho relativo puro
        console.warn('Néos: Falha na URL absoluta, tentando relativo...', err.message);
        
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('Néos: SW registrado via caminho relativo:', reg.scope))
          .catch(e => {
            // Se falhar totalmente, provavelmente é uma restrição de segurança do ambiente de preview
            console.debug('Néos: O registro do Service Worker foi ignorado devido às restrições do ambiente de preview (CORS/Secure Context). Isso é normal em alguns sandboxes.');
          });
      });
  });
}

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log("Néos: Renderização enviada.");
  } catch (error) {
    console.error("ERRO CRÍTICO NO BOOT:", error);
    container.innerHTML = `
      <div style="padding:40px; text-align:center; color:white; font-family:sans-serif; background:#000; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <h1 style="color:#0ea5e9; margin-bottom:10px;">Ops! Néos encontrou um erro.</h1>
        <p style="opacity:0.7;">Ocorreu um erro inesperado ao carregar a interface.</p>
        <button onclick="window.location.reload()" style="background:#0ea5e9; color:white; border:none; padding:12px 24px; border-radius:12px; cursor:pointer; margin-top:20px; font-weight:bold;">
          Recarregar Néos
        </button>
      </div>
    `;
  }
}

// Silenciador de erros de ResizeObserver comuns em layouts complexos
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
  }
});
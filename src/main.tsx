import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Offline support. Registered only in a production build: in dev it would sit
// in front of Vite's module graph and serve stale modules through HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // An unavailable worker (private window, blocked storage, insecure
      // origin) costs offline use only; the app itself still runs.
    });
  });
}

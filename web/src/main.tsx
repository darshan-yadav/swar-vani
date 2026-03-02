// Polyfills MUST run before any Cognito import
import { Buffer } from 'buffer';
(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = (window as any).process || { env: {} };

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import LoginPage from './LoginPage'
import DemoMode from './DemoMode'
import { getCurrentSession, logout } from './auth'
import './index.css'

function Root() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // Check if demo mode is requested via URL param
  const isDemo = new URLSearchParams(window.location.search).has('demo');

  useEffect(() => {
    if (isDemo) {
      // Skip auth check in demo mode
      setAuthenticated(false);
      return;
    }
    getCurrentSession().then(session => {
      setAuthenticated(!!session);
    });
  }, [isDemo]);

  // Demo mode — bypass auth entirely
  if (isDemo) {
    return <DemoMode />;
  }

  // Loading state
  if (authenticated === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#FF9933',
        fontSize: '1.5rem'
      }}>
        🗣️ Loading Swar-Vani...
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <>
      <App />
      <button
        onClick={() => { logout(); setAuthenticated(false); }}
        style={{
          position: 'fixed',
          top: '0.5rem',
          right: '0.5rem',
          background: 'rgba(255,255,255,0.1)',
          color: '#888',
          border: '1px solid #333',
          borderRadius: '6px',
          padding: '0.3rem 0.8rem',
          cursor: 'pointer',
          fontSize: '0.8rem',
          zIndex: 1000,
        }}
      >
        Logout
      </button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)

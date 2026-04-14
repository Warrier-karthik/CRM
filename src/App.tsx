import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Contacts from './pages/Contacts';
import Broadcast from './pages/Broadcast';
import Groups from './pages/Groups';
import Templates from './pages/Templates';
import Automation from './pages/Automation';
import { api, hasToken } from './lib/api';
import { Bot, X, Eye, EyeOff } from 'lucide-react';

type Page = 'dashboard' | 'conversations' | 'contacts' | 'groups' | 'broadcast' | 'automation' | 'templates';

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.login(email.trim(), password.trim());
      onLogin();
    } catch (e: any) {
      setError(e.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f6f8fa',
    }}>
      <div style={{
        width: 400, background: '#ffffff',
        border: '1px solid #e5e7eb', borderRadius: 16,
        padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Bot size={24} color="#fff" />
        </div>

        <h2 style={{ margin: '0 0 4px', fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Welcome back
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#6b7280' }}>
          Sign in to your WhatsApp CRM dashboard
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={show ? 'text' : 'password'}
                placeholder="Enter your password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: 40 }}
              />
              <button
                onClick={() => setShow(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#ef4444' }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: '#ffffff', border: '1px solid #e5e7eb',
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      fontSize: 13, color: '#111827',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, marginLeft: 4 }}><X size={14} /></button>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => hasToken());
  const [page, setPage] = useState<Page>('dashboard');
  const [chatPhone, setChatPhone] = useState<string | undefined>();
  const [toast, setToast] = useState('');

  // Listen for 401s from anywhere in the app
  useEffect(() => {
    const handler = () => {
      // Only act on auth:expired if we're actually logged in
      // Prevents race conditions after logout or during login
      setLoggedIn(prev => {
        if (prev) {
          setTimeout(() => setToast('Session expired. Please log in again.'), 0);
          return false;
        }
        return prev;
      });
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  async function handleLogout() {
    try { await api.logout(); } catch {}
    setLoggedIn(false);
  }

  function openChat(phone: string) {
    setChatPhone(phone);
    setPage('conversations');
  }

  function navigate(p: string) {
    setPage(p as Page);
    if (p !== 'conversations') setChatPhone(undefined);
  }

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={() => setLoggedIn(true)} />
        {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f6f8fa' }}>
      <Sidebar active={page} onNavigate={navigate} onLogout={handleLogout} />

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          height: 50, borderBottom: '1px solid #e5e7eb', background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px', flexShrink: 0, gap: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Connected</span>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: page === 'conversations' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'conversations' && <Conversations initialPhone={chatPhone} />}
          {page === 'contacts' && <Contacts onOpenChat={openChat} />}
          {page === 'groups' && <Groups onOpenChat={openChat} />}
          {page === 'broadcast' && <Broadcast />}
          {page === 'automation' && <Automation />}
          {page === 'templates' && <Templates />}
        </div>
      </main>

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
}

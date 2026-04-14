import { useState } from 'react';
import {
  LayoutDashboard, MessageSquare, Users, Radio,
  Layers, FileText, ChevronLeft, ChevronRight, Bot, Zap
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'groups', label: 'Groups', icon: Layers },
  { id: 'broadcast', label: 'Broadcast', icon: Radio },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'templates', label: 'Templates', icon: FileText },
];

interface Props {
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ active, onNavigate, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 60 : 220,
      minWidth: collapsed ? 60 : 220,
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '18px 0' : '18px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Bot size={18} color="#fff" />
        </div>
        {!collapsed && (
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
            WA CRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`sidebar-link ${active === id ? 'active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '9px' : undefined }}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Logout */}
      {!collapsed && (
        <div style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'transparent', border: '1px solid #e5e7eb',
              borderRadius: 8, color: '#6b7280', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#fecaca'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          margin: '8px',
          padding: '8px',
          background: 'transparent',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#6b7280',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  );
}

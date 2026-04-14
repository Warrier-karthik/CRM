import { useEffect, useState } from 'react';
import { Users, MessageSquare, Bot, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  total_users: number;
  total_messages: number;
  temp_counts: { hot: number; warm: number; cold: number };
  type_counts: { user: number; bot: number; agent: number };
  daily_volume: { date: string; count: number }[];
  last_updated: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const activities = [
    { label: 'Bot messages sent', value: stats?.type_counts.bot ?? 0, color: '#3b82f6' },
    { label: 'User messages', value: stats?.type_counts.user ?? 0, color: '#10b981' },
    { label: 'Agent takeovers', value: stats?.type_counts.agent ?? 0, color: '#f59e0b' },
  ];

  const tempData = [
    { label: 'Hot leads', value: stats?.temp_counts.hot ?? 0, color: '#ef4444', cls: 'badge-hot' },
    { label: 'Warm leads', value: stats?.temp_counts.warm ?? 0, color: '#f59e0b', cls: 'badge-warm' },
    { label: 'Cold leads', value: stats?.temp_counts.cold ?? 0, color: '#3b82f6', cls: 'badge-cold' },
  ];

  return (
    <div style={{ padding: '28px', maxWidth: 1100 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of your WhatsApp CRM activity</p>
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#f8514915', border: '1px solid #f8514930', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f85149', marginBottom: 20 }}>
          {error} — Check your API token in settings.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Contacts</p>
              <p style={{ fontSize: 32, fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#111827', margin: 0 }}>
                {loading ? '—' : (stats?.total_users ?? 0).toLocaleString()}
              </p>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#10b981" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Messages</p>
              <p style={{ fontSize: 32, fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#111827', margin: 0 }}>
                {loading ? '—' : (stats?.total_messages ?? 0).toLocaleString()}
              </p>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} color="#3b82f6" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Bot Activity</p>
              <p style={{ fontSize: 32, fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#111827', margin: 0 }}>
                {loading ? '—' : (stats?.type_counts.bot ?? 0).toLocaleString()}
              </p>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#a78bfa18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="#a78bfa" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={15} color="#10b981" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Message Volume</span>
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.daily_volume ?? []}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#111827' }}
                cursor={{ stroke: '#e5e7eb' }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead temperature */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Lead Temperature</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tempData.map(t => {
              const total = (stats?.total_users ?? 1) || 1;
              const pct = Math.round((t.value / total) * 100);
              return (
                <div key={t.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{t.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.color }}>{t.value}</span>
                  </div>
                  <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3 }}>
                    <div style={{ height: 5, width: `${pct}%`, background: t.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Recent Activity</p>
        {activities.map(a => (
          <div key={a.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
              <span style={{ fontSize: 13, color: '#111827' }}>{a.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: a.color, fontFamily: 'Outfit, sans-serif' }}>{a.value.toLocaleString()}</span>
          </div>
        ))}
        {stats?.last_updated && (
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '12px 0 0', textAlign: 'right' }}>
            Updated {new Date(stats.last_updated).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

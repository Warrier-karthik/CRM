import { useEffect, useState } from 'react';
import { Plus, Search, MessageSquare, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';

interface Contact {
  phone: string;
  name: string;
  status: string;
  temperature: string;
  created_at: string;
  last_active: string;
}

interface Props {
  onOpenChat: (phone: string) => void;
}

export default function Contacts({ onOpenChat }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [filterTemp, setFilterTemp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterTemp) params.temperature = filterTemp;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getUsers(params);
      setContacts(data.users || data || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterTemp, filterStatus]);

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  async function addContact() {
    if (!form.phone || !form.name) return;
    setSaving(true);
    try {
      await api.createContact({ phone: form.phone, name: form.name });
      setShowAdd(false);
      setForm({ phone: '', name: '' });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(phone: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.deleteContact(phone);
      setContacts(prev => prev.filter(c => c.phone !== phone));
    } catch (e: any) {
      alert(e.message);
    }
  }

  function fmt(d: string) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  return (
    <div style={{ padding: '28px', maxWidth: 1100 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-sub">{contacts.length} total contacts in your CRM</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Contact
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 32 }}
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select-field" style={{ width: 140 }} value={filterTemp} onChange={e => setFilterTemp(e.target.value)}>
          <option value="">All temperatures</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
        <select className="select-field" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ongoing">Ongoing</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-header" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr' }}>
          <span className="table-head">Name</span>
          <span className="table-head">Phone</span>
          <span className="table-head">Status</span>
          <span className="table-head">Temperature</span>
          <span className="table-head">Last Active</span>
          <span className="table-head">Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No contacts found</div>
        ) : (
          filtered.map(c => (
            <div key={c.phone} className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {c.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="table-cell" style={{ fontWeight: 500 }}>{c.name || '—'}</span>
              </div>
              <span className="table-cell" style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{c.phone}</span>
              <span>
                <span className={`badge ${c.status === 'converted' ? 'badge-converted' : 'badge-ongoing'}`}>
                  {c.status || 'ongoing'}
                </span>
              </span>
              <span>
                <span className={`badge badge-${c.temperature || 'warm'}`}>
                  {c.temperature || 'warm'}
                </span>
              </span>
              <span className="table-cell" style={{ color: '#6b7280', fontSize: 12 }}>{fmt(c.last_active)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onOpenChat(c.phone)}
                  style={{
                    padding: '5px 10px', background: '#10b98115', border: '1px solid #10b98130',
                    borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <MessageSquare size={12} /> Chat
                </button>
                <button className="btn-danger" style={{ padding: '5px 10px' }} onClick={() => deleteContact(c.phone, c.name)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 600, color: '#111827' }}>Add Contact</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Full Name</label>
                <input className="input-field" placeholder="John Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input-field" placeholder="919876543210 (with country code)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                Default: status = ongoing, temperature = warm
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary" onClick={addContact} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

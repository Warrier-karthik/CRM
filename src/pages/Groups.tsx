import { useEffect, useState, useRef } from 'react';
import { Plus, ChevronLeft, MessageSquare, Trash2, X, Upload, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface Segment { id: string; name: string; description?: string; }
interface Contact { phone: string; name: string; last_active?: string; }

interface Props { onOpenChat: (phone: string) => void; }

export default function Groups({ onOpenChat }: Props) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Segment | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [importing, setImporting] = useState(false);
  const [removingPhone, setRemovingPhone] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSegments(); }, []);

  async function loadSegments() {
    setLoading(true);
    try {
      const data = await api.getSegments();
      setSegments(Array.isArray(data) ? data : []);
    } catch { setSegments([]); }
    finally { setLoading(false); }
  }

  async function openGroup(seg: Segment) {
    setSelected(seg);
    setLoadingContacts(true);
    try {
      const data = await api.getSegmentContacts(seg.id);
      setContacts(Array.isArray(data) ? data : []);
    } catch { setContacts([]); }
    finally { setLoadingContacts(false); }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    try {
      await api.createSegment({ name: newGroupName.trim(), description: newGroupDesc.trim() });
      setShowNewGroup(false);
      setNewGroupName(''); setNewGroupDesc('');
      loadSegments();
    } catch (e: any) { alert(e.message); }
    finally { setSavingGroup(false); }
  }

  async function deleteGroup(seg: Segment) {
    if (!confirm(`Delete group "${seg.name}"?`)) return;
    try {
      await api.deleteSegment(seg.id);
      setSegments(p => p.filter(s => s.id !== seg.id));
      if (selected?.id === seg.id) setSelected(null);
    } catch (e: any) { alert(e.message); }
  }

  async function addContact() {
    if (!addPhone.trim() || !selected) return;
    setAddingContact(true);
    try {
      // Try to create contact first (will succeed or already exists)
      if (addName.trim()) {
        await api.createContact({ phone: addPhone.trim(), name: addName.trim() }).catch(() => {});
      }
      await api.addToSegment(selected.id, [addPhone.trim()]);
      setShowAddContact(false);
      setAddPhone(''); setAddName('');
      openGroup(selected);
    } catch (e: any) { alert(e.message); }
    finally { setAddingContact(false); }
  }

  async function removeContact(phone: string) {
    if (!selected) return;
    setRemovingPhone(phone);
    try {
      await api.removeFromSegment(selected.id, phone);
      setContacts(p => p.filter(c => c.phone !== phone));
    } catch (e: any) { alert(e.message); }
    finally { setRemovingPhone(''); }
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const phones: string[] = [];
      for (const line of lines) {
        const parts = line.split(',');
        const phone = parts[0]?.trim().replace(/\D/g, '');
        const name = parts[1]?.trim() || '';
        if (phone.length > 5) {
          if (name) await api.createContact({ phone, name }).catch(() => {});
          phones.push(phone);
        }
      }
      if (phones.length) await api.addToSegment(selected.id, phones);
      openGroup(selected);
    } catch (e: any) { alert(e.message); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function fmt(d?: string) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  // Group list view
  if (!selected) {
    return (
      <div style={{ padding: '28px', maxWidth: 900 }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Groups</h1>
            <p className="page-sub">Manage your contact segments and groups</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNewGroup(true)}>
            <Plus size={15} /> New Group
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: '#9ca3af', fontSize: 13 }}>
            <Loader2 size={16} className="animate-spin" /> Loading groups...
          </div>
        ) : segments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>No groups yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>Create a group to organize your contacts</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {segments.map(seg => (
              <div
                key={seg.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}
                onClick={() => openGroup(seg)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>{seg.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <button
                    className="btn-danger"
                    style={{ padding: '4px 8px' }}
                    onClick={e => { e.stopPropagation(); deleteGroup(seg); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{seg.name}</p>
                  {seg.description && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{seg.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New group modal */}
        {showNewGroup && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewGroup(false)}>
            <div className="modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 600, color: '#111827' }}>New Group</h3>
                <button onClick={() => setShowNewGroup(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">Group Name</label>
                  <input className="input-field" placeholder="e.g. High Value Leads" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Description <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input className="input-field" placeholder="Brief description..." value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn-ghost" onClick={() => setShowNewGroup(false)}>Cancel</button>
                  <button className="btn-primary" onClick={createGroup} disabled={savingGroup || !newGroupName.trim()}>
                    {savingGroup ? <><Loader2 size={13} className="animate-spin" /> Creating...</> : 'Create Group'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Group detail — contact table
  return (
    <div style={{ padding: '28px', maxWidth: 1000 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}
          >
            <ChevronLeft size={15} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{selected.name}</h1>
            <p className="page-sub">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} in this group</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* CSV import */}
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <><Loader2 size={13} className="animate-spin" /> Importing...</> : <><Upload size={13} /> Import CSV</>}
          </button>
          <button className="btn-primary" onClick={() => setShowAddContact(true)}>
            <UserPlus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* CSV format hint */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#3b82f6' }}>
        CSV format: <code style={{ fontFamily: 'monospace' }}>phone, name</code> — one per line. Phone must include country code.
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-header" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr' }}>
          <span className="table-head">Name</span>
          <span className="table-head">Phone</span>
          <span className="table-head">Last Active</span>
          <span className="table-head">Actions</span>
        </div>

        {loadingContacts ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: '#9ca3af', fontSize: 13 }}>
            <Loader2 size={15} className="animate-spin" /> Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No contacts in this group</div>
        ) : (
          contacts.map(c => (
            <div key={c.phone} className="table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="table-cell" style={{ fontWeight: 500 }}>{c.name || '—'}</span>
              </div>
              <span className="table-cell" style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{c.phone}</span>
              <span className="table-cell" style={{ color: '#6b7280', fontSize: 12 }}>{fmt(c.last_active)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onOpenChat(c.phone)}
                  style={{ padding: '5px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, color: '#059669', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans, sans-serif' }}
                >
                  <MessageSquare size={12} /> Chat
                </button>
                <button
                  className="btn-danger"
                  style={{ padding: '5px 10px' }}
                  onClick={() => removeContact(c.phone)}
                  disabled={removingPhone === c.phone}
                >
                  {removingPhone === c.phone ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add contact modal */}
      {showAddContact && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddContact(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 600, color: '#111827' }}>Add Contact to Group</h3>
              <button onClick={() => setShowAddContact(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Phone Number</label>
                <input className="input-field" placeholder="919876543210 (with country code)" value={addPhone} onChange={e => setAddPhone(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Name <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(required if new contact)</span></label>
                <input className="input-field" placeholder="Full name..." value={addName} onChange={e => setAddName(e.target.value)} />
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                If this number already exists in contacts, it will be added to the group. If not, a new contact will be created.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowAddContact(false)}>Cancel</button>
                <button className="btn-primary" onClick={addContact} disabled={addingContact || !addPhone.trim()}>
                  {addingContact ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : 'Add to Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

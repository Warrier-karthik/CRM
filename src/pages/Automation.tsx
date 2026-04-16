import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Edit2, X, Upload, Link, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface Button { id: string; title: string; reply: string; }
interface Automation {
  id: string;
  keyword: string;
  keywords?: string[];
  message?: string;
  type?: string;
  media_url?: string;
  buttons?: Button[];
  enabled: boolean;
}

const EMPTY: Omit<Automation, 'id'> & { altKeywords: string; mediaInputMode: 'url' | 'upload' } = {
  keyword: '',
  altKeywords: '',
  message: '',
  type: 'text',
  media_url: '',
  buttons: [],
  enabled: true,
  mediaInputMode: 'url',
};

export default function Automation() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAutomations();
      setAutomations(Array.isArray(data.data) ? data.data : (data.responses || []));
    } catch { setAutomations([]); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }

  function openEdit(a: Automation) {
    setEditing(a);
    setForm({
      keyword: a.keyword || '',
      altKeywords: (a.keywords || []).join(', '),
      message: a.message || '',
      type: a.type || 'text',
      media_url: a.media_url || '',
      buttons: a.buttons || [],
      enabled: a.enabled,
      mediaInputMode: 'url',
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.keyword.trim()) return;
    setSaving(true);
    try {
      const altArr = form.altKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const body: any = {
        keyword: form.keyword.trim(),
        keywords: altArr,
        message: form.message,
        type: form.type,
        enabled: form.enabled,
      };
      if (form.type !== 'text') body.media_url = form.media_url;
      if (form.buttons && form.buttons.length > 0) body.buttons = form.buttons;

      if (editing) {
        await api.updateAutomation(editing.id, body);
      } else {
        await api.createAutomation(body);
      }
      setShowModal(false);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function toggle(a: Automation) {
    setTogglingId(a.id);
    try {
      await api.updateAutomation(a.id, { ...a, enabled: !a.enabled });
      setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, enabled: !x.enabled } : x));
    } catch (e: any) { alert(e.message); }
    finally { setTogglingId(''); }
  }

  async function del(a: Automation) {
    if (!confirm(`Delete automation for "${a.keyword}"?`)) return;
    setDeletingId(a.id);
    try {
      await api.deleteAutomation(a.id);
      setAutomations(prev => prev.filter(x => x.id !== a.id));
    } catch (e: any) { alert(e.message); }
    finally { setDeletingId(''); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.uploadFile(file);
      setForm(p => ({ ...p, media_url: data.url || '' }));
    } catch (e: any) { alert(e.message); }
    finally { setUploading(false); }
  }

  function addButton() {
    if ((form.buttons?.length || 0) >= 3) return;
    setForm(p => ({ ...p, buttons: [...(p.buttons || []), { id: '', title: '', reply: '' }] }));
  }

  function updateButton(i: number, field: keyof Button, val: string) {
    setForm(p => {
      const btns = [...(p.buttons || [])];
      btns[i] = { ...btns[i], [field]: val };
      return { ...p, buttons: btns };
    });
  }

  function removeButton(i: number) {
    setForm(p => ({ ...p, buttons: (p.buttons || []).filter((_, idx) => idx !== i) }));
  }

  const RESPONSE_TYPES = [
    { value: 'text', label: 'Text only' },
    { value: 'image', label: 'Image + Text' },
    { value: 'video', label: 'Video + Text' },
    { value: 'menu', label: 'Menu (buttons)' },
  ];

  return (
    <div style={{ padding: '28px', maxWidth: 900 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Automation</h1>
          <p className="page-sub">Configure keyword-triggered bot responses</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={15} /> New Automation
        </button>
      </div>

      {/* Special keywords info */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>
        Special keywords: <code style={{ fontFamily: 'monospace', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>__WELCOME__</code> triggers on greetings (Hi, Hello) &nbsp;·&nbsp;
        <code style={{ fontFamily: 'monospace', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>__DEFAULT__</code> triggers when no other keyword matches
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: '#9ca3af', fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Loading automations...
        </div>
      ) : automations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>No automations yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>Create your first keyword-triggered response</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
            <span className="table-head">Keyword</span>
            <span className="table-head">Response</span>
            <span className="table-head">Type</span>
            <span className="table-head">Status</span>
            <span className="table-head">Actions</span>
          </div>
          {automations.map(a => (
            <div key={a.id} className="table-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
              <div>
                <span className="table-cell" style={{ fontWeight: 600 }}>{a.keyword}</span>
                {a.keywords && a.keywords.length > 0 && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{a.keywords.slice(0, 3).join(', ')}{a.keywords.length > 3 ? '...' : ''}</p>
                )}
              </div>
              <span className="table-cell" style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                {a.message || '—'}
              </span>
              <span>
                <span style={{ padding: '3px 8px', background: '#f3f4f6', borderRadius: 5, fontSize: 11, color: '#374151', fontWeight: 500, textTransform: 'capitalize' }}>
                  {a.type || 'text'}
                </span>
              </span>
              <span>
                <button
                  onClick={() => toggle(a)}
                  disabled={togglingId === a.id}
                  style={{
                    padding: '4px 12px',
                    background: a.enabled ? '#ecfdf5' : '#f9fafb',
                    border: `1px solid ${a.enabled ? '#a7f3d0' : '#e5e7eb'}`,
                    borderRadius: 20, fontSize: 11, fontWeight: 600,
                    color: a.enabled ? '#059669' : '#9ca3af',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  {togglingId === a.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.enabled ? '#10b981' : '#d1d5db', display: 'inline-block' }} />}
                  {a.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => openEdit(a)}
                  style={{ padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans, sans-serif' }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="btn-danger" style={{ padding: '5px 10px' }}
                  onClick={() => del(a)} disabled={deletingId === a.id}
                >
                  {deletingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 600, color: '#111827' }}>
                {editing ? 'Edit Automation' : 'New Automation'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Primary keyword */}
              <div>
                <label className="label">Primary Keyword</label>
                <input className="input-field" placeholder="e.g. pricing, __WELCOME__" value={form.keyword} onChange={e => setForm(p => ({ ...p, keyword: e.target.value }))} autoFocus />
              </div>

              {/* Alt keywords */}
              <div>
                <label className="label">Alternative Keywords <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(comma separated)</span></label>
                <input className="input-field" placeholder="hi, hello, hey" value={form.altKeywords} onChange={e => setForm(p => ({ ...p, altKeywords: e.target.value }))} />
              </div>

              {/* Response type */}
              <div>
                <label className="label">Response Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {RESPONSE_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(p => ({ ...p, type: t.value }))}
                      style={{ padding: '9px', border: `1px solid ${form.type === t.value ? '#10b981' : '#e5e7eb'}`, borderRadius: 8, background: form.type === t.value ? '#10b98112' : '#f6f8fa', color: form.type === t.value ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media for image/video */}
              {(form.type === 'image' || form.type === 'video') && (
                <div>
                  <label className="label">Media</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['url', 'upload'] as const).map(m => (
                      <button key={m} onClick={() => setForm(p => ({ ...p, mediaInputMode: m, media_url: '' }))}
                        style={{ padding: '6px 14px', border: `1px solid ${form.mediaInputMode === m ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, background: form.mediaInputMode === m ? '#10b98112' : 'transparent', color: form.mediaInputMode === m ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                        {m === 'url' ? <><Link size={12} /> URL</> : <><Upload size={12} /> Upload</>}
                      </button>
                    ))}
                  </div>
                  {form.mediaInputMode === 'url' ? (
                    <input className="input-field" placeholder={`https://example.com/media.${form.type === 'image' ? 'jpg' : 'mp4'}`} value={form.media_url} onChange={e => setForm(p => ({ ...p, media_url: e.target.value }))} />
                  ) : (
                    <div>
                      <input ref={fileRef} type="file" accept={form.type === 'image' ? 'image/*' : 'video/*'} style={{ display: 'none' }} onChange={handleUpload} />
                      <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <><Loader2 size={13} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Choose {form.type} file</>}
                      </button>
                      {form.media_url && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#059669' }}>File uploaded successfully</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Message text */}
              <div>
                <label className="label">{form.type === 'menu' ? 'Menu Message' : 'Response Message'}</label>
                <textarea className="input-field" style={{ resize: 'vertical', minHeight: 80 }}
                  placeholder="Type the bot's response..." value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
              </div>

              {/* Buttons */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label" style={{ margin: 0 }}>
                    Interactive Buttons <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(max 3)</span>
                  </label>
                  {(form.buttons?.length || 0) < 3 && (
                    <button onClick={addButton} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Sans, sans-serif' }}>
                      <Plus size={11} /> Add
                    </button>
                  )}
                </div>
                {(form.buttons || []).map((btn, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="input-field" style={{ fontSize: 12 }} placeholder="ID" value={btn.id} onChange={e => updateButton(i, 'id', e.target.value)} />
                    <input className="input-field" style={{ fontSize: 12 }} placeholder="Title" value={btn.title} onChange={e => updateButton(i, 'title', e.target.value)} />
                    <input className="input-field" style={{ fontSize: 12 }} placeholder="Reply text" value={btn.reply} onChange={e => updateButton(i, 'reply', e.target.value)} />
                    <button onClick={() => removeButton(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {(form.buttons || []).length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>No buttons added</p>
                )}
              </div>

              {/* Enabled toggle */}
              <button
                onClick={() => setForm(p => ({ ...p, enabled: !p.enabled }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: form.enabled ? '#ecfdf5' : '#f9fafb', border: `1px solid ${form.enabled ? '#a7f3d0' : '#e5e7eb'}`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${form.enabled ? '#10b981' : '#d1d5db'}`, background: form.enabled ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                  {form.enabled && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.enabled ? '#059669' : '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>
                  {form.enabled ? 'Enabled — bot will use this automation' : 'Disabled — automation is inactive'}
                </span>
              </button>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={saving || !form.keyword.trim()}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : editing ? 'Save Changes' : 'Create Automation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

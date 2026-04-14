import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, RefreshCw, X, FileText, Check, Upload, Link } from 'lucide-react';
import { api } from '../lib/api';

interface Template {
  id: string;
  name: string;
  content?: string;
  type?: string;
  category?: string;
  status?: string;
  meta_id?: string;
  buttons?: any[];
}

const EMPTY_FORM = {
  name: '', type: 'text', content: '', mediaUrl: '', category: 'MARKETING',
};

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [registerWithMeta, setRegisterWithMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaInputMode, setMediaInputMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      await api.syncTemplates();
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await api.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function saveTemplate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        type: form.type,
        category: form.category,
      };
      if (form.type === 'text') {
        body.content = form.content;
      } else {
        body.content = form.content;
        body.media_url = form.mediaUrl;
      }
      if (registerWithMeta) {
        await api.registerTemplate({ ...body, language_code: 'en_US' });
      } else {
        await api.createTemplate(body);
      }
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.uploadFile(file);
      setForm(p => ({ ...p, mediaUrl: data.url || '' }));
    } catch (e: any) { alert(e.message); }
    finally { setUploading(false); }
  }


  function statusColor(s?: string) {
    if (!s) return '#9ca3af';
    if (s === 'APPROVED') return '#10b981';
    if (s === 'REJECTED') return '#ef4444';
    if (s === 'PENDING') return '#f59e0b';
    return '#6b7280';
  }

  return (
    <div style={{ padding: '28px', maxWidth: 900 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-sub">{templates.length} templates in your library</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={sync} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            Sync from Meta
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9ca3af', fontSize: 13, padding: 60 }}>
          <span style={{ width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileText size={32} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>No templates yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>Create one or sync from Meta to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                    {t.type && (
                      <span style={{ padding: '2px 7px', background: '#e5e7eb', borderRadius: 4, fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>{t.type}</span>
                    )}
                    {t.category && (
                      <span style={{ padding: '2px 7px', background: '#e5e7eb', borderRadius: 4, fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>{t.category}</span>
                    )}
                    {t.status && (
                      <span style={{ padding: '2px 7px', background: `${statusColor(t.status)}18`, borderRadius: 4, fontSize: 10, fontWeight: 600, color: statusColor(t.status) }}>{t.status}</span>
                    )}
                  </div>
                </div>
                <button className="btn-danger" style={{ padding: '4px 8px', marginLeft: 8, flexShrink: 0 }} onClick={() => deleteTemplate(t.id, t.name)}>
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Content preview */}
              {t.content && (
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5, background: '#f6f8fa', padding: '8px 10px', borderRadius: 7, border: '1px solid #e5e7eb', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {t.content}
                </p>
              )}

              {t.buttons && t.buttons.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {t.buttons.map((b: any, i: number) => (
                    <span key={i} style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 11, color: '#6b7280' }}>{b.text || b.title}</span>
                  ))}
                </div>
              )}

              {t.meta_id && (
                <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>Meta ID: {t.meta_id}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 600, color: '#111827' }}>New Template</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Template Name</label>
                <input className="input-field" placeholder="e.g. welcome_offer" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af' }}>Lowercase, underscores only. Used as identifier with Meta.</p>
              </div>

              <div>
                <label className="label">Template Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['text', 'image', 'video'].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(p => ({ ...p, type: t }))}
                      style={{
                        padding: '9px',
                        border: `1px solid ${form.type === t ? '#10b981' : '#e5e7eb'}`,
                        borderRadius: 8,
                        background: form.type === t ? '#10b98112' : '#f6f8fa',
                        color: form.type === t ? '#10b981' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'DM Sans, sans-serif',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {form.type !== 'text' && (
                <div>
                  <label className="label">{form.type === 'image' ? 'Image' : 'Video'} Media</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['url', 'upload'] as const).map(m => (
                      <button key={m} onClick={() => { setMediaInputMode(m); setForm(p => ({ ...p, mediaUrl: '' })); }} style={{ padding: '6px 14px', border: `1px solid ${mediaInputMode === m ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, background: mediaInputMode === m ? '#10b98112' : 'transparent', color: mediaInputMode === m ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                        {m === 'url' ? <><Link size={12} /> URL</> : <><Upload size={12} /> Upload</>}
                      </button>
                    ))}
                  </div>
                  {mediaInputMode === 'url' ? (
                    <input className="input-field" placeholder="https://example.com/media.mp4" value={form.mediaUrl} onChange={e => setForm(p => ({ ...p, mediaUrl: e.target.value }))} />
                  ) : (
                    <div>
                      <input ref={fileRef} type="file" accept={form.type === 'image' ? 'image/*' : 'video/*'} style={{ display: 'none' }} onChange={handleFileUpload} />
                      <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Uploading...' : <><Upload size={14} /> Choose file</>}
                      </button>
                      {form.mediaUrl && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#059669' }}>File uploaded successfully</p>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label">{form.type === 'text' ? 'Message Content' : 'Caption'}</label>
                <textarea
                  className="input-field"
                  style={{ resize: 'vertical', minHeight: 90 }}
                  placeholder="Use {{1}}, {{2}} for dynamic variables..."
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select className="select-field" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              {/* Register with Meta toggle */}
              <button
                onClick={() => setRegisterWithMeta(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px',
                  background: registerWithMeta ? '#10b98112' : '#f6f8fa',
                  border: `1px solid ${registerWithMeta ? '#10b98140' : '#e5e7eb'}`,
                  borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: `1px solid ${registerWithMeta ? '#10b981' : '#d1d5db'}`,
                  background: registerWithMeta ? '#10b981' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}>
                  {registerWithMeta && <Check size={11} color="#fff" strokeWidth={3} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: registerWithMeta ? '#10b981' : '#111827', fontFamily: 'DM Sans, sans-serif' }}>Register with Meta for approval</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}>Submit to Meta Business Manager for review</p>
                </div>
              </button>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveTemplate} disabled={saving || !form.name.trim()}>
                  {saving ? 'Saving...' : registerWithMeta ? 'Save & Register' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

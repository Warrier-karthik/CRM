import { useEffect, useRef, useState } from 'react';
import { Send, ChevronDown, Upload, Link, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export default function Broadcast() {
  const [mode, setMode] = useState<'custom' | 'template'>('custom');
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customSelectedTemplate, setCustomSelectedTemplate] = useState('');
  const [broadcastType, setBroadcastType] = useState('text');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaInputMode, setMediaInputMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      api.getSegments().then(d => setSegments(Array.isArray(d) ? d : [])).catch(() => {}),
      api.getTemplates().then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {}),
    ]).finally(() => setLoadingData(false));
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.uploadFile(file);
      setMediaUrl(data.url || '');
    } catch (e: any) { alert(e.message); }
    finally { setUploading(false); }
  }

  async function send() {
    setSending(true);
    setResult(null);
    try {
      let res: any;
      const base = selectedSegment ? { segment_id: selectedSegment } : {};
      if (mode === 'template') {
        const tpl = templates.find(t => t.id === selectedTemplate || t.name === selectedTemplate);
        res = await api.bulkTemplate({ ...base, template_name: tpl?.name || selectedTemplate, language_code: tpl?.language_code || 'en_US', components: [] });
      } else if (broadcastType === 'text') {
        res = await api.bulkMessage({ ...base, message });
      } else {
        res = await api.bulkMedia({ ...base, media_type: broadcastType, media_url: mediaUrl, caption });
      }
      setResult(res);
    } catch (e: any) { alert(e.message); }
    finally { setSending(false); }
  }

  const canSend = mode === 'template'
    ? !!selectedTemplate
    : broadcastType === 'text'
      ? !!message.trim()
      : !!mediaUrl.trim();

  return (
    <div style={{ padding: '28px', maxWidth: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">Broadcast</h1>
        <p className="page-sub">Send messages in bulk to your segments or all contacts</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label className="label">Broadcast Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['custom', 'template'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '12px', border: `1px solid ${mode === m ? '#10b981' : '#e5e7eb'}`, borderRadius: 9, background: mode === m ? '#10b98112' : '#f6f8fa', color: mode === m ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', textAlign: 'center' }}>
                {m === 'custom' ? 'Custom Message' : 'Official Meta Template'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Target Segment <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
          {loadingData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#9ca3af' }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <select className="select-field" value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}>
                <option value="">All contacts</option>
                {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
            </div>
          )}
        </div>

        {mode === 'template' ? (
          <div>
            <label className="label">Select Template</label>
            {loadingData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#9ca3af' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading templates...
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <select className="select-field" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                  <option value="">Choose a template...</option>
                  {templates.map(t => <option key={t.id || t.name} value={t.id || t.name}>{t.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
              </div>
            )}
            {selectedTemplate && (() => {
              const t = templates.find(x => (x.id || x.name) === selectedTemplate);
              return t?.content ? <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{t.content}</div> : null;
            })()}
          </div>
        ) : (
          <>
            <div>
              <label className="label">Use a Saved Template <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional — pre-fill message)</span></label>
              {loadingData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#9ca3af' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading templates...
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <select
                    className="select-field"
                    value={customSelectedTemplate}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomSelectedTemplate(val);
                      if (val) {
                        const t = templates.find(x => (x.id || x.name) === val);
                        if (t?.content) setMessage(t.content);
                      }
                    }}
                  >
                    <option value="">Choose a template to pre-fill...</option>
                    {templates.map(t => <option key={t.id || t.name} value={t.id || t.name}>{t.name}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                </div>
              )}
            </div>

            <div>
              <label className="label">Broadcast Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['text', 'image', 'video'].map(t => (
                  <button key={t} onClick={() => setBroadcastType(t)} style={{ padding: '9px', border: `1px solid ${broadcastType === t ? '#10b981' : '#e5e7eb'}`, borderRadius: 8, background: broadcastType === t ? '#10b98112' : '#f6f8fa', color: broadcastType === t ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {broadcastType !== 'text' && (
              <div>
                <label className="label">Media</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {(['url', 'upload'] as const).map(m => (
                    <button key={m} onClick={() => { setMediaInputMode(m); setMediaUrl(''); }} style={{ padding: '6px 14px', border: `1px solid ${mediaInputMode === m ? '#10b981' : '#e5e7eb'}`, borderRadius: 7, background: mediaInputMode === m ? '#10b98112' : 'transparent', color: mediaInputMode === m ? '#10b981' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                      {m === 'url' ? <><Link size={12} /> URL</> : <><Upload size={12} /> Upload file</>}
                    </button>
                  ))}
                </div>
                {mediaInputMode === 'url' ? (
                  <input className="input-field" placeholder={`https://example.com/media.${broadcastType === 'image' ? 'jpg' : 'mp4'}`} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                ) : (
                  <div>
                    <input ref={fileRef} type="file" accept={broadcastType === 'image' ? 'image/*' : 'video/*'} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading
                        ? <><span style={{ width: 13, height: 13, border: '2px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Uploading...</>
                        : <><Upload size={14} /> Choose {broadcastType} file</>}
                    </button>
                    {mediaUrl && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#059669' }}>File uploaded successfully</p>}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="label">{broadcastType === 'text' ? 'Message' : 'Caption'}</label>
              <textarea className="input-field" style={{ resize: 'vertical', minHeight: 100 }} placeholder={broadcastType === 'text' ? 'Type your broadcast message...' : 'Optional caption...'} value={broadcastType === 'text' ? message : caption} onChange={e => broadcastType === 'text' ? setMessage(e.target.value) : setCaption(e.target.value)} />
            </div>
          </>
        )}

        {result && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#059669', fontWeight: 600 }}>
              Broadcast sent — {result.success} / {result.total} delivered
            </p>
          </div>
        )}

        <button className="btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 24px' }} onClick={send} disabled={sending || !canSend}>
          {sending
            ? <><span style={{ width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Sending...</>
            : <><Send size={14} /> Send Broadcast</>}
        </button>
      </div>
    </div>
  );
}

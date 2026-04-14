import { useEffect, useState } from 'react';
import { Send, ChevronDown, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function Outreach() {
  const [numbers, setNumbers] = useState('');
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number } | null>(null);

  useEffect(() => {
    api.getSegments().then(d => setSegments(Array.isArray(d) ? d : [])).catch(() => {});
    api.getTemplates().then(d => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function parseNumbers(raw: string) {
    return raw
      .split(/[\n,]+/)
      .map(s => s.trim().replace(/\s+/g, ''))
      .filter(s => s.length > 5);
  }

  const parsedNums = parseNumbers(numbers);

  async function send() {
    if (!parsedNums.length || !selectedTemplate) return;
    setSending(true);
    setResult(null);
    try {
      const tpl = templates.find(t => (t.id || t.name) === selectedTemplate);
      const body: any = {
        template_name: tpl?.name || selectedTemplate,
        language_code: tpl?.language_code || 'en_US',
        phones: parsedNums,
        components: [],
      };
      if (selectedSegment) body.segment_id = selectedSegment;
      const res = await api.bulkOutreach(body);
      setResult(res);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: '28px', maxWidth: 680 }}>
      <div className="page-header">
        <h1 className="page-title">Outreach</h1>
        <p className="page-sub">Reach out to new numbers not yet in your CRM</p>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #3b82f630', borderRadius: 10, padding: '12px 16px', marginBottom: 22, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={15} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
          Outreach creates contacts for new numbers and sends a Meta-approved template. You must have a payment method in Meta Business Manager. Contacts are auto-added to your CRM.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Phone numbers */}
        <div>
          <label className="label">
            Phone Numbers
            {parsedNums.length > 0 && (
              <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600, textTransform: 'none', fontSize: 11 }}>
                {parsedNums.length} number{parsedNums.length !== 1 ? 's' : ''} detected
              </span>
            )}
          </label>
          <textarea
            className="input-field"
            style={{ resize: 'vertical', minHeight: 140, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7 }}
            placeholder={`Enter numbers one per line or comma-separated:\n919876543210\n918765432109, 917654321098\n\nInclude country code (e.g. 91 for India)`}
            value={numbers}
            onChange={e => setNumbers(e.target.value)}
          />
          {parsedNums.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {parsedNums.slice(0, 8).map(n => (
                <span key={n} style={{ padding: '2px 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{n}</span>
              ))}
              {parsedNums.length > 8 && (
                <span style={{ padding: '2px 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 11, color: '#9ca3af' }}>+{parsedNums.length - 8} more</span>
              )}
            </div>
          )}
        </div>

        {/* Segment */}
        <div>
          <label className="label">Assign to Segment <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
          <div style={{ position: 'relative' }}>
            <select className="select-field" value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}>
              <option value="">No segment</option>
              {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Template */}
        <div>
          <label className="label">Template</label>
          <div style={{ position: 'relative' }}>
            <select className="select-field" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
              <option value="">Select a Meta-approved template...</option>
              {templates.map(t => (
                <option key={t.id || t.name} value={t.id || t.name}>{t.name}{t.status ? ` (${t.status})` : ''}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
          </div>
          {selectedTemplate && (() => {
            const t = templates.find(x => (x.id || x.name) === selectedTemplate);
            return t?.content ? (
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                {t.content}
              </div>
            ) : null;
          })()}
        </div>

        {result && (
          <div style={{ background: '#10b98115', border: '1px solid #10b98130', borderRadius: 9, padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
              Outreach complete — {result.success} / {result.total} delivered
            </p>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ alignSelf: 'flex-end', padding: '10px 24px' }}
          onClick={send}
          disabled={sending || !parsedNums.length || !selectedTemplate}
        >
          <Send size={14} />
          {sending ? 'Sending...' : `Send to ${parsedNums.length || 0} Number${parsedNums.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

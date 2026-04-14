import { useEffect, useState, useRef } from 'react';
import { Send, Search, Thermometer, Tag, RefreshCw, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface Chat {
  phone: string;
  name: string;
  avatar: string;
  last_message: string;
  timestamp: string;
  segment_ids: string[];
  lead_source?: string;
}

interface Message {
  phone?: string;
  text?: string;
  type?: string;
  sender_id?: string;
  timestamp?: string;
  message_id?: string;
  status?: string;
}

interface Props {
  initialPhone?: string;
}

function windowStatus(messages: Message[]): { expired: boolean; label: string } {
  const inboundMsgs = messages.filter(m => {
    const t = (m.type || '').toLowerCase();
    return t === 'user' || t === '';
  });
  if (inboundMsgs.length === 0) return { expired: true, label: 'No inbound messages — window closed' };
  const last = inboundMsgs[inboundMsgs.length - 1];
  if (!last.timestamp) return { expired: false, label: '' };
  const lastTime = new Date(last.timestamp).getTime();
  const now = Date.now();
  const diffMs = now - lastTime;
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffHrs >= 24) {
    const ago = Math.floor(diffHrs - 24);
    return { expired: true, label: `24-hour window expired ${ago > 0 ? ago + 'h ago' : 'just now'}` };
  }
  const remaining = 24 - diffHrs;
  const remH = Math.floor(remaining);
  const remM = Math.floor((remaining - remH) * 60);
  return { expired: false, label: `Window closes in ${remH}h ${remM}m` };
}

export default function Conversations({ initialPhone }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [contactDetail, setContactDetail] = useState<any>(null);
  const [updatingContact, setUpdatingContact] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
    setLoadingTemplates(true);
    api.getTemplates()
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  useEffect(() => {
    if (initialPhone && chats.length > 0) {
      const c = chats.find(ch => ch.phone === initialPhone);
      if (c) selectChat(c);
    }
  }, [initialPhone, chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChats() {
    try {
      const data = await api.getChats();
      setChats(data.chats || data || []);
    } catch {}
  }

  async function selectChat(chat: Chat) {
    setSelected(chat);
    setSelectedTemplate('');
    setLoadingMsgs(true);
    try {
      const [msgs, users] = await Promise.all([
        api.getMessages(chat.phone),
        api.getUsers(),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : (msgs.messages || []));
      const user = (users.users || users || []).find((u: any) => u.phone === chat.phone);
      setContactDetail({ ...(user || { phone: chat.phone, name: chat.name, status: 'ongoing', temperature: 'warm' }), lead_source: chat.lead_source || '' });
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function sendMessage() {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      await api.bulkMessage({ message: text, phones: [selected.phone] });
      setMessages(prev => [...prev, {
        message_id: Date.now().toString(),
        phone: selected.phone,
        text: text,
        type: 'agent',
        timestamp: new Date().toISOString(),
      }]);
      setText('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  async function sendTemplateToContact() {
    if (!selectedTemplate || !selected) return;
    setSendingTemplate(true);
    try {
      const tpl = templates.find(t => (t.id || t.name) === selectedTemplate);
      await api.sendTemplate({
        phone: selected.phone,
        template_name: tpl?.name || selectedTemplate,
        language_code: tpl?.language_code || 'en_US',
        components: [],
      });
      setMessages(prev => [...prev, {
        message_id: Date.now().toString(),
        phone: selected.phone,
        text: `[Template: ${tpl?.name || selectedTemplate}] ${tpl?.content || ''}`,
        type: 'agent',
        timestamp: new Date().toISOString(),
      }]);
      setSelectedTemplate('');
      setTimeout(() => selectChat(selected), 2000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSendingTemplate(false);
    }
  }

  async function updateContact(field: 'temperature' | 'status', value: string) {
    if (!contactDetail) return;
    setUpdatingContact(true);
    try {
      await api.updateContact(contactDetail.phone, { [field]: value });
      setContactDetail((p: any) => ({ ...p, [field]: value }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingContact(false);
    }
  }

  const filteredChats = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  function fmtTime(ts: string) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  }

  function bubbleClass(msg: Message) {
    const t = (msg.type || '').toLowerCase();
    if (t === 'agent') return 'chat-bubble-out';
    if (t === 'bot') return 'chat-bubble-bot';
    return 'chat-bubble-in';
  }

  function isOutgoing(msg: Message) {
    const t = (msg.type || '').toLowerCase();
    return t === 'agent' || t === 'bot';
  }

  const winStatus = messages.length > 0 && !loadingMsgs ? windowStatus(messages) : null;
  const windowExpired = winStatus?.expired ?? false;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Contact list */}
      <div style={{ width: 300, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="input-field" style={{ paddingLeft: 28, fontSize: 12 }} placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredChats.map(c => (
            <div
              key={c.phone}
              onClick={() => selectChat(c)}
              style={{
                padding: '12px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid #e5e7eb',
                background: selected?.phone === c.phone ? '#f0fdf4' : 'transparent',
                transition: 'background 0.1s',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
              onMouseEnter={e => { if (selected?.phone !== c.phone) (e.currentTarget as HTMLElement).style.background = '#ffffff'; }}
              onMouseLeave={e => { if (selected?.phone !== c.phone) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: selected?.phone === c.phone ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f9fafb, #d1d5db)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#111827', flexShrink: 0,
              }}>
                {c.avatar || c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.phone}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0, marginLeft: 6 }}>{fmtTime(c.timestamp)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_message || '—'}</p>
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No conversations</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {selected.avatar || selected.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{selected.name || selected.phone}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{selected.phone}</p>
            </div>
            {winStatus && (
              <div style={{
                marginLeft: 12,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: windowExpired ? '#fef2f2' : '#f0fdf4',
                color: windowExpired ? '#dc2626' : '#059669',
                border: `1px solid ${windowExpired ? '#fecaca' : '#a7f3d0'}`,
              }}>
                {windowExpired && <AlertTriangle size={11} />}
                {winStatus.label}
              </div>
            )}
            <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => selectChat(selected)}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* 24hr expired banner */}
          {windowExpired && (
            <div style={{
              background: '#fff7ed',
              borderBottom: '1px solid #fed7aa',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <AlertTriangle size={15} style={{ color: '#f97316', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#9a3412', lineHeight: 1.5 }}>
                <strong>24-hour messaging window has expired.</strong> You can only restart this conversation using an official Meta-approved template.
              </p>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingMsgs ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40 }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40 }}>No messages yet</div>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.message_id || i} style={{ display: 'flex', justifyContent: isOutgoing(msg) ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing(msg) ? 'flex-end' : 'flex-start', gap: 3, maxWidth: '75%' }}>
                    {msg.type && (
                      <span style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 2 }}>
                        {msg.type === 'bot' ? 'Bot' : msg.type === 'agent' ? 'Agent' : 'Customer'}
                      </span>
                    )}
                    <div className={bubbleClass(msg)}>
                      {msg.text || ""}
                    </div>
                    <span style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 2 }}>{fmtTime(msg.timestamp || '')}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input: template picker when window expired, normal chat otherwise */}
          {windowExpired ? (
            <div style={{ padding: '14px 16px', borderTop: '2px solid #fed7aa', background: '#fffbf7', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Send a Meta template to restart the conversation
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  {loadingTemplates ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, color: '#9ca3af', background: '#fff' }}>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading templates...
                    </div>
                  ) : (
                    <>
                      <select
                        className="select-field"
                        style={{ borderColor: '#fed7aa' }}
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                      >
                        <option value="">Choose a Meta template...</option>
                        {templates.map(t => (
                          <option key={t.id || t.name} value={t.id || t.name}>{t.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                    </>
                  )}
                </div>
                <button
                  style={{
                    padding: '9px 16px',
                    background: selectedTemplate ? '#f97316' : '#d1d5db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: selectedTemplate ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  onClick={sendTemplateToContact}
                  disabled={sendingTemplate || !selectedTemplate}
                >
                  {sendingTemplate
                    ? <><span style={{ width: 13, height: 13, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Sending...</>
                    : <><Send size={13} /> Send Template</>}
                </button>
              </div>
              {selectedTemplate && (() => {
                const t = templates.find(x => (x.id || x.name) === selectedTemplate);
                return t?.content ? (
                  <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #fed7aa', borderRadius: 7, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    {t.content}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                className="input-field"
                style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 120 }}
                placeholder="Type a message... (Shift+Enter for new line)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                rows={1}
              />
              <button className="btn-primary" style={{ padding: '9px 14px', height: 40, flexShrink: 0 }} onClick={sendMessage} disabled={sending || !text.trim()}>
                <Send size={15} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Select a conversation to get started
        </div>
      )}

      {/* Contact detail panel */}
      {selected && contactDetail && (
        <div style={{ width: 240, borderLeft: '1px solid #e5e7eb', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 auto 12px' }}>
              {contactDetail.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <p style={{ textAlign: 'center', margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{contactDetail.name}</p>
            <p style={{ textAlign: 'center', margin: '3px 0 0', fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{contactDetail.phone}</p>
          </div>

          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Thermometer size={11} /> Temperature
            </label>
            <select
              className="select-field"
              value={contactDetail.temperature || 'warm'}
              onChange={e => updateContact('temperature', e.target.value)}
              disabled={updatingContact}
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Tag size={11} /> Status
            </label>
            <select
              className="select-field"
              value={contactDetail.status || 'ongoing'}
              onChange={e => updateContact('status', e.target.value)}
              disabled={updatingContact}
            >
              <option value="ongoing">Ongoing</option>
              <option value="converted">Converted</option>
            </select>
          </div>

          {contactDetail.last_active && (
            <div>
              <label className="label">Last Active</label>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{new Date(contactDetail.last_active).toLocaleString()}</p>
            </div>
          )}

          {contactDetail.lead_source && (
            <div>
              <label className="label">Lead Source</label>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7 }}>{contactDetail.lead_source}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

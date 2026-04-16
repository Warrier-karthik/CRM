import { useEffect, useState, useRef } from 'react';
import { Send, Search, Thermometer, Tag, RefreshCw, AlertTriangle, ChevronDown, Loader2, User, X, CheckCheck, Check } from 'lucide-react';
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
  const [panelOpen, setPanelOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [text]);

  async function loadChats() {
    setLoadingChats(true);
    try {
      const data = await api.getChats();
      setChats(data.chats || data || []);
    } catch {}
    finally {
      setLoadingChats(false);
    }
  }

  async function selectChat(chat: Chat) {
    setSelected(chat);
    setSelectedTemplate('');
    setPanelOpen(false);
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



  function isOutgoing(msg: Message) {
    const t = (msg.type || '').toLowerCase();
    return t === 'agent' || t === 'bot';
  }

  // Group messages: consecutive same-sender messages cluster together
  function groupMessages(msgs: Message[]) {
    return msgs.map((msg, i) => {
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const sameAsPrev = prev && (prev.type || '') === (msg.type || '');
      const sameAsNext = next && (next.type || '') === (msg.type || '');
      return { msg, isFirst: !sameAsPrev, isLast: !sameAsNext };
    });
  }

  const winStatus = messages.length > 0 && !loadingMsgs ? windowStatus(messages) : null;
  const windowExpired = winStatus?.expired ?? false;
  const grouped = groupMessages(messages);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(260px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(260px); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .msg-enter {
          animation: fadeInUp 0.2s ease-out both;
        }
        .chat-list-item {
          transition: background 0.15s ease;
        }
        .chat-list-item:hover {
          background: #f9fafb !important;
        }
        .contact-panel {
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
          overflow: hidden;
        }
        .contact-panel.open {
          width: 240px;
          opacity: 1;
        }
        .contact-panel.closed {
          width: 0;
          opacity: 0;
        }
        .panel-toggle-btn {
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
        }
        .panel-toggle-btn:hover {
          background: #f3f4f6 !important;
          box-shadow: 0 0 0 2px #e5e7eb;
        }
        .panel-toggle-btn.active {
          background: #ecfdf5 !important;
          color: #059669 !important;
        }
        .send-btn {
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        }
        .send-btn:not(:disabled):hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(16,185,129,0.35);
        }
        .send-btn:not(:disabled):active {
          transform: scale(0.97);
        }
        .bubble-in {
          background: #ffffff;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-radius: 16px 16px 16px 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }
        .bubble-out {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          border-radius: 16px 16px 4px 16px;
          box-shadow: 0 2px 8px rgba(16,185,129,0.25);
        }
        .bubble-bot {
          background: #f0f9ff;
          color: #0369a1;
          border: 1px solid #bae6fd;
          border-radius: 16px 16px 16px 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .bubble-first-in { border-top-left-radius: 16px; }
        .bubble-last-in { border-bottom-left-radius: 16px; }
        .bubble-mid-in { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }

        .bubble-first-out { border-top-right-radius: 16px; }
        .bubble-last-out { border-bottom-right-radius: 16px; }
        .bubble-mid-out { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }

        .refresh-btn {
          transition: background 0.15s, transform 0.2s;
        }
        .refresh-btn:hover {
          background: #f3f4f6 !important;
        }
        .refresh-btn:active .refresh-icon {
          transform: rotate(180deg);
        }
        .refresh-icon {
          transition: transform 0.4s ease;
        }
      `}</style>

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
            {filteredChats.map((c, idx) => (
              <div
                key={c.phone}
                className="chat-list-item"
                onClick={() => selectChat(c)}
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: selected?.phone === c.phone ? '#f0fdf4' : 'transparent',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  animation: `fadeInUp 0.2s ease-out ${idx * 0.03}s both`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: selected?.phone === c.phone ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f3f4f6, #d1d5db)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: selected?.phone === c.phone ? '#fff' : '#374151', flexShrink: 0,
                  transition: 'background 0.2s',
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
            {loadingChats ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                <span>Loading conversations...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No conversations</div>
            ) : null}
          </div>
        </div>

        {/* Chat area */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {selected.avatar || selected.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{selected.name || selected.phone}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{selected.phone}</p>
              </div>
              {winStatus && (
                <div style={{
                  padding: '3px 9px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: windowExpired ? '#fef2f2' : '#f0fdf4',
                  color: windowExpired ? '#dc2626' : '#059669',
                  border: `1px solid ${windowExpired ? '#fecaca' : '#a7f3d0'}`,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {windowExpired && <AlertTriangle size={10} />}
                  {winStatus.label}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="refresh-btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8 }}
                  onClick={() => selectChat(selected)}
                >
                  <RefreshCw size={13} className="refresh-icon" /> Refresh
                </button>
                <button
                  className={`panel-toggle-btn btn-ghost ${panelOpen ? 'active' : ''}`}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    color: panelOpen ? '#059669' : '#374151',
                  }}
                  onClick={() => setPanelOpen(v => !v)}
                  title={panelOpen ? 'Close contact info' : 'Show contact info'}
                >
                  {panelOpen ? <X size={13} /> : <User size={13} />}
                  {panelOpen ? 'Close' : 'Info'}
                </button>
              </div>
            </div>

            {/* 24hr expired banner */}
            {windowExpired && (
              <div style={{
                background: '#fff7ed',
                borderBottom: '1px solid #fed7aa',
                padding: '9px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <AlertTriangle size={14} style={{ color: '#f97316', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#9a3412', lineHeight: 1.5 }}>
                  <strong>24-hour messaging window has expired.</strong> You can only restart this conversation using an official Meta-approved template.
                </p>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40 }}>No messages yet</div>
              ) : (
                grouped.map(({ msg, isFirst, isLast }, i) => {
                  const out = isOutgoing(msg);
                  const t = (msg.type || '').toLowerCase();

                  let bubbleExtra = '';
                  if (!out) {
                    if (isFirst && isLast) bubbleExtra = '';
                    else if (isFirst) bubbleExtra = 'bubble-first-in';
                    else if (isLast) bubbleExtra = 'bubble-last-in';
                    else bubbleExtra = 'bubble-mid-in';
                  } else {
                    if (isFirst && isLast) bubbleExtra = '';
                    else if (isFirst) bubbleExtra = 'bubble-first-out';
                    else if (isLast) bubbleExtra = 'bubble-last-out';
                    else bubbleExtra = 'bubble-mid-out';
                  }

                  const bubbleBase = out
                    ? (t === 'bot' ? 'bubble-bot' : 'bubble-out')
                    : 'bubble-in';

                  return (
                    <div
                      key={msg.message_id || i}
                      className="msg-enter"
                      style={{
                        display: 'flex',
                        justifyContent: out ? 'flex-end' : 'flex-start',
                        marginBottom: isLast ? 6 : 1,
                        marginTop: isFirst && i > 0 ? 6 : 0,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: out ? 'flex-end' : 'flex-start',
                        gap: 2,
                        maxWidth: '72%',
                      }}>
                        {isFirst && msg.type && (
                          <span style={{
                            fontSize: 10,
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            fontWeight: 500,
                            paddingLeft: out ? 0 : 4,
                            paddingRight: out ? 4 : 0,
                          }}>
                            {t === 'bot' ? 'Bot' : t === 'agent' ? 'Agent' : 'Customer'}
                          </span>
                        )}
                        <div
                          className={`${bubbleBase} ${bubbleExtra}`}
                          style={{
                            padding: '8px 12px',
                            fontSize: 13,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.text || ''}
                        </div>
                        {isLast && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: out ? 0 : 4, paddingRight: out ? 4 : 0 }}>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{fmtTime(msg.timestamp || '')}</span>
                            {out && (
                              msg.status === 'read'
                                ? <CheckCheck size={11} style={{ color: '#10b981' }} />
                                : <Check size={11} style={{ color: '#9ca3af' }} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {windowExpired ? (
              <div style={{ padding: '12px 14px', borderTop: '2px solid #fed7aa', background: '#fffbf7', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      transition: 'background 0.15s, transform 0.1s',
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
              <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff' }}>
                <textarea
                  ref={textareaRef}
                  className="input-field"
                  style={{ flex: 1, resize: 'none', minHeight: 38, maxHeight: 120, lineHeight: 1.5, transition: 'height 0.1s ease' }}
                  placeholder="Type a message... (Shift+Enter for new line)"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  rows={1}
                />
                <button
                  className="btn-primary send-btn"
                  style={{ padding: '9px 14px', height: 38, flexShrink: 0, borderRadius: 10 }}
                  onClick={sendMessage}
                  disabled={sending || !text.trim()}
                >
                  {sending
                    ? <span style={{ width: 13, height: 13, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    : <Send size={15} />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={16} style={{ color: '#d1d5db' }} />
            </div>
            Select a conversation to get started
          </div>
        )}

        {/* Contact detail panel — collapsible */}
        {selected && contactDetail && (
          <div
            className={`contact-panel ${panelOpen ? 'open' : 'closed'}`}
            style={{
              borderLeft: panelOpen ? '1px solid #e5e7eb' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: panelOpen ? 'auto' : 'hidden',
              flexShrink: 0,
              padding: panelOpen ? '20px 16px' : 0,
            }}
          >
            <div>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 auto 12px',
              }}>
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

            {contactDetail.source && (
              <div>
                <label className="label">Lead Source</label>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7 }}>{contactDetail.source}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
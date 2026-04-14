const BASE = import.meta.env.VITE_API_URL;

// In-memory token store — persists across requests in the same session
let _token = localStorage.getItem('crm_token') || '';

export function setToken(t: string) {
  _token = t;
  localStorage.setItem('crm_token', t);
}

export function clearToken() {
  _token = '';
  localStorage.removeItem('crm_token');
}

export function hasToken() {
  return !!_token;
}

async function req(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ..._token ? { Authorization: `Bearer ${_token}` } : {},
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    if (data.token) setToken(data.token);
    return data;
  },

  logout: () => {
    const tokenToUse = _token; // save before clearing
    clearToken();
    return fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {}) },
    }).then(r => r.json()).catch(() => ({}));
  },

  // Stats
  getStats: () => req('GET', '/stats'),

  // Contacts
  getUsers: (params?: { status?: string; temperature?: string }) => {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return req('GET', '/users' + q);
  },
  getChats: () => req('GET', '/chats'),
  createContact: (body: { phone: string; name: string }) => req('POST', '/contacts', body),
  bulkContacts: (body: any[]) => req('POST', '/contacts/bulk', body),
  updateContact: (phone: string, body: any) => req('PATCH', `/contacts/${phone}`, body),
  deleteContact: (phone: string) => req('DELETE', `/contacts/${phone}`),

  // Messages
  getMessages: (phone: string) => req('GET', `/messages?phone=${phone}`),
  sendTemplate: (body: any) => req('POST', '/send-template', body),

  // Bulk messaging
  bulkMessage: (body: any) => req('POST', '/bulk-message', body),
  bulkTemplate: (body: any) => req('POST', '/bulk-template', body),
  bulkButtons: (body: any) => req('POST', '/bulk-buttons', body),
  bulkMedia: (body: any) => req('POST', '/bulk-media', body),
  bulkOutreach: (body: any) => req('POST', '/bulk-outreach', body),

  // Segments
  getSegments: () => req('GET', '/segments'),
  createSegment: (body: { name: string; description?: string }) => req('POST', '/segments', body),
  deleteSegment: (id: string) => req('DELETE', `/segments/${id}`),
  getSegmentContacts: (id: string) => req('GET', `/segments/${id}/contacts`),
  addToSegment: (id: string, phones: string[]) => req('POST', `/segments/${id}/contacts`, { phones }),
  removeFromSegment: (id: string, phone: string) => req('DELETE', `/segments/${id}/contacts/${phone}`),

  // Templates
  getTemplates: () => req('GET', '/templates'),
  createTemplate: (body: any) => req('POST', '/templates', body),
  registerTemplate: (body: any) => req('POST', '/templates/register', body),
  syncTemplates: () => req('POST', '/templates/sync', {}),
  deleteTemplate: (id: string) => req('DELETE', `/templates/${id}`),

  // Agents
  getAgents: () => req('GET', '/agents'),

  // Bot Automation
  getAutomations: () => req('GET', '/responses'),
  createAutomation: (body: any) => req('POST', '/responses', body),
  updateAutomation: (id: string, body: any) => req('PUT', `/responses/${id}`, body),
  deleteAutomation: (id: string) => req('DELETE', `/responses/${id}`),

  // Upload
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { ..._token ? { Authorization: `Bearer ${_token}` } : {} },
      body: form,
    });
    return res.json();
  },
};

export function createWebSocket(onMessage: (data: any) => void) {
  const wsUrl = BASE.replace(/^http/, 'ws').replace('/api', '') + '/ws';
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  return ws;
}

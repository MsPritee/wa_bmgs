import { useAuthStore } from '../stores/auth';
import type { SessionUser } from '../stores/auth';
import type { Business, ConversationDetail, ConversationItem, Customer, Overview, TrendPoint } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = 'Request failed';
    let code = 'UNKNOWN';
    try {
      const payload = await res.json();
      message = payload?.error?.message ?? message;
      code = payload?.error?.code ?? code;
    } catch {
      /* ignore */
    }
    if (res.status === 401) {
      useAuthStore.getState().clear();
    }
    throw new ApiError(res.status, code, message);
  }

  const payload = await res.json();
  return (payload?.data ?? payload) as T;
}

export const endpoints = {
  login: (email: string, password: string) => api<{ accessToken: string; refreshToken: string; user: SessionUser }>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => api<{ user: SessionUser; tenant: unknown }>('/auth/me'),
  overview: () => api<Overview>('/analytics/overview'),
  trend: () => api<TrendPoint[]>('/analytics/conversations/trend'),
  conversations: () => api<ConversationItem[]>('/conversations'),
  conversation: (id: string) => api<ConversationDetail>(`/conversations/${id}`),
  customers: () => api<Customer[]>('/customers'),
  menus: () => api<{ id: string; name: string; trigger?: string | null; isActive: boolean; items: { id: string; label: string; action: string; sortOrder: number }[] }[]>('/menus'),
  workflows: () => api<{ id: string; name: string; description?: string | null; triggerType: string; isActive: boolean; nodes: { id: string; name: string; nodeType: string; position?: { x: number; y: number } }[] }[]>('/workflows'),
  entities: () => api<{ id: string; name: string; slug: string; fields: { id: string; key: string; label: string; fieldType: string; required: boolean }[]; _count?: { records: number } }[]>('/entities'),
  templates: () => api<{ id: string; name: string; body: string; language: string; status: string }[]>('/templates'),
  agents: () => api<{ id: string; name: string; email: string; agentStatus: string | null; isActive: boolean; _count: { conversations: number } }[]>('/agents'),
  business: () => api<Business>('/businesses/me'),
  updateBusiness: (payload: { name?: string; businessType?: string; whatsappPhone?: string; whatsappAccountId?: string }) => api<Business>('/businesses/me', { method: 'PUT', body: payload }),
  messages: (conversationId: string) => api<import('../types').Message[]>(`/messages?conversationId=${conversationId}`),
  sendMessage: (payload: { conversationId: string; content: string; messageType?: string }) => api('/messages/send', { method: 'POST', body: payload }),
  takeover: (id: string) => api(`/conversations/${id}/takeover`, { method: 'POST' }),
  resume: (id: string) => api(`/conversations/${id}/resume`, { method: 'POST' }),
  resolve: (id: string) => api(`/conversations/${id}/resolve`, { method: 'POST' }),
};
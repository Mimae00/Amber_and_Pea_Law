import { ApiError, clearPublicCache, request } from './client';
import type {
  AdminBooking,
  AdminLead,
  AnyLeadSource,
  BookingStatus,
  LeadStatus,
  LoginResponse,
  Page,
  PracticeArea,
  PracticeAreaInput,
  Review,
  ReviewInput,
} from './types';

/**
 * Admin token handling. The JWT lives in sessionStorage: it is cleared when the tab closes and is
 * only sent as a Bearer header (no cookies, so no CSRF exposure). The API enforces expiry.
 */
const TOKEN_KEY = 'amberpea.admin.session';

interface Session {
  token: string;
  expiresAt: string;
  email: string;
  displayName: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export const adminSession = {
  get(): Session | null {
    try {
      const raw = sessionStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      if (new Date(s.expiresAt).getTime() <= Date.now()) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  },
  set(s: Session) {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    listeners.forEach((l) => l());
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = adminSession.get();
  if (!session) {
    adminSession.clear();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
  try {
    return await request<T>(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.token}` } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) adminSession.clear();
    throw err;
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const adminApi = {
  async login(email: string, password: string) {
    const res = await request<LoginResponse>('/api/auth/login', json('POST', { email, password }));
    adminSession.set(res);
    return res;
  },
  logout() {
    adminSession.clear();
  },

  leads: (f: { status?: LeadStatus; source?: AnyLeadSource; q?: string; page?: number; size?: number }) =>
    authed<Page<AdminLead>>(`/api/admin/leads${qs(f)}`),
  updateLeadStatus: (id: number, status: LeadStatus) =>
    authed<AdminLead>(`/api/admin/leads/${id}/status`, json('PATCH', { status })),

  bookings: (f: { status?: BookingStatus; from?: string; to?: string; page?: number; size?: number }) =>
    authed<Page<AdminBooking>>(`/api/admin/bookings${qs(f)}`),
  updateBookingStatus: (id: number, status: BookingStatus) =>
    authed<AdminBooking>(`/api/admin/bookings/${id}/status`, json('PATCH', { status })),

  reviews: () => authed<Review[]>('/api/admin/reviews'),
  async saveReview(id: number | null, body: ReviewInput) {
    const r = await authed<Review>(id ? `/api/admin/reviews/${id}` : '/api/admin/reviews', json(id ? 'PUT' : 'POST', body));
    clearPublicCache();
    return r;
  },

  practiceAreas: () => authed<PracticeArea[]>('/api/admin/practice-areas'),
  async savePracticeArea(id: number | null, body: PracticeAreaInput) {
    const r = await authed<PracticeArea>(
      id ? `/api/admin/practice-areas/${id}` : '/api/admin/practice-areas',
      json(id ? 'PUT' : 'POST', body),
    );
    clearPublicCache();
    return r;
  },
};

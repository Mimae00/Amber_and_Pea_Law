import { config } from '../config';
import type { Attorney, CreateLeadRequest, PracticeArea, ProblemDetail, Review } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetail;

  constructor(status: number, message: string, problem?: ProblemDetail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      signal: combined,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, 'We could not reach the server. Please check your connection or call us.');
  }
  if (!res.ok) {
    let problem: ProblemDetail | undefined;
    try {
      problem = (await res.json()) as ProblemDetail;
    } catch {
      problem = undefined;
    }
    throw new ApiError(res.status, problem?.detail ?? `Request failed (${res.status})`, problem);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Small in-memory cache for public GET requests, so navigating back and forth is instant.
 * Cached requests are shared between callers, so they are not tied to any one caller's
 * AbortSignal (only the request timeout applies). Failed requests are evicted.
 */
const cache = new Map<string, Promise<unknown>>();

function cachedGet<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const p = request<T>(path).catch((err: unknown) => {
    cache.delete(path);
    throw err;
  });
  cache.set(path, p);
  return p;
}

export const api = {
  practiceAreas: () => cachedGet<PracticeArea[]>('/api/practice-areas'),
  practiceArea: (slug: string) => cachedGet<PracticeArea>(`/api/practice-areas/${encodeURIComponent(slug)}`),
  attorneys: () => cachedGet<Attorney[]>('/api/attorneys'),
  attorney: (slug: string) => cachedGet<Attorney>(`/api/attorneys/${encodeURIComponent(slug)}`),
  reviews: (limit = 50) => cachedGet<Review[]>(`/api/reviews?limit=${limit}`),
  createLead: (body: CreateLeadRequest) =>
    request<{ status: string }>('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
};

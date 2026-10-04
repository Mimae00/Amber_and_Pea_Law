import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import type { BookingStatus, LeadStatus } from '../../api/types';

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'BOOKED', 'CLOSED'];
export const BOOKING_STATUSES: BookingStatus[] = ['NEW', 'CONTACTED', 'BOOKED', 'CLOSED', 'CANCELLED'];

export const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.problem?.errors) return Object.values(err.problem.errors).join(' ');
    return err.message;
  }
  return 'Something went wrong.';
}

/** Loads data for admin pages and exposes a reload function. */
export function useLoader<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .then((d) => {
        if (active) {
          setData(d);
          setError('');
        }
      })
      .catch((e: unknown) => active && setError(errorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, loading, reload };
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status.toLowerCase()}`}>{label(status)}</span>;
}

interface PagerProps {
  page: number;
  totalPages: number;
  totalElements: number;
  onPage: (p: number) => void;
}

export function Pager({ page, totalPages, totalElements, onPage }: PagerProps) {
  if (totalElements === 0) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page + 1} of {Math.max(1, totalPages)} ({totalElements} total)
      </span>
      <button type="button" className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}

/** Polite live region for save results. */
export function Notice({ message, kind }: { message: string; kind: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <p className={kind === 'error' ? 'alert alert--error' : 'alert alert--success'} role={kind === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  );
}

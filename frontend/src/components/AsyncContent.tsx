import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { ApiState } from '../hooks/useApi';
import { firm } from '../content/firm';

interface AsyncContentProps<T> {
  state: ApiState<T>;
  loadingLabel?: string;
  /** Rendered instead of the generic error when the API returns 404. */
  notFound?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Renders loading, error and success states consistently, with an accessible live region.
 */
export function AsyncContent<T>({ state, loadingLabel = 'Loading…', notFound, children }: AsyncContentProps<T>) {
  if (state.status === 'loading') {
    return (
      <p className="status-message" role="status" aria-live="polite">
        {loadingLabel}
      </p>
    );
  }
  if (state.status === 'error') {
    if (notFound && state.error instanceof ApiError && state.error.status === 404) {
      return <>{notFound}</>;
    }
    return (
      <div className="alert alert--error" role="alert">
        <p>Sorry, we couldn’t load this content right now.</p>
        <p>
          Please try again later or call us at <a href={firm.phoneHref}>{firm.phoneDisplay}</a>.
        </p>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}

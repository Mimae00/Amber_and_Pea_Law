import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError | Error }
  | { status: 'success'; data: T };

/**
 * Runs an API call when deps change. Results arriving after unmount or a deps change are ignored.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[]): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fetcher()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      });
    return () => {
      active = false;
    };
    // fetcher is intentionally excluded; callers pass the values it depends on in deps.
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

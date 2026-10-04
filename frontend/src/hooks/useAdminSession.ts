import { useSyncExternalStore } from 'react';
import { adminSession } from '../api/adminClient';

const readRaw = () => sessionStorage.getItem('amberpea.admin.session');

/** Current admin session (or null), re-rendering on sign-in, sign-out and 401s. */
export function useAdminSession() {
  const raw = useSyncExternalStore(adminSession.subscribe, readRaw, () => null);
  return raw ? adminSession.get() : null;
}

import { useState } from 'react';
import { adminApi } from '../../api/adminClient';
import { api } from '../../api/client';
import type { BookingStatus } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { formatCompact, zoneLabel } from '../../lib/datetime';
import { BOOKING_STATUSES, errorMessage, label, Notice, Pager, useLoader } from './shared';

function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AdminBookingsPage() {
  const config = useApi(() => api.bookingConfig(), []);
  const tz = config.status === 'success' ? config.data.timezone : undefined;
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>({ message: '', kind: 'success' });

  const { data, setData, error, loading, reload } = useLoader(
    () => adminApi.bookings({ status: status || undefined, from: from || undefined, to: to || undefined, page, size: 20 }),
    [status, from, to, page],
  );

  async function changeStatus(id: number, next: BookingStatus) {
    try {
      const updated = await adminApi.updateBookingStatus(id, next);
      setData((d) => (d ? { ...d, content: d.content.map((b) => (b.id === id ? updated : b)) } : d));
      setNotice({
        message: next === 'CANCELLED' ? `Booking #${id} cancelled. The time slot is available again.` : `Booking #${id} marked ${label(next)}.`,
        kind: 'success',
      });
    } catch (e) {
      setNotice({ message: errorMessage(e), kind: 'error' });
      reload();
    }
  }

  return (
    <section aria-labelledby="bookings-heading">
      <h1 id="bookings-heading">Bookings</h1>
      {tz && <p className="fine-print">Times shown in {zoneLabel(tz)}.</p>}
      <div className="admin-filters">
        <div className="field">
          <label htmlFor="bk-status">Status</label>
          <select id="bk-status" value={status} onChange={(e) => { setStatus(e.target.value as BookingStatus | ''); setPage(0); }}>
            <option value="">All</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bk-from">From</label>
          <input id="bk-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div className="field">
          <label htmlFor="bk-to">To</label>
          <input id="bk-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
      </div>

      <Notice {...notice} />
      {error && <Notice message={error} kind="error" />}
      {loading && !data && <p role="status">Loading bookings…</p>}

      {data && (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Bookings table">
            <table className="admin-table">
              <caption className="visually-hidden">Bookings, soonest first</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Client</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Matter</th>
                  <th scope="col">Notes</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.content.length === 0 && (
                  <tr>
                    <td colSpan={6}>No bookings match these filters.</td>
                  </tr>
                )}
                {data.content.map((b) => (
                  <tr key={b.id} className={b.status === 'CANCELLED' ? 'is-cancelled' : undefined}>
                    <td>{formatCompact(b.startAt, tz)}</td>
                    <th scope="row">{b.lead.fullName}</th>
                    <td>
                      <a href={`mailto:${b.lead.email}`}>{b.lead.email}</a>
                      {b.lead.phone && (
                        <>
                          <br />
                          <a href={`tel:${b.lead.phone.replace(/[^\d+]/g, '')}`}>{b.lead.phone}</a>
                        </>
                      )}
                    </td>
                    <td>{b.lead.practiceAreaName ?? '—'}</td>
                    <td className="admin-table__message">{b.lead.message ?? '—'}</td>
                    <td>
                      <label className="visually-hidden" htmlFor={`bk-${b.id}-status`}>
                        Status for {b.lead.fullName}’s booking
                      </label>
                      <select id={`bk-${b.id}-status`} value={b.status} onChange={(e) => void changeStatus(b.id, e.target.value as BookingStatus)}>
                        {BOOKING_STATUSES.map((s) => (
                          <option key={s} value={s}>{label(s)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onPage={setPage} />
        </>
      )}
    </section>
  );
}

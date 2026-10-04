import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminClient';
import type { AnyLeadSource, LeadStatus } from '../../api/types';
import { formatCompact } from '../../lib/datetime';
import { errorMessage, label, LEAD_STATUSES, Notice, Pager, useLoader } from './shared';

const SOURCES: AnyLeadSource[] = ['CONSULTATION_FORM', 'CONTACT_FORM', 'CHATBOT', 'BOOKING'];

export default function AdminLeadsPage() {
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<AnyLeadSource | ''>('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>({ message: '', kind: 'success' });

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, setData, error, loading } = useLoader(
    () => adminApi.leads({ status: status || undefined, source: source || undefined, q: query || undefined, page, size: 20 }),
    [status, source, query, page],
  );

  async function changeStatus(id: number, next: LeadStatus) {
    try {
      const updated = await adminApi.updateLeadStatus(id, next);
      setData((d) => (d ? { ...d, content: d.content.map((l) => (l.id === id ? updated : l)) } : d));
      setNotice({ message: `Lead #${id} marked ${label(next)}.`, kind: 'success' });
    } catch (e) {
      setNotice({ message: errorMessage(e), kind: 'error' });
    }
  }

  return (
    <section aria-labelledby="leads-heading">
      <h1 id="leads-heading">Leads</h1>
      <div className="admin-filters">
        <div className="field">
          <label htmlFor="lead-search">Search</label>
          <input id="lead-search" type="search" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="lead-status">Status</label>
          <select id="lead-status" value={status} onChange={(e) => { setStatus(e.target.value as LeadStatus | ''); setPage(0); }}>
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lead-source">Source</label>
          <select id="lead-source" value={source} onChange={(e) => { setSource(e.target.value as AnyLeadSource | ''); setPage(0); }}>
            <option value="">All</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <Notice {...notice} />
      {error && <Notice message={error} kind="error" />}
      {loading && !data && <p role="status">Loading leads…</p>}

      {data && (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Leads table">
            <table className="admin-table">
              <caption className="visually-hidden">Leads, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Source</th>
                  <th scope="col">Matter</th>
                  <th scope="col">Message</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.content.length === 0 && (
                  <tr>
                    <td colSpan={7}>No leads match these filters.</td>
                  </tr>
                )}
                {data.content.map((l) => (
                  <tr key={l.id}>
                    <td>{formatCompact(l.createdAt)}</td>
                    <th scope="row">{l.fullName}</th>
                    <td>
                      <a href={`mailto:${l.email}`}>{l.email}</a>
                      {l.phone && (
                        <>
                          <br />
                          <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}>{l.phone}</a>
                        </>
                      )}
                    </td>
                    <td>{label(l.source)}</td>
                    <td>{l.practiceAreaName ?? '—'}</td>
                    <td className="admin-table__message">{l.message ?? '—'}</td>
                    <td>
                      <label className="visually-hidden" htmlFor={`lead-${l.id}-status`}>
                        Status for {l.fullName}
                      </label>
                      <select id={`lead-${l.id}-status`} value={l.status} onChange={(e) => void changeStatus(l.id, e.target.value as LeadStatus)}>
                        {LEAD_STATUSES.map((s) => (
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

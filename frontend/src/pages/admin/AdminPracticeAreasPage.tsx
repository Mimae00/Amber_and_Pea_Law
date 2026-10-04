import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApi } from '../../api/adminClient';
import type { PracticeArea, PracticeAreaInput } from '../../api/types';
import { errorMessage, Notice, useLoader } from './shared';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMPTY: PracticeAreaInput = { slug: '', name: '', summary: '', description: '', sortOrder: 100, active: true };

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function toInput(p: PracticeArea): PracticeAreaInput {
  return { slug: p.slug, name: p.name, summary: p.summary, description: p.description, sortOrder: p.sortOrder, active: p.active };
}

export default function AdminPracticeAreasPage() {
  const list = useLoader(() => adminApi.practiceAreas(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PracticeAreaInput | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>({ message: '', kind: 'success' });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (form) headingRef.current?.focus();
  }, [editingId, form === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof PracticeAreaInput>(k: K, v: PracticeAreaInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const problems: string[] = [];
    if (!form.name.trim()) problems.push('Name is required.');
    if (!SLUG_RE.test(form.slug)) problems.push('Slug must use lowercase letters, numbers and single hyphens.');
    if (!form.summary.trim()) problems.push('Summary is required.');
    if (form.summary.length > 400) problems.push('Summary must be 400 characters or fewer.');
    if (!form.description.trim()) problems.push('Description is required.');
    if (problems.length) {
      setNotice({ message: problems.join(' '), kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.savePracticeArea(editingId, form);
      setNotice({ message: editingId ? 'Practice area updated.' : 'Practice area added.', kind: 'success' });
      setForm(null);
      setEditingId(null);
      list.reload();
    } catch (err) {
      setNotice({ message: errorMessage(err), kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="pa-heading">
      <div className="admin-title-row">
        <h1 id="pa-heading">Practice areas</h1>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => { setEditingId(null); setSlugTouched(false); setForm({ ...EMPTY }); }}>
          Add practice area
        </button>
      </div>
      <Notice {...notice} />

      {form && (
        <form className="lead-form admin-editor" onSubmit={onSubmit} noValidate aria-labelledby="pa-form-heading">
          <h2 id="pa-form-heading" ref={headingRef} tabIndex={-1} className="lead-form__heading">
            {editingId ? 'Edit practice area' : 'New practice area'}
          </h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="pa-name">Name *</label>
              <input
                id="pa-name"
                maxLength={120}
                value={form.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  if (!editingId && !slugTouched) set('slug', slugify(e.target.value));
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="pa-slug">URL slug *</label>
              <input id="pa-slug" maxLength={80} value={form.slug} aria-describedby="pa-slug-hint"
                onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
              <p className="field__hint" id="pa-slug-hint">Page address: /practice-areas/{form.slug || 'your-slug'}</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="pa-summary">Summary * ({form.summary.length}/400)</label>
            <textarea id="pa-summary" rows={2} maxLength={400} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pa-description">Description *</label>
            <textarea id="pa-description" rows={6} maxLength={10000} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="pa-sort">Sort order</label>
              <input id="pa-sort" type="number" min={0} max={10000} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value) || 0)} />
            </div>
            <div className="field field--checkbox admin-editor__checkbox">
              <input id="pa-active" type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              <label htmlFor="pa-active">Active (shown on the website)</label>
            </div>
          </div>
          <div className="chat-msg__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save practice area'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      {list.error && <Notice message={list.error} kind="error" />}
      {list.loading && !list.data && <p role="status">Loading practice areas…</p>}
      {list.data && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Practice areas table">
          <table className="admin-table">
            <caption className="visually-hidden">Practice areas in display order</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Name</th>
                <th scope="col">Slug</th>
                <th scope="col">Summary</th>
                <th scope="col">Active</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((p) => (
                <tr key={p.id}>
                  <td>{p.sortOrder}</td>
                  <th scope="row">{p.name}</th>
                  <td><code>{p.slug}</code></td>
                  <td className="admin-table__message">{p.summary}</td>
                  <td>{p.active ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingId(p.id); setSlugTouched(true); setForm(toInput(p)); }}>
                      Edit<span className="visually-hidden"> {p.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApi } from '../../api/adminClient';
import type { Review, ReviewInput } from '../../api/types';
import { StarRating } from '../../components/StarRating';
import { errorMessage, Notice, useLoader } from './shared';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: ReviewInput = { authorName: '', rating: 5, content: '', practiceAreaSlug: '', reviewDate: today(), published: true };

function toInput(r: Review): ReviewInput {
  return {
    authorName: r.authorName,
    rating: r.rating,
    content: r.content,
    practiceAreaSlug: r.practiceAreaSlug ?? '',
    reviewDate: r.reviewDate,
    published: r.published,
  };
}

export default function AdminReviewsPage() {
  const reviews = useLoader(() => adminApi.reviews(), []);
  const areas = useLoader(() => adminApi.practiceAreas(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReviewInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>({ message: '', kind: 'success' });
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (form) formHeadingRef.current?.focus();
  }, [editingId, form === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ReviewInput>(k: K, v: ReviewInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.authorName.trim() || !form.content.trim()) {
      setNotice({ message: 'Author name and review text are required.', kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.saveReview(editingId, { ...form, practiceAreaSlug: form.practiceAreaSlug || undefined });
      setNotice({ message: editingId ? 'Review updated.' : 'Review added.', kind: 'success' });
      setForm(null);
      setEditingId(null);
      reviews.reload();
    } catch (err) {
      setNotice({ message: errorMessage(err), kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="reviews-heading">
      <div className="admin-title-row">
        <h1 id="reviews-heading">Reviews</h1>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => { setEditingId(null); setForm({ ...EMPTY, reviewDate: today() }); }}>
          Add review
        </button>
      </div>
      <Notice {...notice} />

      {form && (
        <form className="lead-form admin-editor" onSubmit={onSubmit} noValidate aria-labelledby="review-form-heading">
          <h2 id="review-form-heading" ref={formHeadingRef} tabIndex={-1} className="lead-form__heading">
            {editingId ? 'Edit review' : 'New review'}
          </h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="rv-author">Author name *</label>
              <input id="rv-author" maxLength={120} value={form.authorName} onChange={(e) => set('authorName', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="rv-rating">Rating *</label>
              <select id="rv-rating" value={form.rating} onChange={(e) => set('rating', Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rv-content">Review text *</label>
            <textarea id="rv-content" rows={4} maxLength={4000} value={form.content} onChange={(e) => set('content', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="rv-area">Practice area</label>
              <select id="rv-area" value={form.practiceAreaSlug ?? ''} onChange={(e) => set('practiceAreaSlug', e.target.value)}>
                <option value="">None</option>
                {areas.data?.map((a) => (
                  <option key={a.slug} value={a.slug}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rv-date">Review date *</label>
              <input id="rv-date" type="date" max={today()} value={form.reviewDate} onChange={(e) => set('reviewDate', e.target.value)} />
            </div>
          </div>
          <div className="field field--checkbox">
            <input id="rv-published" type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            <label htmlFor="rv-published">Published (visible on the website)</label>
          </div>
          <div className="chat-msg__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      {reviews.error && <Notice message={reviews.error} kind="error" />}
      {reviews.loading && !reviews.data && <p role="status">Loading reviews…</p>}
      {reviews.data && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Reviews table">
          <table className="admin-table">
            <caption className="visually-hidden">All reviews, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Author</th>
                <th scope="col">Rating</th>
                <th scope="col">Review</th>
                <th scope="col">Area</th>
                <th scope="col">Visible</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {reviews.data.map((r) => (
                <tr key={r.id}>
                  <td>{r.reviewDate}</td>
                  <th scope="row">{r.authorName}</th>
                  <td><StarRating rating={r.rating} /></td>
                  <td className="admin-table__message">{r.content}</td>
                  <td>{r.practiceAreaName ?? '—'}</td>
                  <td>{r.published ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingId(r.id); setForm(toInput(r)); }}>
                      Edit<span className="visually-hidden"> review by {r.authorName}</span>
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

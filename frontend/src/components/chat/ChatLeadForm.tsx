import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { firm } from '../../content/firm';
import { validateLead, type LeadFormValues } from '../LeadForm';

interface ChatLeadFormProps {
  /** The visitor's last question, saved with the lead so staff have context. */
  question: string;
  onSent: () => void;
  onCancel: () => void;
}

type Fields = Pick<LeadFormValues, 'fullName' | 'email' | 'phone' | 'consent' | 'website'>;

/**
 * Collects name, email and phone inside the chat. Nothing is sent unless the consent box is checked.
 */
export function ChatLeadForm({ question, onSent, onCancel }: ChatLeadFormProps) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [values, setValues] = useState<Fields>({ fullName: '', email: '', phone: '', consent: false, website: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => nameRef.current?.focus(), []);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateLead({ ...values, practiceAreaSlug: '', message: '' }, false);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = (['fullName', 'email', 'phone', 'consent'] as const).find((f) => errs[f]);
      if (first) document.getElementById(id(first))?.focus();
      return;
    }
    setSending(true);
    setServerError('');
    try {
      await api.createLead({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        message: question ? `Chat question: ${question}`.slice(0, 2000) : undefined,
        source: 'CHATBOT',
        consent: values.consent,
        website: values.website,
      });
      onSent();
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 429
          ? 'Too many requests. Please wait a minute and try again.'
          : `Sorry, we couldn’t send your details. Please call ${firm.phoneDisplay}.`,
      );
    } finally {
      setSending(false);
    }
  }

  const err = (f: keyof Fields) =>
    errors[f] ? (
      <p className="field__error" id={id(`${f}-error`)}>
        {errors[f]}
      </p>
    ) : null;

  return (
    <form className="chat-lead" onSubmit={onSubmit} noValidate aria-labelledby={id('title')}>
      <h3 id={id('title')} className="chat-lead__title">
        Leave your details
      </h3>
      <div className="field">
        <label htmlFor={id('fullName')}>Name *</label>
        <input
          ref={nameRef}
          id={id('fullName')}
          autoComplete="name"
          maxLength={120}
          value={values.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? id('fullName-error') : undefined}
        />
        {err('fullName')}
      </div>
      <div className="field">
        <label htmlFor={id('email')}>Email *</label>
        <input
          id={id('email')}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? id('email-error') : undefined}
        />
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor={id('phone')}>Phone</label>
        <input
          id={id('phone')}
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? id('phone-error') : undefined}
        />
        {err('phone')}
      </div>
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={id('website')}>Website</label>
        <input id={id('website')} tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div className="field field--checkbox">
        <input
          id={id('consent')}
          type="checkbox"
          checked={values.consent}
          onChange={(e) => set('consent', e.target.checked)}
          aria-invalid={Boolean(errors.consent)}
          aria-describedby={errors.consent ? id('consent-error') : undefined}
        />
        <label htmlFor={id('consent')}>
          I agree that {firm.name} may contact me about my question. <Link to="/privacy">Privacy policy</Link>. *
        </label>
        {err('consent')}
      </div>
      {serverError && (
        <p className="alert alert--error" role="alert">
          {serverError}
        </p>
      )}
      <div className="chat-msg__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={sending}>
          {sending ? 'Sending…' : 'Send my details'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

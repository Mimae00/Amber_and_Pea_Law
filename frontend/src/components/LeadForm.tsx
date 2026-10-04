import { useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { LeadSource } from '../api/types';
import { useApi } from '../hooks/useApi';
import { firm } from '../content/firm';

export interface LeadFormValues {
  fullName: string;
  email: string;
  phone: string;
  practiceAreaSlug: string;
  message: string;
  consent: boolean;
  website: string;
}

type FieldErrors = Partial<Record<keyof LeadFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,40}$/;

/** Client-side validation that mirrors the API rules. */
export function validateLead(values: LeadFormValues, requireMessage: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.fullName.trim();
  if (!name) errors.fullName = 'Please enter your name.';
  else if (name.length > 120) errors.fullName = 'Name must be 120 characters or fewer.';
  const email = values.email.trim();
  if (!email) errors.email = 'Please enter your email.';
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Please enter a valid email address.';
  if (values.phone.trim() && !PHONE_RE.test(values.phone.trim())) errors.phone = 'Please enter a valid phone number.';
  if (requireMessage && !values.message.trim()) errors.message = 'Please tell us briefly how we can help.';
  else if (values.message.length > 2000) errors.message = 'Message must be 2000 characters or fewer.';
  if (!values.consent) errors.consent = 'Please confirm we may contact you.';
  return errors;
}

const EMPTY: LeadFormValues = {
  fullName: '',
  email: '',
  phone: '',
  practiceAreaSlug: '',
  message: '',
  consent: false,
  website: '',
};

const FIELD_ORDER: Array<keyof LeadFormValues> = ['fullName', 'email', 'phone', 'practiceAreaSlug', 'message', 'consent'];

interface LeadFormProps {
  source: Exclude<LeadSource, 'CHATBOT'>;
  heading: string;
  submitLabel?: string;
  /** Compact layout for the home hero: shorter message box. */
  compact?: boolean;
  requireMessage?: boolean;
  defaultPracticeArea?: string;
}

export function LeadForm({
  source,
  heading,
  submitLabel = 'Request free consultation',
  compact = false,
  requireMessage = false,
  defaultPracticeArea = '',
}: LeadFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [values, setValues] = useState<LeadFormValues>({ ...EMPTY, practiceAreaSlug: defaultPracticeArea });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const areas = useApi(() => api.practiceAreas(), []);

  const set = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const focusFirstError = (errs: FieldErrors) => {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(first))}`)?.focus();
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validateLead(values, requireMessage);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }
    setSubmitState('submitting');
    setServerMessage('');
    try {
      await api.createLead({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        message: values.message.trim() || undefined,
        practiceAreaSlug: values.practiceAreaSlug || undefined,
        source,
        consent: values.consent,
        website: values.website,
      });
      setSubmitState('success');
      setValues(EMPTY);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setSubmitState('error');
      if (err instanceof ApiError && err.status === 400 && err.problem?.errors) {
        const serverErrors = err.problem.errors as FieldErrors;
        setErrors(serverErrors);
        focusFirstError(serverErrors);
        setServerMessage('Please check the highlighted fields.');
      } else if (err instanceof ApiError && err.status === 429) {
        setServerMessage('You’ve sent several requests in a short time. Please wait a minute and try again.');
      } else {
        setServerMessage(`Sorry, we couldn’t send your request. Please try again or call ${firm.phoneDisplay}.`);
      }
    }
  }

  if (submitState === 'success') {
    return (
      <div className="lead-form lead-form--success" ref={successRef} tabIndex={-1} role="status" aria-live="polite">
        <h2 className="lead-form__heading">Thank you</h2>
        <p>We received your request. A member of our team will contact you within one business day.</p>
        <p>
          Prefer to pick a time now? <Link to="/book">Book a consultation</Link>.
        </p>
        <button type="button" className="btn btn--secondary" onClick={() => setSubmitState('idle')}>
          Send another request
        </button>
      </div>
    );
  }

  const describedBy = (field: keyof LeadFormValues, hint?: string) =>
    [errors[field] ? id(`${field}-error`) : null, hint ?? null].filter(Boolean).join(' ') || undefined;

  const fieldError = (field: keyof LeadFormValues) =>
    errors[field] ? (
      <p className="field__error" id={id(`${field}-error`)}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <form ref={formRef} className={compact ? 'lead-form lead-form--compact' : 'lead-form'} onSubmit={onSubmit} noValidate aria-labelledby={id('heading')}>
      <h2 className="lead-form__heading" id={id('heading')}>
        {heading}
      </h2>
      <p className="lead-form__note">
        Fields marked <span aria-hidden="true">*</span>
        <span className="visually-hidden">with an asterisk</span> are required.
      </p>

      <div className="field">
        <label htmlFor={id('fullName')}>
          Full name <span aria-hidden="true">*</span>
        </label>
        <input
          id={id('fullName')}
          name="fullName"
          autoComplete="name"
          required
          maxLength={120}
          value={values.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy('fullName')}
        />
        {fieldError('fullName')}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={id('email')}>
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            id={id('email')}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('email')}
          />
          {fieldError('email')}
        </div>
        <div className="field">
          <label htmlFor={id('phone')}>Phone</label>
          <input
            id={id('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy('phone')}
          />
          {fieldError('phone')}
        </div>
      </div>

      <div className="field">
        <label htmlFor={id('practiceAreaSlug')}>Type of matter</label>
        <select
          id={id('practiceAreaSlug')}
          name="practiceAreaSlug"
          value={values.practiceAreaSlug}
          onChange={(e) => set('practiceAreaSlug', e.target.value)}
        >
          <option value="">Not sure / other</option>
          {areas.status === 'success' &&
            areas.data.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={id('message')}>
          How can we help?{requireMessage && <span aria-hidden="true"> *</span>}
        </label>
        <textarea
          id={id('message')}
          name="message"
          rows={compact ? 2 : 5}
          maxLength={2000}
          required={requireMessage}
          value={values.message}
          onChange={(e) => set('message', e.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy('message', id('message-hint'))}
        />
        <p className="field__hint" id={id('message-hint')}>
          Please don’t include confidential details. Sending this form doesn’t create an attorney–client relationship.
        </p>
        {fieldError('message')}
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={id('website')}>Website</label>
        <input
          id={id('website')}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      <div className="field field--checkbox">
        <input
          id={id('consent')}
          name="consent"
          type="checkbox"
          checked={values.consent}
          onChange={(e) => set('consent', e.target.checked)}
          aria-invalid={Boolean(errors.consent)}
          aria-describedby={describedBy('consent')}
        />
        <label htmlFor={id('consent')}>
          I agree that {firm.name} may contact me about my inquiry. See our <Link to="/privacy">privacy policy</Link>.{' '}
          <span aria-hidden="true">*</span>
        </label>
        {fieldError('consent')}
      </div>

      {serverMessage && (
        <p className="alert alert--error" role="alert">
          {serverMessage}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitState === 'submitting'}>
        {submitState === 'submitting' ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}

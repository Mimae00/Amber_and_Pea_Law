import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { BookingConfirmation, Slot } from '../api/types';
import { AsyncContent } from '../components/AsyncContent';
import { validateLead, type LeadFormValues } from '../components/LeadForm';
import { SlotPicker } from '../components/booking/SlotPicker';
import { Seo } from '../components/Seo';
import { firm } from '../content/firm';
import { useApi } from '../hooks/useApi';
import { formatDateTime } from '../lib/datetime';

type Errors = Partial<Record<keyof LeadFormValues | 'slot', string>>;

const EMPTY: LeadFormValues = { fullName: '', email: '', phone: '', practiceAreaSlug: '', message: '', consent: false, website: '' };

function Confirmation({ booking, onAnother }: { booking: BookingConfirmation; onAnother: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="card confirmation" ref={ref} tabIndex={-1} aria-labelledby="confirm-heading">
      <h2 id="confirm-heading">Your consultation is booked</h2>
      <p className="confirmation__when">{formatDateTime(booking.startAt, booking.timezone)}</p>
      <dl className="confirmation__details">
        <div>
          <dt>Reference</dt>
          <dd>{booking.reference}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>
            {firm.address.street}, {firm.address.city}. We can also meet by phone or video; just let us know.
          </dd>
        </div>
      </dl>
      <p>
        We’ll contact you before the appointment to confirm. Need to change it? Call{' '}
        <a href={firm.phoneHref}>{firm.phoneDisplay}</a>.
      </p>
      <p className="fine-print">Booking a consultation does not create an attorney–client relationship.</p>
      <div className="hero__actions">
        <Link to="/" className="btn btn--secondary">
          Back to home
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onAnother}>
          Book another time
        </button>
      </div>
    </div>
  );
}

export default function BookPage() {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const config = useApi(() => api.bookingConfig(), []);
  const areas = useApi(() => api.practiceAreas(), []);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [values, setValues] = useState<LeadFormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof LeadFormValues>(k: K, v: LeadFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const focusFirst = (errs: Errors) => {
    const order: Array<keyof Errors> = ['slot', 'fullName', 'email', 'phone', 'message', 'consent'];
    const first = order.find((f) => errs[f]);
    if (!first) return;
    const target = first === 'slot' ? formRef.current?.querySelector<HTMLElement>('.slot-picker input') : document.getElementById(id(first));
    target?.focus();
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = validateLead(values, false);
    if (!slot) errs.slot = 'Please choose a date and time.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    setSubmitting(true);
    setServerMessage('');
    try {
      const res = await api.createBooking({
        startAt: slot!.startAt,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        message: values.message.trim() || undefined,
        practiceAreaSlug: values.practiceAreaSlug || undefined,
        consent: values.consent,
        website: values.website,
      });
      setConfirmation(res);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSlot(null);
        setReloadKey((k) => k + 1);
        setServerMessage('Sorry, that time was just booked by someone else. Please choose another time.');
      } else if (err instanceof ApiError && err.status === 400 && err.problem?.errors) {
        const se = err.problem.errors as Errors;
        setErrors(se);
        focusFirst(se);
        setServerMessage('Please check the highlighted fields.');
      } else if (err instanceof ApiError && err.status === 400) {
        setSlot(null);
        setReloadKey((k) => k + 1);
        setServerMessage(err.message);
      } else if (err instanceof ApiError && err.status === 429) {
        setServerMessage('Too many requests. Please wait a minute and try again.');
      } else {
        setServerMessage(`Sorry, we couldn’t complete your booking. Please try again or call ${firm.phoneDisplay}.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const err = (f: keyof Errors) =>
    errors[f] ? (
      <p className="field__error" id={id(`${f}-error`)}>
        {errors[f]}
      </p>
    ) : null;
  const described = (f: keyof Errors) => (errors[f] ? id(`${f}-error`) : undefined);

  return (
    <>
      <Seo title="Book a Consultation" description="Pick a date and time for a free 30-minute consultation with Amber & Pea Law (sample site)." />
      <div className="page-header">
        <div className="container">
          <h1>Book a free consultation</h1>
          <p className="page-header__lead">
            Choose a time that suits you. Prefer to talk first? Call <a href={firm.phoneHref}>{firm.phoneDisplay}</a>.
          </p>
        </div>
      </div>
      <div className="container section">
        {confirmation ? (
          <Confirmation
            booking={confirmation}
            onAnother={() => {
              setConfirmation(null);
              setSlot(null);
              setDate(null);
              setValues(EMPTY);
              setReloadKey((k) => k + 1);
            }}
          />
        ) : (
          <AsyncContent state={config} loadingLabel="Loading booking calendar…">
            {(cfg) => (
              <form ref={formRef} className="booking-form" onSubmit={onSubmit} noValidate aria-label="Book a consultation">
                <div className="booking-form__picker">
                  <SlotPicker
                    config={cfg}
                    date={date}
                    slot={slot}
                    reloadKey={reloadKey}
                    onDateChange={(d) => {
                      setDate(d);
                      setSlot(null);
                    }}
                    onSlotChange={(s) => {
                      setSlot(s);
                      setErrors((e) => ({ ...e, slot: undefined }));
                    }}
                  />
                  {err('slot')}
                </div>

                <fieldset className="lead-form booking-form__details">
                  <legend className="lead-form__heading">3. Your details</legend>
                  {slot && (
                    <p className="selected-slot" aria-live="polite">
                      Selected: <strong>{formatDateTime(slot.startAt, cfg.timezone)}</strong>
                    </p>
                  )}
                  <div className="field">
                    <label htmlFor={id('fullName')}>Full name *</label>
                    <input id={id('fullName')} autoComplete="name" maxLength={120} value={values.fullName}
                      onChange={(e) => set('fullName', e.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={described('fullName')} />
                    {err('fullName')}
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={id('email')}>Email *</label>
                      <input id={id('email')} type="email" autoComplete="email" maxLength={254} value={values.email}
                        onChange={(e) => set('email', e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={described('email')} />
                      {err('email')}
                    </div>
                    <div className="field">
                      <label htmlFor={id('phone')}>Phone</label>
                      <input id={id('phone')} type="tel" autoComplete="tel" maxLength={40} value={values.phone}
                        onChange={(e) => set('phone', e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={described('phone')} />
                      {err('phone')}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor={id('practiceAreaSlug')}>Type of matter</label>
                    <select id={id('practiceAreaSlug')} value={values.practiceAreaSlug} onChange={(e) => set('practiceAreaSlug', e.target.value)}>
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
                    <label htmlFor={id('message')}>Anything we should know?</label>
                    <textarea id={id('message')} rows={3} maxLength={2000} value={values.message}
                      onChange={(e) => set('message', e.target.value)} aria-invalid={Boolean(errors.message)}
                      aria-describedby={[described('message'), id('message-hint')].filter(Boolean).join(' ')} />
                    <p className="field__hint" id={id('message-hint')}>Please don’t include confidential details.</p>
                    {err('message')}
                  </div>
                  <div className="hp-field" aria-hidden="true">
                    <label htmlFor={id('website')}>Website</label>
                    <input id={id('website')} tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
                  </div>
                  <div className="field field--checkbox">
                    <input id={id('consent')} type="checkbox" checked={values.consent} onChange={(e) => set('consent', e.target.checked)}
                      aria-invalid={Boolean(errors.consent)} aria-describedby={described('consent')} />
                    <label htmlFor={id('consent')}>
                      I agree that {firm.name} may contact me about this consultation. See our <Link to="/privacy">privacy policy</Link>. *
                    </label>
                    {err('consent')}
                  </div>
                  {serverMessage && (
                    <p className="alert alert--error" role="alert">
                      {serverMessage}
                    </p>
                  )}
                  <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
                    {submitting ? 'Booking…' : 'Confirm booking'}
                  </button>
                </fieldset>
              </form>
            )}
          </AsyncContent>
        )}
      </div>
    </>
  );
}

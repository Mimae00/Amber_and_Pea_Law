import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminClient';
import { ApiError } from '../../api/client';
import { Seo } from '../../components/Seo';
import { firm } from '../../content/firm';
import { useAdminSession } from '../../hooks/useAdminSession';

export default function AdminLoginPage() {
  const session = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/leads';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminApi.login(email.trim(), password);
      navigate(from.startsWith('/admin') ? from : '/admin/leads', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password.'
          : err instanceof ApiError && err.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : 'Sign-in is unavailable right now. Please try again later.',
      );
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="admin-login">
      <Seo title="Admin sign in" description="Admin sign in" noIndex />
      <form className="lead-form admin-login__form" onSubmit={onSubmit} noValidate aria-labelledby="login-heading">
        <h1 id="login-heading" className="lead-form__heading">
          {firm.name} admin
        </h1>
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

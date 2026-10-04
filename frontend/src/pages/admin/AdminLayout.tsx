import { Suspense } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminClient';
import { Seo } from '../../components/Seo';
import { firm } from '../../content/firm';
import { useAdminSession } from '../../hooks/useAdminSession';

const NAV = [
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/practice-areas', label: 'Practice areas' },
];

/** Admin shell. Redirects to the login page when there is no valid session. */
export default function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  const navigate = useNavigate();

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="admin">
      <Seo title="Admin" description="Admin dashboard" noIndex />
      <a href="#admin-main" className="skip-link">
        Skip to main content
      </a>
      <header className="admin-header">
        <div className="container admin-header__inner">
          <Link to="/admin/leads" className="brand">
            <span className="brand__mark" aria-hidden="true">
              A&amp;P
            </span>
            <span className="brand__name">{firm.name} admin</span>
          </Link>
          <nav aria-label="Admin">
            <ul className="admin-nav">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to}>{n.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="admin-header__user">
            <span>{session.displayName}</span>
            <Link to="/" className="btn btn--ghost btn--sm">
              View site
            </Link>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                adminApi.logout();
                navigate('/admin/login', { replace: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="admin-main" className="container admin-main" tabIndex={-1}>
        <Suspense fallback={<p role="status">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

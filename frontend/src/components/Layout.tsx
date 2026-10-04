import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { firm } from '../content/firm';
import { ChatWidget } from './chat/ChatWidget';

const NAV = [
  { to: '/practice-areas', label: 'Practice Areas' },
  { to: '/attorneys', label: 'Attorneys' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' },
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      {/* Inside <header> so it sits in a landmark (axe "region" rule). */}
      <p className="sample-banner">Sample site: {firm.name} is fictional. Not legal advice.</p>
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label={`${firm.name} home`}>
          <span className="brand__mark" aria-hidden="true">
            A&amp;P
          </span>
          <span className="brand__name">{firm.name}</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <nav id="primary-nav" className={open ? 'primary-nav primary-nav--open' : 'primary-nav'} aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
          <div className="primary-nav__actions">
            <a href={firm.phoneHref} className="btn btn--ghost">
              <span aria-hidden="true">☎ </span>
              {firm.phoneDisplay}
            </a>
            <Link to="/book" className="btn btn--primary">
              Book a consultation
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <p className="site-footer__brand">{firm.name}</p>
          <address>
            {firm.address.street}
            <br />
            {firm.address.city}, {firm.address.region} {firm.address.postalCode}
            <br />
            <a href={firm.phoneHref}>{firm.phoneDisplay}</a>
          </address>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li>
              <Link to="/practice-areas">Practice Areas</Link>
            </li>
            <li>
              <Link to="/attorneys">Attorneys</Link>
            </li>
            <li>
              <Link to="/book">Book a Consultation</Link>
            </li>
            <li>
              <Link to="/disclaimer">Disclaimer</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </nav>
        <div className="site-footer__legal">
          <p>
            <strong>{firm.disclaimer}</strong>
          </p>
          <p>
            This website provides general information, not legal advice. Contacting us does not create an attorney–client
            relationship.
          </p>
          <p>
            Sample content: {firm.name} is a fictional firm created for a portfolio project. © {year}
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Moves focus to <main> after client-side navigation so screen reader users land on the new page. */
function useRouteFocus() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  return mainRef;
}

export function Layout() {
  const mainRef = useRouteFocus();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Suspense
          fallback={
            <p className="container status-message" role="status">
              Loading…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}

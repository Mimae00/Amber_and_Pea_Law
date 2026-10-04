import { lazy } from 'react';
import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

// Home is eagerly loaded for a fast first paint; other pages are split into their own chunks.
const PracticeAreasPage = lazy(() => import('./pages/PracticeAreasPage'));
const PracticeAreaDetailPage = lazy(() => import('./pages/PracticeAreaDetailPage'));
const AttorneysPage = lazy(() => import('./pages/AttorneysPage'));
const AttorneyDetailPage = lazy(() => import('./pages/AttorneyDetailPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const BookPage = lazy(() => import('./pages/BookPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Admin is its own set of chunks; public visitors never download it.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLeadsPage = lazy(() => import('./pages/admin/AdminLeadsPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminPracticeAreasPage = lazy(() => import('./pages/admin/AdminPracticeAreasPage'));

const adminFallback = <p className="container status-message" role="status">Loading…</p>;

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="practice-areas" element={<PracticeAreasPage />} />
          <Route path="practice-areas/:slug" element={<PracticeAreaDetailPage />} />
          <Route path="attorneys" element={<AttorneysPage />} />
          <Route path="attorneys/:slug" element={<AttorneyDetailPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="book" element={<BookPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="disclaimer" element={<DisclaimerPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin/login" element={<Suspense fallback={adminFallback}><AdminLoginPage /></Suspense>} />
        <Route path="admin" element={<Suspense fallback={adminFallback}><AdminLayout /></Suspense>}>
          <Route index element={<Navigate to="leads" replace />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="practice-areas" element={<AdminPracticeAreasPage />} />
          <Route path="*" element={<Navigate to="leads" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

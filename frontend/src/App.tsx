import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
      </Routes>
    </BrowserRouter>
  );
}

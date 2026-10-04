import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { AttorneyAvatar } from '../components/AttorneyAvatar';
import { Seo } from '../components/Seo';
import { useApi } from '../hooks/useApi';
import NotFoundPage from './NotFoundPage';

export default function AttorneyDetailPage() {
  const { slug = '' } = useParams();
  const attorney = useApi(() => api.attorney(slug), [slug]);

  return (
    <AsyncContent state={attorney} loadingLabel="Loading profile…" notFound={<NotFoundPage />}>
      {(a) => (
        <>
          <Seo title={`${a.fullName}, ${a.title}`} description={a.shortBio} />
          <div className="page-header">
            <div className="container">
              <nav aria-label="Breadcrumb" className="breadcrumb">
                <ol>
                  <li>
                    <Link to="/">Home</Link>
                  </li>
                  <li>
                    <Link to="/attorneys">Attorneys</Link>
                  </li>
                  <li aria-current="page">{a.fullName}</li>
                </ol>
              </nav>
              <div className="profile-header">
                <AttorneyAvatar name={a.fullName} photoUrl={a.photoUrl} size={120} />
                <div>
                  <h1>{a.fullName}</h1>
                  <p className="page-header__lead">{a.title}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="container section two-col">
            <div className="prose">
              <h2>About</h2>
              <p>{a.bio}</p>
              {a.education && (
                <>
                  <h2>Education</h2>
                  <p>{a.education}</p>
                </>
              )}
              {a.barAdmissions && (
                <>
                  <h2>Bar admissions</h2>
                  <p>{a.barAdmissions}</p>
                </>
              )}
            </div>
            <aside className="card" aria-labelledby="areas-heading">
              <h2 id="areas-heading">Practice areas</h2>
              <ul className="link-list">
                {a.practiceAreas.map((p) => (
                  <li key={p.slug}>
                    <Link to={`/practice-areas/${p.slug}`}>{p.name}</Link>
                  </li>
                ))}
              </ul>
              <Link to="/book" className="btn btn--primary btn--block">
                Book a consultation
              </Link>
            </aside>
          </div>
        </>
      )}
    </AsyncContent>
  );
}

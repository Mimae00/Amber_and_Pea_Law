import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { AttorneyAvatar } from '../components/AttorneyAvatar';
import { Seo } from '../components/Seo';
import { useApi } from '../hooks/useApi';

export default function AttorneysPage() {
  const attorneys = useApi(() => api.attorneys(), []);
  return (
    <>
      <Seo
        title="Attorneys"
        description="Meet the (fictional) attorneys of Amber & Pea Law: personal injury and family law lawyers. Sample profiles."
      />
      <div className="page-header">
        <div className="container">
          <h1>Our attorneys</h1>
          <p className="page-header__lead">Sample profiles. These attorneys are fictional.</p>
        </div>
      </div>
      <div className="container section">
        <AsyncContent state={attorneys} loadingLabel="Loading attorneys…">
          {(data) => (
            <ul className="grid grid--3 attorney-grid">
              {data.map((a) => (
                <li key={a.slug} className="card attorney-card">
                  <AttorneyAvatar name={a.fullName} photoUrl={a.photoUrl} />
                  <h2 className="attorney-card__name">
                    <Link to={`/attorneys/${a.slug}`} className="card-link">
                      {a.fullName}
                    </Link>
                  </h2>
                  <p className="attorney-card__title">{a.title}</p>
                  <p>{a.shortBio}</p>
                  <ul className="tag-list" aria-label={`${a.fullName}'s practice areas`}>
                    {a.practiceAreas.map((p) => (
                      <li key={p.slug} className="tag">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

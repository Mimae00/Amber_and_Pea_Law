import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { AttorneyAvatar } from '../components/AttorneyAvatar';
import { LeadForm } from '../components/LeadForm';
import { Seo } from '../components/Seo';
import { firm } from '../content/firm';
import { useApi } from '../hooks/useApi';
import NotFoundPage from './NotFoundPage';

export default function PracticeAreaDetailPage() {
  const { slug = '' } = useParams();
  const area = useApi(() => api.practiceArea(slug), [slug]);
  const attorneys = useApi(() => api.attorneys(), []);

  return (
    <AsyncContent state={area} loadingLabel="Loading practice area…" notFound={<NotFoundPage />}>
      {(a) => {
        const team =
          attorneys.status === 'success'
            ? attorneys.data.filter((at) => at.practiceAreas.some((p) => p.slug === a.slug))
            : [];
        return (
          <>
            <Seo title={a.name} description={a.summary} />
            <div className="page-header">
              <div className="container">
                <nav aria-label="Breadcrumb" className="breadcrumb">
                  <ol>
                    <li>
                      <Link to="/">Home</Link>
                    </li>
                    <li>
                      <Link to="/practice-areas">Practice areas</Link>
                    </li>
                    <li aria-current="page">{a.name}</li>
                  </ol>
                </nav>
                <h1>{a.name}</h1>
                <p className="page-header__lead">{a.summary}</p>
              </div>
            </div>
            <div className="container section two-col">
              <div className="prose">
                <p>{a.description}</p>
                <h2>What to expect</h2>
                <ol>
                  <li>A free consultation to understand what happened and what you want to achieve.</li>
                  <li>A plain-language explanation of your options, likely timelines and fees.</li>
                  <li>If you decide to work with us, a written agreement before any work begins.</li>
                </ol>
                <p className="fine-print">{firm.disclaimer}</p>

                {team.length > 0 && (
                  <>
                    <h2>Attorneys in this area</h2>
                    <ul className="team-list">
                      {team.map((at) => (
                        <li key={at.slug}>
                          <AttorneyAvatar name={at.fullName} photoUrl={at.photoUrl} size={56} />
                          <div>
                            <Link to={`/attorneys/${at.slug}`}>{at.fullName}</Link>
                            <p>{at.title}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <aside aria-label="Request a consultation">
                <LeadForm
                  source="CONSULTATION_FORM"
                  heading={`Ask about ${a.name.toLowerCase()}`}
                  defaultPracticeArea={a.slug}
                  key={a.slug}
                />
              </aside>
            </div>
          </>
        );
      }}
    </AsyncContent>
  );
}

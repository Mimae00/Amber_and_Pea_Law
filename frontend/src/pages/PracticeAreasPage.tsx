import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { PracticeAreaCard } from '../components/PracticeAreaCard';
import { Seo } from '../components/Seo';
import { useApi } from '../hooks/useApi';

export default function PracticeAreasPage() {
  const areas = useApi(() => api.practiceAreas(), []);
  return (
    <>
      <Seo
        title="Practice Areas"
        description="Personal injury and family law practice areas at Amber & Pea Law (sample site): car accidents, premises liability, workplace injuries, divorce, custody and child support."
      />
      <div className="page-header">
        <div className="container">
          <h1>Practice areas</h1>
          <p className="page-header__lead">
            We focus on two areas of law so we can know them well: personal injury and family law.
          </p>
        </div>
      </div>
      <div className="container section">
        <AsyncContent state={areas} loadingLabel="Loading practice areas…">
          {(data) => (
            <div className="grid grid--3">
              {data.map((a) => (
                <PracticeAreaCard key={a.slug} area={a} headingLevel={2} />
              ))}
            </div>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

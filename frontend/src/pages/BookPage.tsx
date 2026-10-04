import { Seo } from '../components/Seo';
import { LeadForm } from '../components/LeadForm';
import { firm } from '../content/firm';

/**
 * Phase 2 placeholder. The date and time-slot picker is added in Phase 4;
 * until then visitors can request a consultation and the team follows up.
 */
export default function BookPage() {
  return (
    <>
      <Seo title="Book a Consultation" description="Book a free consultation with Amber & Pea Law (sample site)." />
      <div className="page-header">
        <div className="container">
          <h1>Book a free consultation</h1>
          <p className="page-header__lead">
            Online scheduling is coming soon. For now, send a request or call {firm.phoneDisplay} and we’ll find a time.
          </p>
        </div>
      </div>
      <div className="container section narrow">
        <LeadForm source="CONSULTATION_FORM" heading="Request a consultation time" submitLabel="Send request" />
      </div>
    </>
  );
}

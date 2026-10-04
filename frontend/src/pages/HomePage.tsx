import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { LeadForm } from '../components/LeadForm';
import { PracticeAreaCard } from '../components/PracticeAreaCard';
import { ReviewCard } from '../components/ReviewCard';
import { Seo } from '../components/Seo';
import { firm, whyChooseUs } from '../content/firm';
import { useApi } from '../hooks/useApi';

export function HomePage() {
  const areas = useApi(() => api.practiceAreas(), []);
  const reviews = useApi(() => api.reviews(3), []);

  return (
    <>
      <Seo
        title={firm.name}
        description="Fictional personal injury and family law firm (sample site). Free consultations for car accidents, workplace injuries, divorce, custody and child support."
      />

      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">Personal injury &amp; family law</p>
            <h1 id="hero-heading">Clear answers when life takes a hard turn.</h1>
            <p className="hero__lead">
              Hurt in an accident or facing a family change? Talk to an attorney at {firm.name} for a free,
              no-obligation consultation.
            </p>
            <div className="hero__actions">
              <a href={firm.phoneHref} className="btn btn--primary btn--lg">
                <span aria-hidden="true">☎ </span>Call {firm.phoneDisplay}
              </a>
              <Link to="/book" className="btn btn--secondary btn--lg">
                Pick a consultation time
              </Link>
            </div>
            <ul className="hero__points">
              <li>Free first consultation</li>
              <li>Injury cases typically on contingency</li>
              <li>Replies within one business day</li>
            </ul>
          </div>
          <div className="hero__form">
            <LeadForm source="CONSULTATION_FORM" heading="Request a free consultation" compact />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="areas-heading">
        <div className="container">
          <div className="section__header">
            <h2 id="areas-heading">How we can help</h2>
            <Link to="/practice-areas">All practice areas</Link>
          </div>
          <AsyncContent state={areas} loadingLabel="Loading practice areas…">
            {(data) => (
              <div className="grid grid--3">
                {data.map((a) => (
                  <PracticeAreaCard key={a.slug} area={a} />
                ))}
              </div>
            )}
          </AsyncContent>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="why-heading">
        <div className="container">
          <h2 id="why-heading">Why choose {firm.name}</h2>
          <ul className="grid grid--4 why-list">
            {whyChooseUs.map((item) => (
              <li key={item.title} className="card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="reviews-heading">
        <div className="container">
          <div className="section__header">
            <h2 id="reviews-heading">What clients say</h2>
            <Link to="/reviews">Read all reviews</Link>
          </div>
          <AsyncContent state={reviews} loadingLabel="Loading reviews…">
            {(data) => (
              <div className="grid grid--3">
                {data.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
          </AsyncContent>
          <p className="fine-print">Sample reviews. {firm.disclaimer}</p>
        </div>
      </section>

      <section className="cta" aria-labelledby="cta-heading">
        <div className="container cta__inner">
          <div>
            <h2 id="cta-heading">Ready to talk it through?</h2>
            <p>Book a free 30-minute consultation online, or call us during business hours.</p>
          </div>
          <div className="cta__actions">
            <Link to="/book" className="btn btn--primary btn--lg">
              Book a consultation
            </Link>
            <a href={firm.phoneHref} className="btn btn--ghost-light btn--lg">
              Call {firm.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

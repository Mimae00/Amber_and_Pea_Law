import { LeadForm } from '../components/LeadForm';
import { Seo } from '../components/Seo';
import { firm } from '../content/firm';

export default function ContactPage() {
  const { address } = firm;
  return (
    <>
      <Seo title="Contact" description="Address, phone, office hours and contact form for Amber & Pea Law (sample site)." />
      <div className="page-header">
        <div className="container">
          <h1>Contact us</h1>
          <p className="page-header__lead">Call, visit or send a message. We reply within one business day.</p>
        </div>
      </div>
      <div className="container section two-col">
        <div>
          <section aria-labelledby="office-heading" className="card">
            <h2 id="office-heading">Office</h2>
            <address>
              {firm.name}
              <br />
              {address.street}
              <br />
              {address.city}, {address.region} {address.postalCode}
            </address>
            <p>
              Phone: <a href={firm.phoneHref}>{firm.phoneDisplay}</a>
              <br />
              Email: <a href={`mailto:${firm.email}`}>{firm.email}</a>
            </p>
            <h3>Office hours</h3>
            <dl className="hours">
              {firm.hours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="map-placeholder" role="img" aria-label={`Map placeholder showing ${address.street}, ${address.city}`}>
            <span aria-hidden="true">Map placeholder</span>
          </div>
          <p className="fine-print">Sample address. This office does not exist.</p>
        </div>
        <LeadForm source="CONTACT_FORM" heading="Send us a message" submitLabel="Send message" requireMessage />
      </div>
    </>
  );
}

import { Seo } from '../components/Seo';
import { firm } from '../content/firm';

export default function PrivacyPage() {
  return (
    <>
      <Seo title="Privacy Policy" description="How Amber & Pea Law (sample site) handles the information you share." />
      <div className="page-header">
        <div className="container">
          <h1>Privacy policy</h1>
          <p className="page-header__lead">Sample policy for a fictional firm. Not reviewed by a lawyer.</p>
        </div>
      </div>
      <div className="container section prose narrow">
        <h2>What we collect</h2>
        <p>
          When you submit a form, book a consultation or share details with the chat assistant, we collect the
          information you provide: your name, email, phone number, the type of matter and your message.
        </p>
        <h2>Consent</h2>
        <p>
          We only collect contact details after you tick the consent box. You can ask us to delete your information at any
          time by emailing <a href={`mailto:${firm.email}`}>{firm.email}</a>.
        </p>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to your inquiry and schedule consultations.</li>
          <li>To keep a record of requests so our team can follow up.</li>
        </ul>
        <p>We do not sell your information or use it for unrelated marketing.</p>
        <h2>Chat assistant</h2>
        <p>
          Chat messages are processed to generate answers from our published information. Please don’t share confidential
          or sensitive details in the chat.
        </p>
        <h2>Security</h2>
        <p>
          Information is stored in access-controlled systems. Only authorized staff can view inquiries. No system is
          completely secure, so please avoid sending sensitive documents through the website.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href={`mailto:${firm.email}`}>{firm.email}</a> or{' '}
          <a href={firm.phoneHref}>{firm.phoneDisplay}</a>.
        </p>
      </div>
    </>
  );
}

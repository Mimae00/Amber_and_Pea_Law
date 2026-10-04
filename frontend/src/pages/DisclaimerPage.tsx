import { Seo } from '../components/Seo';
import { firm } from '../content/firm';

export default function DisclaimerPage() {
  return (
    <>
      <Seo title="Disclaimer" description="Attorney advertising disclaimer for Amber & Pea Law (sample site)." />
      <div className="page-header">
        <div className="container">
          <h1>Disclaimer</h1>
        </div>
      </div>
      <div className="container section prose narrow">
        <p className="callout">
          <strong>{firm.disclaimer}</strong>
        </p>
        <h2>Sample site</h2>
        <p>
          {firm.name} is a fictional law firm created for a software portfolio project. The attorneys, reviews,
          address and phone number on this site are invented.
        </p>
        <h2>No legal advice</h2>
        <p>
          The information on this website, including answers from the chat assistant, is general information only. It is
          not legal advice and should not be relied on as such. Laws vary by location and change over time.
        </p>
        <h2>No attorney–client relationship</h2>
        <p>
          Using this website, chatting with the assistant, or sending a form does not create an attorney–client
          relationship. Please do not send confidential information until a written engagement agreement is in place.
        </p>
        <h2>Results</h2>
        <p>
          Every matter is different. Testimonials describe individual experiences and do not guarantee or predict a
          similar outcome in any other matter.
        </p>
      </div>
    </>
  );
}

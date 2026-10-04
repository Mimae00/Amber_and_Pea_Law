import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { firm } from '../content/firm';

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="The page you were looking for could not be found." noIndex />
      <div className="container section narrow">
        <h1>Page not found</h1>
        <p>We couldn’t find that page. It may have moved.</p>
        <p>
          <Link to="/">Go to the home page</Link> or call us at <a href={firm.phoneHref}>{firm.phoneDisplay}</a>.
        </p>
      </div>
    </>
  );
}

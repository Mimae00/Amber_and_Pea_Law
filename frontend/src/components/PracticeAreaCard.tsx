import { Link } from 'react-router-dom';
import type { PracticeArea } from '../api/types';

export function PracticeAreaCard({ area }: { area: PracticeArea }) {
  return (
    <article className="card practice-card">
      <h3 className="practice-card__title">
        <Link to={`/practice-areas/${area.slug}`} className="card-link">
          {area.name}
        </Link>
      </h3>
      <p>{area.summary}</p>
      <span className="practice-card__more" aria-hidden="true">
        Learn more →
      </span>
    </article>
  );
}

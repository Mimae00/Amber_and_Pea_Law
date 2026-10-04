import { Link } from 'react-router-dom';
import type { PracticeArea } from '../api/types';

interface PracticeAreaCardProps {
  area: PracticeArea;
  /** Keep heading levels sequential: h2 directly under a page h1, h3 under a section h2. */
  headingLevel?: 2 | 3;
}

export function PracticeAreaCard({ area, headingLevel = 3 }: PracticeAreaCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="card practice-card">
      <Heading className="practice-card__title">
        <Link to={`/practice-areas/${area.slug}`} className="card-link">
          {area.name}
        </Link>
      </Heading>
      <p>{area.summary}</p>
      <span className="practice-card__more" aria-hidden="true">
        Learn more →
      </span>
    </article>
  );
}

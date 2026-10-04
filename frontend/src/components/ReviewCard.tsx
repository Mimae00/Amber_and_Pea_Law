import type { Review } from '../api/types';
import { StarRating } from './StarRating';

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });

export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="card review-card">
      <StarRating rating={review.rating} />
      <blockquote>
        <p>{review.content}</p>
      </blockquote>
      <figcaption>
        <span className="review-card__author">{review.authorName}</span>
        {review.practiceAreaName && <span className="review-card__meta"> · {review.practiceAreaName}</span>}
        <span className="review-card__meta">
          {' · '}
          <time dateTime={review.reviewDate}>{dateFormat.format(new Date(review.reviewDate))}</time>
        </span>
      </figcaption>
    </figure>
  );
}

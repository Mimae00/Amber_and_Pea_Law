interface StarRatingProps {
  rating: number;
  max?: number;
}

/**
 * Read-only star rating. Screen readers hear "Rated 4 out of 5"; the stars are decorative.
 */
export function StarRating({ rating, max = 5 }: StarRatingProps) {
  const value = Math.max(0, Math.min(max, Math.round(rating)));
  return (
    <span className="stars" role="img" aria-label={`Rated ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 20 20"
          width="18"
          height="18"
          className={i < value ? 'star star--filled' : 'star'}
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

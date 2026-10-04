import { api } from '../api/client';
import { AsyncContent } from '../components/AsyncContent';
import { ReviewCard } from '../components/ReviewCard';
import { Seo } from '../components/Seo';
import { StarRating } from '../components/StarRating';
import { firm } from '../content/firm';
import { useApi } from '../hooks/useApi';

export default function ReviewsPage() {
  const reviews = useApi(() => api.reviews(100), []);
  return (
    <>
      <Seo title="Client Reviews" description="Sample client testimonials and star ratings for Amber & Pea Law, a fictional firm." />
      <div className="page-header">
        <div className="container">
          <h1>Client reviews</h1>
          <p className="page-header__lead">Sample testimonials. {firm.disclaimer}</p>
        </div>
      </div>
      <div className="container section">
        <AsyncContent state={reviews} loadingLabel="Loading reviews…">
          {(data) => {
            if (data.length === 0) return <p>No reviews yet.</p>;
            const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
            return (
              <>
                <p className="reviews-summary">
                  <StarRating rating={avg} />
                  <span>
                    Average {avg.toFixed(1)} out of 5 from {data.length} sample reviews
                  </span>
                </p>
                <div className="grid grid--2">
                  {data.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </>
            );
          }}
        </AsyncContent>
      </div>
    </>
  );
}

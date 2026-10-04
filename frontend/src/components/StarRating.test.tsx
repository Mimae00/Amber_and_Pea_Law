import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('exposes the rating as an accessible image label', () => {
    render(<StarRating rating={4} />);
    expect(screen.getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument();
  });

  it('fills the right number of stars and hides them from assistive tech', () => {
    const { container } = render(<StarRating rating={3} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
    expect(container.querySelectorAll('.star--filled')).toHaveLength(3);
    stars.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
  });

  it('rounds and clamps out-of-range values', () => {
    render(
      <>
        <StarRating rating={4.6} />
        <StarRating rating={9} />
        <StarRating rating={-2} />
      </>,
    );
    expect(screen.getAllByRole('img', { name: 'Rated 5 out of 5' })).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Rated 0 out of 5' })).toBeInTheDocument();
  });
});

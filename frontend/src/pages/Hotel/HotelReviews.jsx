// Guest reviews for the partner's hotels, in the dashboard's review-card style.
import { useMemo } from 'react';
import { usePartnerReviews } from '@/store/hotel/hooks.js';
import { useHotelState } from '@/store/hotel/useHotelState.js';
import HotelPage, { EmptyState, LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { fmtDate } from '@/components/hotel/hotelKit.jsx';

export default function HotelReviews() {
  const [rating, setRating] = useHotelState(0);
  const [hotel, setHotel] = useHotelState('');
  const { data: reviews, summary, loading, error, reload } = usePartnerReviews();

  const hotels = useMemo(() => [...new Set((reviews ?? []).map((r) => r.hotelName))], [reviews]);
  const visible = useMemo(
    () => (reviews ?? []).filter((r) => (!rating || r.rating === rating) && (!hotel || r.hotelName === hotel)),
    [reviews, rating, hotel],
  );

  return (
    <HotelPage title="Reviews">
      <PageHeader title="Reviews" subtitle="Authentic traveller feedback and verified stay ratings for your properties" />
      <LoadState loading={loading} error={error} onRetry={reload}>
        {reviews && summary.total === 0 ? (
          <EmptyState title="No reviews yet" text="Reviews will be displayed here once guests rate their stay." />
        ) : reviews ? (
          <>
            <section className="hotel-content-card hotel-summary-strip">
              <div><span>Total Reviews</span><strong>{summary.total}</strong></div>
              <div><span>Average Rating</span><strong>{summary.average?.toFixed(1) ?? '—'} ★</strong></div>
              <div><span>5-star Reviews</span><strong>{summary.fiveStar}</strong></div>
            </section>

            <div className="hotel-filters">
              <select aria-label="Filter by property" value={hotel} onChange={(e) => setHotel(e.target.value)}>
                <option value="">All Properties</option>
                {hotels.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select aria-label="Filter by rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                <option value={0}>All ratings</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
              </select>
            </div>

            <div className="hotel-content-card">
              <div className="hotel-review-grid">
                {visible.length === 0 ? <p className="hotel-sub-text">No reviews match these filters.</p> : null}
                {visible.map((r) => (
                  <div key={r.id} className="hotel-review-box">
                    <div className="hotel-review-header">
                      <p className="hotel-cust-name">{r.authorName}</p>
                      <span className="hotel-sub-text">{fmtDate(r.createdAt)}</span>
                    </div>
                    <p className="hotel-sub-text">{r.hotelName}</p>
                    {r.title ? <p><strong>{r.title}</strong></p> : null}
                    <p className="hotel-review-text">{r.comment}</p>
                    <div className="hotel-stars">{'⭐'.repeat(r.rating)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </LoadState>
    </HotelPage>
  );
}

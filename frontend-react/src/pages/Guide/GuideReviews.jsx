import { useMemo } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { listReviews } from '@/services/schedule.api.js';
import { GUIDE_REVIEWS_CSS } from '@/legacy/styles.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import GuideHeader from '@/components/guide/GuideHeader.jsx';
import { ErrorNotice, LoadingState } from '@/components/guide/Feedback.jsx';

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return Array.from({ length: 5 }, (_, i) => {
    if (i < full) return <span key={i} className="rv-star rv-star-full">★</span>;
    if (i === full && half) return <span key={i} className="rv-star rv-star-half">★</span>;
    return <span key={i} className="rv-star rv-star-empty">☆</span>;
  });
}

export default function GuideReviews() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsyncData(listReviews);
  // The server returns what this guide may see; keeping only reviews about this guide is a courtesy filter.
  const reviews = useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.targetType === 'guide' && String(r.targetId) === String(user.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [data, user.id],
  );
  const average = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;

  return (
    <GuidePage css={GUIDE_REVIEWS_CSS} title="Reviews">
      <div className="guide-page-wrapper">
        <GuideHeader name={user.name} subtitle="What travellers are saying about your tours">
          <div className="rv-avg-block" id="rv-avg">
            {!data ? null : reviews.length === 0 ? (
              <span className="rv-no-avg">No reviews yet</span>
            ) : (
              <>
                <div className="rv-avg-left"><div className="rv-avg-num">{average.toFixed(1)}</div></div>
                <div className="rv-avg-right">
                  <div className="rv-avg-stars"><Stars rating={average} /></div>
                  <div className="rv-avg-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                </div>
              </>
            )}
          </div>
        </GuideHeader>

        <div id="rv-list" className="rv-list">
          {!data && loading ? <LoadingState label="Loading reviews…" /> : null}
          <ErrorNotice error={error} onRetry={reload} />
          {data && reviews.length === 0 ? (
            <div className="rv-empty">
              <div className="rv-empty-icon">⭐</div>
              <p>No reviews yet. Reviews will appear here after travellers complete trips with you.</p>
            </div>
          ) : null}
          {reviews.map((r) => {
            const reviewer = r.reviewerName || r.userName || `Traveller #${r.userId}`;
            const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
            return (
              <div className="rv-card" key={r.id}>
                <div className="rv-card-top">
                  <div className="rv-reviewer-avatar">{String(reviewer)[0].toUpperCase()}</div>
                  <div className="rv-reviewer-info">
                    <div className="rv-reviewer-name">{reviewer}</div>
                    <div className="rv-reviewer-date">{date}</div>
                  </div>
                  <div className="rv-card-stars"><Stars rating={Number(r.rating) || 0} /></div>
                </div>
                <p className="rv-comment">{r.comment || ''}</p>
              </div>
            );
          })}
        </div>
      </div>
    </GuidePage>
  );
}

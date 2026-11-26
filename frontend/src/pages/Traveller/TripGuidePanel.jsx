import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { listAvailableGuides } from '../../services/tripGuides.api.js';
import { cancelGuideForTrip, requestGuideForTrip } from '../../features/tripsSlice.js';
import { formatCurrency } from '../../utils/checkoutUtils.js';
import './tripGuidePanel.css';

// Trips in these states can still pick (or re-pick) a guide; later states only display the result.
const SELECTABLE = new Set(['confirmed', 'rejected_by_guide']);

/**
 * Guide status + selection for one booked trip.
 */
export default function TripGuidePanel({ trip, onChanged }) {
  const dispatch = useDispatch();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { status, guideId } = trip;
  const declined = status === 'rejected_by_guide';
  const pending = status === 'pending_guide_confirm';
  const hasGuide = Boolean(guideId) && !declined;
  const guideLabel = trip.guideName || (guideId ? `Guide #${guideId}` : '');

  if (!['confirmed', 'pending_guide_confirm', 'rejected_by_guide', 'started', 'completed'].includes(status)) {
    return null;
  }

  async function onCancel() {
    setBusy(true);
    setError('');
    try {
      await dispatch(cancelGuideForTrip(trip.id)).unwrap();
      await onChanged?.();
    } catch (err) {
      setError((typeof err === 'string' ? err : err?.message) || 'Could not cancel the request.');
    } finally {
      setBusy(false);
    }
  }

  const handleRequestGuide = async (entityId, nextGuideId) => {
    const res = await dispatch(requestGuideForTrip({ tripId: entityId, guideId: nextGuideId })).unwrap();
    return res?.updated;
  };

  return (
    <div className="trav-guide-panel" data-testid={`trip-guide-panel-${trip.id}`}>
      {declined ? (
        <div className="trav-guide-note is-error" role="alert">
          <strong>Guide not confirmed.</strong>{' '}
          {trip.guideNote || 'Your guide could not take this trip.'} Your trip is still booked — please
          choose another guide.
        </div>
      ) : null}

      {pending ? (
        <div className="trav-guide-note is-pending">
          ⏳ Waiting for <strong>{guideLabel}</strong> to confirm. Your plan is finalised once they accept.
        </div>
      ) : null}

      {hasGuide && !pending ? (
        <>
          <div className="trav-guide-note is-ok">
            ✅ Guide confirmed: <strong>{guideLabel}</strong>
          </div>
          {trip.guide ? (
            <div className="trav-guide-note is-neutral">
              {trip.guide.phone ? <>📞 {trip.guide.phone}</> : null}
              {trip.guide.phone && trip.guide.email ? ' · ' : null}
              {trip.guide.email ? <>✉️ <a href={`mailto:${trip.guide.email}`}>{trip.guide.email}</a></> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!declined && !pending && !hasGuide && SELECTABLE.has(status) ? (
        <div className="trav-guide-note is-neutral">
          No guide yet. Pick a local guide for this trip — they must confirm before the plan is final.
        </div>
      ) : null}

      {error ? <div className="trav-guide-note is-error" role="alert">{error}</div> : null}

      <div className="trav-guide-actions">
        {SELECTABLE.has(status) && !hasGuide ? (
          <button type="button" className="trav-guide-btn is-primary" onClick={() => setPicking(true)}>
            {declined ? 'Choose another guide' : 'Choose a guide'}
          </button>
        ) : null}
        {pending ? (
          <button type="button" className="trav-guide-btn" disabled={busy} onClick={onCancel}>
            {busy ? 'Cancelling…' : 'Cancel request'}
          </button>
        ) : null}
      </div>

      {picking ? (
        <GuidePicker
          entityId={trip.id}
          list={listAvailableGuides}
          send={handleRequestGuide}
          onClose={() => setPicking(false)}
          onRequested={async () => {
            setPicking(false);
            await onChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}

// Shared by trips and experience bookings: `list(id)` returns selectable guides, `send(id, guideId)` requests one.
export function GuidePicker({ entityId, list, send, onClose, onRequested, feeLabel = '' }) {
  const [guides, setGuides] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [sort, setSort] = useState('rating');
  const [requesting, setRequesting] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;
    list(entityId).then(
      (found) => !cancelled && setGuides(found),
      (err) => !cancelled && setLoadError(err.message || 'Could not load guides.'),
    );
    return () => {
      cancelled = true;
    };
  }, [entityId, list]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !requesting && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, requesting]);

  const sorted = useMemo(() => {
    const list = [...(guides ?? [])];
    if (sort === 'price') list.sort((a, b) => a.pricePerPerson - b.pricePerPerson || b.rating - a.rating);
    else if (sort === 'experience') list.sort((a, b) => (b.yearsExp || 0) - (a.yearsExp || 0));
    else list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    return list;
  }, [guides, sort]);

  async function onRequest(guide) {
    setRequesting(guide.guideId);
    setActionError('');
    try {
      const result = await send(entityId, guide.guideId);
      await onRequested(result);
    } catch (err) {
      setActionError(err.message || 'Could not send the request.');
      setRequesting('');
      // The list may be stale (e.g. the guide just got booked) — reload it.
      list(entityId).then(setGuides, () => {});
    }
  }

  return (
    <div className="trav-guide-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !requesting && onClose()}>
      <div className="trav-guide-modal" role="dialog" aria-modal="true" aria-labelledby="trav-guide-modal-title">
        <div className="trav-guide-modal-head">
          <div>
            <h3 id="trav-guide-modal-title">Choose your guide</h3>
            <p>Only approved guides who are free on your travel dates are shown.</p>
          </div>
          <button type="button" className="trav-guide-close" aria-label="Close" onClick={onClose} disabled={Boolean(requesting)}>
            &times;
          </button>
        </div>

        <div className="trav-guide-sortbar">
          <label htmlFor="trav-guide-sort">Sort by</label>
          <select id="trav-guide-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="rating">Top rated</option>
            <option value="price">Lowest price</option>
            <option value="experience">Most experienced</option>
          </select>
        </div>

        {actionError ? <div className="trav-guide-note is-error" role="alert">{actionError}</div> : null}
        {loadError ? <div className="trav-guide-note is-error" role="alert">{loadError}</div> : null}
        {!guides && !loadError ? <p className="trav-guide-empty">Loading guides…</p> : null}
        {guides && sorted.length === 0 ? (
          <p className="trav-guide-empty">
            No guides are available for your travel dates right now. Please check back later or contact support.
          </p>
        ) : null}

        <div className="trav-guide-list">
          {sorted.map((guide) => (
            <article className="trav-guide-card" key={guide.guideId}>
              <div className="trav-guide-card-main">
                <h4>{guide.name}</h4>
                <p className="trav-guide-sub">{guide.title}</p>
                <p className="trav-guide-meta">
                  <span>
                    {guide.reviewCount ? `★ ${guide.rating.toFixed(1)} (${guide.reviewCount} reviews)` : 'No reviews yet'}
                  </span>
                  <span>📍 {guide.location}</span>
                  {guide.yearsExp ? <span>{guide.yearsExp} yrs exp</span> : null}
                </p>
                {guide.languages?.length ? <p className="trav-guide-langs">🗣 {guide.languages.join(', ')}</p> : null}
              </div>
              <div className="trav-guide-card-side">
                <div className="trav-guide-price">{formatCurrency(guide.pricePerPerson)}</div>
                <div className="trav-guide-price-sub">per person</div>
                {feeLabel && guide.guideFee ? <div className="trav-guide-price-sub">{feeLabel} {formatCurrency(guide.guideFee)}</div> : null}
                <button
                  type="button"
                  className="trav-guide-btn is-primary"
                  disabled={Boolean(requesting)}
                  onClick={() => onRequest(guide)}
                >
                  {requesting === guide.guideId ? 'Sending…' : 'Request guide'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

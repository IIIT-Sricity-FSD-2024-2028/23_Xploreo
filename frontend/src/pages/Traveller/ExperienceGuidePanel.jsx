import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GuidePicker } from './TripGuidePanel.jsx';
import {
  cancelGuideForExperienceBooking,
  fetchExperienceAvailableGuides,
  requestGuideForExperienceBooking,
  selectBookingsList,
  selectExperienceAvailableGuides,
  selectExperienceGuidesError,
  selectExperienceGuidesLoading,
  selectSelectedBookingDetail,
} from '../../features/bookingsSlice.js';
import { formatCurrency } from '../../utils/checkoutUtils.js';
import './tripGuidePanel.css';

export default function ExperienceGuidePanel({ booking: initial, askFirst = false, onChanged }) {
  const dispatch = useDispatch();
  const bookingsList = useSelector(selectBookingsList);
  const selectedDetail = useSelector(selectSelectedBookingDetail);
  const reduxBooking = bookingsList.find((b) => b.id === initial?.id)
    || (selectedDetail?.id === initial?.id ? selectedDetail : null);
  const booking = reduxBooking || initial;

  const availableGuides = useSelector((state) => selectExperienceAvailableGuides(state, booking?.id));
  const guidesLoading = useSelector((state) => selectExperienceGuidesLoading(state, booking?.id));
  const guidesError = useSelector((state) => selectExperienceGuidesError(state, booking?.id));

  const [picking, setPicking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadGuidesFromRedux = useCallback(async (id) => {
    const res = await dispatch(fetchExperienceAvailableGuides(id)).unwrap();
    return res?.guides || [];
  }, [dispatch]);

  const status = booking.guideStatus;
  const upcoming = String(booking.date).slice(0, 10) >= new Date().toISOString().slice(0, 10);
  if (booking.status !== 'CONFIRMED' || !upcoming) {
    return booking.guideName && status === 'confirmed' ? (
      <div className="trav-guide-panel">
        <div className="trav-guide-note is-ok">✅ Guide: <strong>{booking.guideName}</strong></div>
        <GuideContactLine guide={booking.guide} />
      </div>
    ) : null;
  }

  async function onCancel() {
    setBusy(true);
    setError('');
    try {
      await dispatch(cancelGuideForExperienceBooking(booking.id)).unwrap();
      await onChanged?.();
    } catch (err) {
      setError((typeof err === 'string' ? err : err?.message) || 'Could not cancel the request.');
    } finally {
      setBusy(false);
    }
  }

  const handleRequestGuide = async (entityId, guideId) => {
    const res = await dispatch(requestGuideForExperienceBooking({ bookingId: entityId, guideId })).unwrap();
    return res?.updated;
  };

  const noGuide = !status || status === 'declined';
  if (askFirst && noGuide && dismissed && status !== 'declined') return null;

  return (
    <div className="trav-guide-panel" data-testid={`exp-guide-panel-${booking.id}`}>
      {status === 'declined' ? (
        <div className="trav-guide-note is-error" role="alert">
          <strong>Guide not confirmed.</strong> {booking.guideNote || 'Your guide could not take this session.'} Your
          booking is still confirmed — you can choose another guide.
        </div>
      ) : null}
      {status === 'requested' ? (
        <div className="trav-guide-note is-pending">
          ⏳ Waiting for <strong>{booking.guideName}</strong> to confirm
          {booking.guideFee ? <> · guide fee {formatCurrency(booking.guideFee)}</> : null}.
        </div>
      ) : null}
      {status === 'confirmed' ? (
        <>
          <div className="trav-guide-note is-ok">
            ✅ Guide confirmed: <strong>{booking.guideName}</strong>
            {booking.guideFee ? <> · guide fee {formatCurrency(booking.guideFee)}</> : null}
          </div>
          <GuideContactLine guide={booking.guide} />
        </>
      ) : null}
      {noGuide && status !== 'declined' ? (
        <div className="trav-guide-note is-neutral">
          {askFirst ? 'Would you like a local guide for this experience?' : 'No guide added. You can add a local guide for this session.'}
        </div>
      ) : null}
      {error ? <div className="trav-guide-note is-error" role="alert">{error}</div> : null}

      <div className="trav-guide-actions">
        {noGuide ? (
          <button type="button" className="trav-guide-btn is-primary" onClick={() => setPicking(true)}>
            {status === 'declined' ? 'Choose another guide' : askFirst ? 'Yes, add a guide' : 'Add a guide'}
          </button>
        ) : null}
        {noGuide && askFirst && status !== 'declined' ? (
          <button type="button" className="trav-guide-btn" onClick={() => setDismissed(true)}>No thanks</button>
        ) : null}
        {status === 'requested' ? (
          <button type="button" className="trav-guide-btn" disabled={busy} onClick={onCancel}>
            {busy ? 'Cancelling…' : 'Cancel request'}
          </button>
        ) : null}
      </div>

      {picking ? (
        <GuidePicker
          entityId={booking.id}
          list={loadGuidesFromRedux}
          guidesData={availableGuides}
          loadingData={guidesLoading}
          loadErrorData={guidesError}
          send={handleRequestGuide}
          feeLabel="Guide fee"
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

// Only rendered once the booking has a confirmed guide — the traveller earned this contact info
// by picking an NTA-approved guide, so the server already attaches it to the booking response.
function GuideContactLine({ guide }) {
  if (!guide) return null;
  return (
    <div className="trav-guide-note is-neutral">
      {guide.phone ? <>📞 {guide.phone}</> : null}
      {guide.phone && guide.email ? ' · ' : null}
      {guide.email ? <>✉️ <a href={`mailto:${guide.email}`}>{guide.email}</a></> : null}
    </div>
  );
}

// Port of front_end/pages/hotels/hotelBookings.html: summary strip, status tabs, search and
// booking cards with check-in / check-out / cancel, all against /bookings on the backend.
import { useCallback, useMemo, useState } from 'react';
import { cancelBooking, checkInBooking, checkOutBooking, listHotelBookings } from '@/services/hotels.api.js';
import HotelPage, { EmptyState, HotelModal, LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { STATUS_CLASS, STATUS_LABEL, fmtDate, inr, useHotelData, useToast } from '@/components/hotel/hotelKit.jsx';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'CHECKED_IN', label: 'Checked In' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// Local YYYY-MM-DD for "today"; a stay whose check-out date is before today is over and
// can no longer be checked in or out.
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isPastStay = (b) => String(b.checkOut ?? '').slice(0, 10) < todayStr();

export default function HotelBookings() {
  const [toast, notify] = useToast();
  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => listHotelBookings(), []);
  const { data: bookings, loading, error, reload } = useHotelData(load);

  const counts = useMemo(() => {
    const list = bookings ?? [];
    return {
      total: list.length,
      confirmed: list.filter((b) => b.status === 'CONFIRMED').length,
      revenue: list.filter((b) => b.status === 'CHECKED_OUT').reduce((s, b) => s + (b.totalAmount || 0), 0),
    };
  }, [bookings]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (bookings ?? []).filter((b) => {
      if (tab !== 'ALL' && b.status !== tab) return false;
      if (!q) return true;
      return [b.guestName, b.email, b.phone, b.id, b.hotel?.name, b.roomType].some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [bookings, tab, query]);

  const act = async (booking, fn, success) => {
    setBusyId(booking.id);
    try {
      await fn(booking.id);
      notify(success);
      setDetail(null);
      setConfirmCancel(null);
      reload();
    } catch (err) {
      notify(err.message || 'Action failed', true);
    } finally {
      setBusyId(null);
    }
  };

  const actionsFor = (b) => {
    const busy = busyId === b.id;
    const past = isPastStay(b);
    if (b.status === 'CONFIRMED') {
      return (
        <>
          {past ? null : <button type="button" className="btn-green" disabled={busy} onClick={() => act(b, checkInBooking, `${b.guestName} checked in`)}>Check In</button>}
          <button type="button" className="btn-cancel" disabled={busy} onClick={() => setConfirmCancel(b)}>Cancel</button>
        </>
      );
    }
    if (b.status === 'CHECKED_IN' && !past) {
      return <button type="button" className="btn-blue" disabled={busy} onClick={() => act(b, checkOutBooking, `${b.guestName} checked out`)}>Check Out</button>;
    }
    return null;
  };

  return (
    <HotelPage title="Bookings">
      <PageHeader title="Bookings" subtitle="Manage and track all your reservations" />

      <LoadState loading={loading} error={error} onRetry={reload}>
        {bookings ? (
          <>
            <section className="hotel-content-card hotel-summary-strip">
              <div><span>Total Bookings</span><strong>{counts.total}</strong></div>
              <div><span>Confirmed</span><strong>{counts.confirmed}</strong></div>
              <div><span>Revenue</span><strong>{inr(counts.revenue)}</strong></div>
            </section>

            <div id="booking-controls">
              <div className="hotel-tabs">
                {TABS.map((t) => (
                  <span key={t.key} className={tab === t.key ? 'active' : ''} role="button" tabIndex={0}
                    onClick={() => setTab(t.key)} onKeyDown={(e) => e.key === 'Enter' && setTab(t.key)}>
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="hotel-filters">
                <input type="text" placeholder="Search guest, email, booking id…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            <div id="booking-list">
              {visible.length === 0 ? (
                <EmptyState
                  title={bookings.length ? 'No matching bookings' : 'No bookings yet'}
                  text={bookings.length ? 'Try another status or search term.' : 'Bookings created by travellers for your hotels will appear here.'}
                />
              ) : visible.map((b) => (
                <article key={b.id} className="hotel-booking-card" style={{ cursor: 'pointer' }} onClick={() => setDetail(b)}>
                  <div className="hotel-booking-left">
                    <h3>{b.guestName}</h3>
                    <p>{b.email}</p>
                    <p>{b.phone}</p>
                  </div>
                  <div className="hotel-booking-middle">
                    <div><small>Check-in</small><p>{fmtDate(b.checkIn)}</p></div>
                    <div>→</div>
                    <div><small>Check-out</small><p>{fmtDate(b.checkOut)}</p></div>
                    <div className="hotel-badge">{STATUS_LABEL[b.status] || b.status}</div>
                  </div>
                  <div className="hotel-booking-right">
                    <h3>{inr(b.totalAmount)}</h3>
                    <p>{b.hotel?.name || b.hotelId}</p>
                    <p>{b.roomType} · {b.guests} guest{b.guests === 1 ? '' : 's'}</p>
                    <div className="hotel-actions" style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}>
                      {actionsFor(b)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </LoadState>

      {detail ? (
        <HotelModal
          title="Booking Details"
          onClose={() => setDetail(null)}
          footer={<><span className={`hotel-status ${STATUS_CLASS[detail.status]}`}>{STATUS_LABEL[detail.status]}</span><div style={{ display: 'flex', gap: 8 }}>{actionsFor(detail)}</div></>}
        >
          <p><strong>{detail.guestName}</strong> · #{detail.id}</p>
          <p className="hotel-sub-text">{detail.email} · {detail.phone}</p>
          <p>{detail.hotel?.name || detail.hotelId} — {detail.roomType} × {detail.rooms || 1}</p>
          <p>{fmtDate(detail.checkIn)} → {fmtDate(detail.checkOut)} · {detail.guests} guest{detail.guests === 1 ? '' : 's'}</p>
          <p><strong>{inr(detail.totalAmount)}</strong></p>
          {detail.notes ? <p className="hotel-sub-text">Notes: {detail.notes}</p> : null}
        </HotelModal>
      ) : null}

      {confirmCancel ? (
        <HotelModal
          title="Cancel this booking?"
          onClose={() => setConfirmCancel(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setConfirmCancel(null)}>Keep booking</button>
              <button type="button" className="btn-cancel" disabled={busyId === confirmCancel.id}
                onClick={() => act(confirmCancel, cancelBooking, 'Booking cancelled')}>Cancel booking</button>
            </>
          }
        >
          <p>{confirmCancel.guestName}’s reservation ({fmtDate(confirmCancel.checkIn)} → {fmtDate(confirmCancel.checkOut)}) will be cancelled.</p>
        </HotelModal>
      ) : null}
      {toast}
    </HotelPage>
  );
}

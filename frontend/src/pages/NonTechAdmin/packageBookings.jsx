import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/foundation';
import { SABadge } from '../../components/superadmin';
import {
  clearNtaPackageDispatchResult,
  dispatchNtaPackageBookingThunk,
  fetchNtaPackageBookingDetail,
  fetchNtaPackageBookings,
  selectNtaPackageBookingDetailError,
  selectNtaPackageBookingDetailStatus,
  selectNtaPackageBookings,
  selectNtaPackageBookingsError,
  selectNtaPackageBookingsStatus,
  selectNtaPackageDispatchError,
  selectNtaPackageDispatchStatus,
  selectNtaPackageLastDispatchResult,
  selectSelectedNtaPackageBookingDetail,
  selectSelectedNtaPackageBookingId,
  setSelectedNtaPackageBookingId,
} from '../../store/nta/index.js';
import '../../components/superadmin/superadmin.css';
import '../../components/nta/nta.css';

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function statusBadgeLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'started' || s === 'ongoing') return 'Ongoing';
  if (s === 'completed' || s === 'checked_out') return 'Completed';
  if (s === 'checked_in') return 'Checked In';
  if (s === 'cancelled') return 'Cancelled';
  if (s === 'pending_guide_confirm') return 'Pending Guide';
  return status || 'Unknown';
}

function componentAssignmentStyle(assignmentStatus, bookingStatus) {
  if (String(bookingStatus || '').toUpperCase() === 'CANCELLED') {
    return { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' };
  }
  if (assignmentStatus === 'assigned') {
    return { bg: '#dcfce7', color: '#166534', label: bookingStatus || 'Assigned' };
  }
  return { bg: '#fef3c7', color: '#92400e', label: 'Awaiting Dispatch' };
}

export default function NtaPackageBookingsPage({ user = null }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const session = useMemo(
    () =>
      user ||
      (authUser && authUser.role !== 'default'
        ? authUser
        : {
            userid: 'NTA-JAI-001',
            userId: 'NTA-JAI-001',
            role: 'nontechadmin',
            region: 'Jaipur',
          }),
    [user, authUser],
  );

  const bookings = useSelector(selectNtaPackageBookings);
  const status = useSelector(selectNtaPackageBookingsStatus);
  const error = useSelector(selectNtaPackageBookingsError);
  const selectedId = useSelector(selectSelectedNtaPackageBookingId);
  const selectedDetail = useSelector(selectSelectedNtaPackageBookingDetail);
  const detailStatus = useSelector(selectNtaPackageBookingDetailStatus);
  const detailError = useSelector(selectNtaPackageBookingDetailError);
  const dispatchStatus = useSelector(selectNtaPackageDispatchStatus);
  const dispatchError = useSelector(selectNtaPackageDispatchError);
  const lastDispatchResult = useSelector(selectNtaPackageLastDispatchResult);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookings = useCallback(() => {
    dispatch(fetchNtaPackageBookings({ session }));
  }, [dispatch, session]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSelectBooking = (tripId) => {
    dispatch(setSelectedNtaPackageBookingId(tripId));
    dispatch(fetchNtaPackageBookingDetail({ tripId, session }));
  };

  const handleBackToList = () => {
    dispatch(setSelectedNtaPackageBookingId(null));
    dispatch(clearNtaPackageDispatchResult());
  };

  const handleDispatch = async (tripId) => {
    if (!tripId || dispatchStatus === 'loading') return;
    await dispatch(dispatchNtaPackageBookingThunk({ tripId, session }));
    dispatch(fetchNtaPackageBookingDetail({ tripId, session }));
    dispatch(fetchNtaPackageBookings({ session }));
  };

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && String(b.overallStatus || '').toLowerCase() !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [b.tripId, b.packageTitle, b.destination, b.travellerId, b.planId].some((v) =>
        String(v || '').toLowerCase().includes(q),
      );
    });
  }, [bookings, statusFilter, searchQuery]);

  const isLoading = status === 'loading';
  const isDetailLoading = detailStatus === 'loading';
  const isDispatching = dispatchStatus === 'loading';

  // Detail View
  if (selectedId) {
    const detail =
      selectedDetail && selectedDetail.tripId === selectedId
        ? selectedDetail
        : bookings.find((b) => b.tripId === selectedId) || null;

    const hotels = detail?.hotelComponents ?? [];
    const experiences = detail?.experienceComponents ?? [];
    const totalComponents = hotels.length + experiences.length;
    const assignedCount =
      hotels.filter((h) => h.assignmentStatus === 'assigned').length +
      experiences.filter((e) => e.assignmentStatus === 'assigned').length;
    const canDispatch =
      detail &&
      !['draft', 'cancelled', 'rejected_by_guide'].includes(
        String(detail.overallStatus || '').toLowerCase(),
      ) &&
      totalComponents > 0;

    return (
      <div className="nta-page-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button type="button" className="sa-btn-secondary" onClick={handleBackToList}>
            ← Back to Package Bookings
          </button>
          <button
            type="button"
            className="sa-btn-secondary"
            onClick={() => dispatch(fetchNtaPackageBookingDetail({ tripId: selectedId, session }))}
            disabled={isDetailLoading}
          >
            {isDetailLoading ? 'Refreshing…' : '↻ Refresh Details'}
          </button>
        </div>

        {detailError && (
          <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: 16 }}>
            <span>⚠️ {detailError.message || 'Failed to load package booking details.'}</span>
          </div>
        )}

        {dispatchError && (
          <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: 16 }}>
            <span>⚠️ {dispatchError.message || 'Dispatch failed.'}</span>
          </div>
        )}

        {lastDispatchResult && (
          <div
            className={`sa-users-alert ${lastDispatchResult.failedComponents?.length ? 'sa-users-alert-error' : 'sa-users-alert-success'}`}
            role="status"
            style={{ marginBottom: 16 }}
          >
            <div>
              <strong>Dispatch summary:</strong>{' '}
              {lastDispatchResult.dispatched?.hotel
                ? lastDispatchResult.dispatched.hotel.idempotent
                  ? 'Hotel already forwarded'
                  : 'Hotel forwarded'
                : 'No hotel'}
              {' · '}
              {(lastDispatchResult.dispatched?.experiences || []).filter((e) => e.created).length} experience(s) forwarded,{' '}
              {(lastDispatchResult.dispatched?.experiences || []).filter((e) => e.idempotent).length} already assigned.
              {lastDispatchResult.failedComponents?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  Failed ({lastDispatchResult.failedComponents.length}):{' '}
                  {lastDispatchResult.failedComponents
                    .map((f) => `${f.componentType} ${f.targetId} (${f.error})`)
                    .join('; ')}
                </div>
              )}
            </div>
          </div>
        )}

        {detail ? (
          <section className="admin-ticket-queue-card" style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>
                  Package Booking #{detail.tripId}
                </span>
                <h1 style={{ margin: '4px 0', fontSize: 24, color: '#0f172a' }}>{detail.packageTitle}</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                  Traveller: <strong>{detail.travellerId}</strong> · Destination: <strong>{detail.destination}</strong> · Travellers: <strong>{detail.travellers}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  {rupees(detail.totalAmount)}
                </div>
                <SABadge status={statusBadgeLabel(detail.overallStatus)} />
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="sa-btn-primary"
                    disabled={!canDispatch || isDispatching}
                    onClick={() => handleDispatch(detail.tripId)}
                  >
                    {isDispatching
                      ? 'Forwarding to Partners…'
                      : lastDispatchResult?.failedComponents?.length
                        ? 'Retry Failed Dispatch'
                        : assignedCount === totalComponents && totalComponents > 0
                          ? 'Re-sync / Verify Dispatch'
                          : 'Forward to Partners'}
                  </button>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 16, color: '#0f172a', marginBottom: 12 }}>
              Hotel Component ({hotels.length})
            </h3>
            {hotels.length === 0 ? (
              <p style={{ color: '#64748b', marginBottom: 24 }}>No hotel component included in this package.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                {hotels.map((hc) => {
                  const chip = componentAssignmentStyle(hc.assignmentStatus, hc.bookingStatus);
                  return (
                    <div
                      key={`${hc.hotelId}-${hc.itineraryItemId}`}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>{hc.hotelName || hc.hotelId}</strong>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          Hotel ID: <code>{hc.hotelId}</code> · Partner: <code>{hc.partnerId || 'Unlinked'}</code> · Room: {hc.roomType}
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                          Stay: {hc.checkInDate || '—'} → {hc.checkOutDate || '—'}
                          {hc.bookingId ? ` · Booking #${hc.bookingId}` : ''}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: chip.bg,
                          color: chip.color,
                        }}
                      >
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ fontSize: 16, color: '#0f172a', marginBottom: 12 }}>
              Experience Components ({experiences.length})
            </h3>
            {experiences.length === 0 ? (
              <p style={{ color: '#64748b' }}>No experience components included in this package.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {experiences.map((ec, idx) => {
                  const chip = componentAssignmentStyle(ec.assignmentStatus, ec.bookingStatus);
                  return (
                    <div
                      key={`${ec.dayNumber}-${ec.experienceId}-${idx}`}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>
                          Day {ec.dayNumber}: {ec.title || ec.experienceId}
                        </strong>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          Experience ID: <code>{ec.experienceId}</code> · Partner: <code>{ec.partnerId || 'Unlinked'}</code>
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                          Scheduled: {String(ec.startsAt || '').slice(0, 10) || '—'} · {ec.location || detail.destination}
                          {ec.bookingId ? ` · Booking #${ec.bookingId}` : ''}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: chip.bg,
                          color: chip.color,
                        }}
                      >
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <div className="sa-users-alert">Loading package booking…</div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="sa-users-page nta-dashboard-container" style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px' }}>
      <header className="sa-users-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="sa-users-title" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Holiday Package Bookings
            </h1>
            <p className="sa-users-subtitle" style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
              Review traveller package bookings for your region ({session.region || 'All'}) and forward components to Hotel &amp; Experience partners.
            </p>
          </div>
          <button type="button" className="sa-btn-secondary" onClick={loadBookings} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="sa-users-alert sa-users-alert-error" role="alert" style={{ marginBottom: 20 }}>
          <span>⚠️ {error.message || 'Failed to load package bookings.'}</span>
          <button type="button" className="sa-btn-secondary" onClick={loadBookings}>
            Retry
          </button>
        </div>
      )}

      <section className="admin-ticket-queue-card" style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'confirmed', 'started', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                className={statusFilter === st ? 'sa-btn-primary' : 'sa-btn-secondary'}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All' : statusBadgeLabel(st)}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by Trip ID, package, or traveller…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 260 }}
          />
        </div>

        {isLoading && bookings.length === 0 ? (
          <p style={{ color: '#64748b' }}>Loading package bookings…</p>
        ) : filteredBookings.length === 0 ? (
          <p style={{ color: '#64748b' }}>No holiday package bookings found for your account.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lf-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Package</th>
                  <th>Traveller</th>
                  <th>Travel Dates</th>
                  <th>Components</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const hotels = b.hotelComponents ?? [];
                  const exps = b.experienceComponents ?? [];
                  const totalComp = hotels.length + exps.length;
                  const assignedComp =
                    hotels.filter((h) => h.assignmentStatus === 'assigned').length +
                    exps.filter((e) => e.assignmentStatus === 'assigned').length;
                  const checkIn = hotels[0]?.checkInDate || String(exps[0]?.startsAt || '').slice(0, 10) || '—';
                  const checkOut = hotels[0]?.checkOutDate || '—';
                  return (
                    <tr key={b.tripId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{b.tripId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.packageTitle}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{b.destination}</div>
                      </td>
                      <td>{b.travellerId} ({b.travellers})</td>
                      <td>{checkIn}{checkOut !== '—' ? ` → ${checkOut}` : ''}</td>
                      <td>
                        {assignedComp}/{totalComp} assigned
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>{rupees(b.totalAmount)}</td>
                      <td><SABadge status={statusBadgeLabel(b.overallStatus)} /></td>
                      <td>
                        <button
                          type="button"
                          className="sa-btn-secondary"
                          onClick={() => handleSelectBooking(b.tripId)}
                        >
                          Manage / Dispatch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

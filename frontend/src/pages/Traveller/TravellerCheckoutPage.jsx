import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  BookingSummaryCard,
  CheckoutStepper,
  PaymentMethodSelector,
  TravellerDetailsForm,
  DEFAULT_CHECKOUT_STEPS,
  DEFAULT_PAYMENT_METHODS,
} from '../../components/checkout/index.js';
import { selectAuthUser } from '../../features/authSlice.js';
import { fetchBrowseItemDetail, selectBrowseDetail } from '../../features/browseSlice.js';
import {
  DEFAULT_DEMO_ITEM,
  initCheckoutSession,
  processCheckoutPayment,
  resetCheckoutState,
  selectCheckoutState,
  setCheckoutError,
  setCheckoutStep,
  setGuestCount,
  setPaymentMethod,
  setRoomCount,
  setSimulatedOutcome,
  setTravellerDetails,
} from '../../features/checkoutSlice.js';
import { fetchNotifications } from '../../features/notificationsSlice.js';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import {
  getTodayIsoDate,
  validateExperienceBooking,
  validateHotelRoomBooking,
  validatePackageBooking,
} from '../../utils/bookingValidationUtils.js';
import ExperienceGuidePanel from './ExperienceGuidePanel.jsx';
import './travellerCheckout.css';

/**
 * TravellerCheckoutPage
 * End-to-end checkout interface backed by checkoutSlice and MockPaymentAdapter.
 */
function TravellerCheckoutCore({
  user,
  initialItem = null,
  adapter = null,
  onComplete = null,
  navigate = null,
  location = null,
  inRouter = false,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const checkoutState = useSelector(selectCheckoutState);
  const browseDetail = useSelector(selectBrowseDetail);

  const safeNavigate = (targetPath) => {
    if (navigate) {
      navigate(targetPath);
    } else if (typeof window !== 'undefined') {
      window.location.href = targetPath;
    }
  };

  const activeAuthUser = authUser && authUser.role !== 'default' ? authUser : null;
  const effectiveUser = user || activeAuthUser || null;

  const routeOrPropItem = location?.state?.item || initialItem || null;
  const reduxItem = checkoutState.selectedItem;
  const selectedItem = routeOrPropItem || reduxItem || DEFAULT_DEMO_ITEM;
  const pricingType = (selectedItem.type || selectedItem.bookingType || 'hotel').toLowerCase();
  const isStay = pricingType === 'hotel';
  const isExperience = pricingType === 'experience';
  const browseDetailType = pricingType === 'plan' || pricingType === 'package' || pricingType === 'trip'
    ? 'package'
    : pricingType;
  const expectedBrowseKey = selectedItem?.id ? `${browseDetailType}:${selectedItem.id}` : null;
  const hasLiveDetail = Boolean(expectedBrowseKey && browseDetail?.key === expectedBrowseKey && browseDetail?.item);
  const liveItem = hasLiveDetail ? browseDetail.item : null;
  const liveRooms = hasLiveDetail && Array.isArray(browseDetail.rooms) ? browseDetail.rooms : [];
  const matchedLiveRoom = isStay && liveRooms.length > 0
    ? liveRooms.find(
        (r) =>
          (selectedItem.roomId && r.id === selectedItem.roomId) ||
          (selectedItem.roomType && String(r.type || '').trim().toLowerCase() === String(selectedItem.roomType).trim().toLowerCase()),
      ) || null
    : null;

  const effectiveRoom = isStay
    ? matchedLiveRoom || {
        id: selectedItem.roomId,
        type: selectedItem.roomType || 'Standard Room',
        maxOccupancy: Number(selectedItem.maxOccupancy ?? selectedItem.item?.maxOccupancy ?? 0),
        availableRooms: Number(
          selectedItem.availableRooms ?? liveItem?.availableRooms ?? selectedItem.item?.availableRooms ?? 10,
        ),
        status: selectedItem.status || 'active',
      }
    : null;
  const maxSelectableRooms = isStay
    ? Math.max(1, Number(effectiveRoom?.availableRooms ?? 1))
    : 1;

  // Guest count limits
  const minGuests = 1;
  const maxGuests = isStay && Number(effectiveRoom?.maxOccupancy) > 0
    ? Math.max(
        Number(effectiveRoom.maxOccupancy) * maxSelectableRooms,
        Number(selectedItem.guestCount ?? selectedItem.guests ?? 2) || 2,
      )
    : isExperience && Number(liveItem?.capacity ?? selectedItem.capacity) > 0
      ? Math.max(1, Number(liveItem?.capacity ?? selectedItem.capacity))
      : Math.max(1, Number(selectedItem.capacity || selectedItem.maxGuests || selectedItem.availableSeats || 20));

  const initialGuestCount = Math.max(
    minGuests,
    Math.min(
      maxGuests,
      Number(
        location?.state?.guestCount ??
        location?.state?.guests ??
        location?.state?.participants ??
        location?.state?.item?.guestCount ??
        location?.state?.item?.guests ??
        location?.state?.item?.participants ??
        initialItem?.guestCount ??
        initialItem?.guests ??
        initialItem?.participants ??
        selectedItem.guestCount ??
        selectedItem.participants ??
        selectedItem.guests ??
        2
      ) || 2
    )
  );

  const initialRoomCount = Math.max(1, parseInt(location?.state?.rooms ?? selectedItem.roomCount ?? 1, 10) || 1);

  const defaultTravellerDetails = {
    firstName: effectiveUser?.name ? effectiveUser.name.split(' ')[0] : 'Anjali',
    lastName: effectiveUser?.name ? effectiveUser.name.split(' ').slice(1).join(' ') : 'Sharma',
    email: effectiveUser?.email || 'anjali@xploreo.com',
    phone: effectiveUser?.phone || '9123456780',
    specialRequests: 'High floor room preferred, quiet corner.',
  };

  const sourceKey = routeOrPropItem
    ? location?.key
      ? `route:${location.key}:${routeOrPropItem.id || 'item'}`
      : `prop:${routeOrPropItem.id || 'item'}:${routeOrPropItem.checkIn || routeOrPropItem.date || ''}:${routeOrPropItem.roomType || ''}:${initialGuestCount}:${initialRoomCount}`
    : checkoutState.sourceKey || `fallback:${selectedItem.id || 'demo'}`;

  useEffect(() => {
    dispatch(
      initCheckoutSession({
        item: selectedItem,
        guestCount: initialGuestCount,
        roomCount: initialRoomCount,
        travellerDetails: defaultTravellerDetails,
        sourceKey,
      }),
    );
    // Re-initialize only when the route/source checkout item changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, sourceKey]);

  useEffect(() => {
    const id = selectedItem?.id;
    if (!id || String(id).startsWith('demo-') || !inRouter) return;
    if (browseDetail?.key !== expectedBrowseKey && !browseDetail?.loading) {
      dispatch(fetchBrowseItemDetail({ type: browseDetailType, id }));
    }
  }, [dispatch, selectedItem?.id, browseDetailType, expectedBrowseKey, browseDetail?.key, browseDetail?.loading, inRouter]);

  const shouldResetOnUnmountRef = useRef(false);
  useEffect(() => {
    shouldResetOnUnmountRef.current = Boolean(
      checkoutState.hasPersisted || checkoutState.currentStepIndex === 3,
    );
  }, [checkoutState.hasPersisted, checkoutState.currentStepIndex]);

  useEffect(() => {
    return () => {
      if (shouldResetOnUnmountRef.current) {
        dispatch(resetCheckoutState());
      }
    };
  }, [dispatch]);

  const isSessionSynced = checkoutState.sourceKey === sourceKey;
  const currentStepIndex = isSessionSynced ? checkoutState.currentStepIndex : 0;
  const travellerDetails = isSessionSynced ? checkoutState.travellerDetails : defaultTravellerDetails;
  const selectedMethod = checkoutState.selectedMethod || 'upi';
  const simulatedOutcome = checkoutState.simulatedOutcome || 'SUCCESS';
  const isProcessing = checkoutState.isProcessing;
  const paymentResult = isSessionSynced ? checkoutState.paymentResult : null;
  const errorMessage = isSessionSynced ? checkoutState.errorMessage : '';
  const createdExperience = isSessionSynced ? checkoutState.createdExperience : null;
  const guestCount = Math.max(
    minGuests,
    Math.min(maxGuests, isSessionSynced ? checkoutState.guestCount : initialGuestCount),
  );
  const roomCount = isSessionSynced ? checkoutState.roomCount : initialRoomCount;

  const handleGuestChange = (newCount) => {
    const parsed = Number(newCount);
    if (!isNaN(parsed)) {
      dispatch(setGuestCount(Math.max(minGuests, Math.min(maxGuests, parsed))));
    }
  };

  const handleRoomCountChange = (newRoomCount) => {
    const parsed = Number(newRoomCount);
    if (!isNaN(parsed)) {
      dispatch(setRoomCount(Math.max(1, Math.min(maxSelectableRooms, parsed))));
    }
  };

  // Pricing calculations: dynamic base fare and guest-dependent taxes/fees
  const basePrice = Number(
    (isStay ? effectiveRoom?.pricePerNight : undefined) ??
      selectedItem.pricePerNight ??
      selectedItem.price ??
      selectedItem.basePrice ??
      5000,
  );
  const TAX_RATE = 0.12; // same rate the server applies, so what is paid is what is recorded
  // A stay is charged per night per room; an experience (and anything else) per guest.
  const stayNights = isStay && selectedItem.checkIn && selectedItem.checkOut
    ? Math.max(1, Math.round((Date.parse(selectedItem.checkOut) - Date.parse(selectedItem.checkIn)) / 86400000))
    : 1;
  const quantity = isStay ? stayNights * roomCount : guestCount;
  const subtotal = basePrice * quantity;
  const stayNightsLabel = `${stayNights} ${stayNights === 1 ? 'night' : 'nights'}`;
  const fareLabel = isStay
    ? `Base Fare (${roomCount} ${roomCount === 1 ? 'room' : 'rooms'} × ${stayNightsLabel} × ${formatCurrency(basePrice)})`
    : null;

  // Hotels and experiences: 12% taxes & fees. Other items keep their own figure (fallback 1200).
  const taxPerGuest = selectedItem.taxPerGuest ?? selectedItem.taxesPerGuest ?? selectedItem.feePerGuest ?? null;
  const taxesAndFees = isStay || isExperience
    ? Math.round(subtotal * TAX_RATE)
    : taxPerGuest != null
      ? Number(taxPerGuest) * guestCount
      : Number(selectedItem.taxesAndFees ?? 1200);

  const totalAmount = subtotal + taxesAndFees;

  const itemType = (selectedItem.type || selectedItem.bookingType || 'hotel').toLowerCase();
  // Single-day things (an experience session) show one date; stays and packages show a range.
  const startDate = selectedItem.checkIn || selectedItem.date;
  const endDate = selectedItem.checkOut;
  const isSingleDay = itemType === 'experience' || !endDate || endDate === startDate;
  const todayIso = getTodayIsoDate();
  const validationResult = (() => {
    if (String(selectedItem?.id || '').startsWith('demo-')) {
      return { valid: true, error: '' };
    }
    if (isStay) {
      return validateHotelRoomBooking({
        hotel: liveItem || selectedItem.item || selectedItem,
        room: effectiveRoom,
        roomsCount: roomCount,
        guestsCount: guestCount,
        checkIn: startDate,
        checkOut: endDate,
        today: todayIso,
      });
    }
    if (isExperience) {
      return validateExperienceBooking({
        experience: liveItem || selectedItem.item || selectedItem,
        slot: selectedItem.selectedSlot,
        date: startDate,
        participants: guestCount,
        today: todayIso,
      });
    }
    return validatePackageBooking({
      plan: liveItem || selectedItem.item || selectedItem,
      guestsCount: guestCount,
      checkIn: startDate,
      checkOut: endDate,
      today: todayIso,
    });
  })();
  const dateError = validationResult.valid ? '' : validationResult.error;

  const cardBooking = {
    title: selectedItem.title || selectedItem.name || 'Demo Reservation',
    type: selectedItem.type || selectedItem.bookingType || 'hotel',
    location: selectedItem.location || selectedItem.city || selectedItem.destination || 'India',
    date: !startDate
      ? 'Date not set'
      : isSingleDay
        ? formatDate(startDate)
        : `${formatDate(startDate)} → ${formatDate(endDate)}`,
    guestCount: guestCount,
    roomCount: isStay ? roomCount : null,
    imageUrl: selectedItem.imageUrl || selectedItem.image || null,
  };

  const cardPricing = {
    basePrice,
    guestCount: quantity,
    taxesAndFees,
    subtotal,
    fareLabel,
    total: totalAmount,
  };

  // Step 1: Submit traveller details
  const handleDetailsSubmit = (formData) => {
    if (dateError) {
      dispatch(setCheckoutError(dateError));
      dispatch(setCheckoutStep(0));
      return;
    }
    dispatch(setTravellerDetails(formData));
    dispatch(setCheckoutStep(2)); // Advance to Payment step
  };

  // Step 2: Trigger payment processing via checkoutSlice AsyncThunk
  const handleProcessPayment = async () => {
    dispatch(setCheckoutError(''));
    if (dateError) {
      dispatch(setCheckoutError(dateError));
      return;
    }

    const activeUserId = effectiveUser?.userId || effectiveUser?.id || effectiveUser?.username;
    try {
      const payload = await dispatch(
        processCheckoutPayment({
          selectedItem,
          guestCount,
          roomCount,
          travellerDetails,
          selectedMethod,
          simulatedOutcome,
          totalAmount,
          activeUserId,
          adapterMode: adapter?.mode || 'mock',
        }),
      ).unwrap();

      if (payload?.outcome === 'SUCCEEDED') {
        dispatch(fetchNotifications(activeUserId));
        if (onComplete) {
          onComplete(payload.result);
        }
      }
    } catch {
      // Errors and step retention are handled by checkoutSlice rejected reducer
    }
  };

  return (
    <div className="trav-checkout-wrapper">
      {/* Minimal Checkout-Specific Top Navigation */}
      <header className="trav-checkout-navbar">
        <div className="trav-checkout-navbar-inner">
          <button
            type="button"
            className="trav-checkout-back-link"
            onClick={() => {
              if (currentStepIndex > 0 && currentStepIndex < 3) {
                dispatch(setCheckoutStep(currentStepIndex - 1));
              } else {
                safeNavigate('/Traveller/browse');
              }
            }}
            aria-label="Back to browse or previous step"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>
              {currentStepIndex === 0
                ? 'Back to Browse'
                : currentStepIndex === 3
                ? 'Back to Dashboard'
                : 'Back to Previous Step'}
            </span>
          </button>

          {inRouter ? (
            <Link to="/Traveller/dashboard" className="trav-checkout-brand" aria-label="Xploreo Home">
              <img src={logo} alt="Xploreo" className="trav-checkout-logo-img" />
              <span className="trav-checkout-brand-title">Xploreo</span>
            </Link>
          ) : (
            <a href="/Traveller/dashboard" className="trav-checkout-brand" aria-label="Xploreo Home">
              <img src={logo} alt="Xploreo" className="trav-checkout-logo-img" />
              <span className="trav-checkout-brand-title">Xploreo</span>
            </a>
          )}

          <div className="trav-checkout-security-pill">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="trav-checkout-page" data-testid="traveller-checkout-page">
        <header className="trav-checkout-header">
          <div className="trav-checkout-eyebrow">
            <span className="trav-checkout-eyebrow-dot" aria-hidden="true" />
            <span>Checkout &amp; Payment Demo</span>
          </div>
          <h1 className="trav-checkout-title">Complete Your Reservation</h1>
          <p className="trav-checkout-subtitle">
            Experience our streamlined checkout flow powered by the explicit Mock Payment Adapter.
          </p>
        </header>

        {/* Demo Mode Notice Banner */}
        <div className="trav-checkout-demo-banner" role="alert" data-testid="checkout-demo-banner">
          <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>Demo Checkout Mode Active:</strong> This checkout session is connected to the <code>MockPaymentAdapter</code>. Real credit cards are not charged and no real financial transactions take place.
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="trav-checkout-stepper-wrap">
          <CheckoutStepper
            steps={DEFAULT_CHECKOUT_STEPS}
            currentStepIndex={currentStepIndex}
            onStepClick={(index) => {
              // Only allow jumping back to prior completed steps
              if (index < currentStepIndex && !isProcessing) {
                dispatch(setCheckoutStep(index));
              }
            }}
          />
        </div>

        {/* Main Two-Column Content for Steps 0, 1, 2 */}
        {currentStepIndex < 3 ? (
          <div className="trav-checkout-grid">
            {/* Left Column: Active Step Form */}
            <div className="trav-checkout-main-col">
              {/* Step 0: Review Booking */}
              {currentStepIndex === 0 && (
                <section className="trav-checkout-content-card" data-testid="checkout-step-review">
                  <div className="trav-checkout-section-header">
                    <span className="trav-step-badge-pill">Step 1 of 4</span>
                    <h2 className="trav-checkout-section-title">Step 1: Review Itinerary &amp; Pricing</h2>
                    <p className="trav-checkout-section-desc">
                      Please verify your reservation details, schedule, and guest count before continuing.
                    </p>
                  </div>

                  {/* Selected Item Spotlight */}
                  <div className="trav-review-spotlight">
                    <div className="trav-review-spotlight-top">
                      {cardBooking.imageUrl && (
                        <img
                          src={cardBooking.imageUrl}
                          alt={cardBooking.title}
                          className="trav-review-spotlight-img"
                        />
                      )}
                      <div className="trav-review-spotlight-info">
                        <span className="trav-review-type-badge">{cardBooking.type}</span>
                        <h3 className="trav-review-spotlight-title">{cardBooking.title}</h3>
                        <p className="trav-review-spotlight-loc">
                          <span aria-hidden="true">📍</span>
                          <span>{cardBooking.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="trav-review-schedule-grid">
                      <div className="trav-review-schedule-item">
                        <span className="trav-review-schedule-label">Dates / Schedule</span>
                        <span className="trav-review-schedule-val">{cardBooking.date || 'Flexible schedule'}</span>
                      </div>
                      <div className="trav-review-schedule-item trav-review-guest-picker">
                        <label htmlFor="checkout-guests-select" className="trav-review-schedule-label">
                          Guests / Party
                        </label>
                        <div className="trav-guest-selector-wrap">
                          <button
                            type="button"
                            className="trav-guest-step-btn"
                            onClick={() => handleGuestChange(guestCount - 1)}
                            disabled={guestCount <= minGuests}
                            aria-label="Decrease guest count"
                            data-testid="guest-decrement-btn"
                          >
                            −
                          </button>
                          <div className="trav-guest-select-container">
                            <select
                              id="checkout-guests-select"
                              className="trav-guest-select"
                              value={guestCount}
                              onChange={(e) => handleGuestChange(Number(e.target.value))}
                              aria-label="Select guest count"
                              data-testid="checkout-guest-select"
                            >
                              {Array.from({ length: maxGuests - minGuests + 1 }, (_, i) => minGuests + i).map((num) => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? 'Guest' : 'Guests'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="trav-guest-step-btn"
                            onClick={() => handleGuestChange(guestCount + 1)}
                            disabled={guestCount >= maxGuests}
                            aria-label="Increase guest count"
                            data-testid="guest-increment-btn"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {isStay && (
                        <div className="trav-review-schedule-item trav-review-guest-picker">
                          <label htmlFor="checkout-rooms-select" className="trav-review-schedule-label">
                            Rooms ({effectiveRoom?.type || 'Selected'})
                          </label>
                          <div className="trav-guest-selector-wrap">
                            <button
                              type="button"
                              className="trav-guest-step-btn"
                              onClick={() => handleRoomCountChange(roomCount - 1)}
                              disabled={roomCount <= 1}
                              aria-label="Decrease room count"
                              data-testid="room-decrement-btn"
                            >
                              −
                            </button>
                            <div className="trav-guest-select-container">
                              <select
                                id="checkout-rooms-select"
                                className="trav-guest-select"
                                value={roomCount}
                                onChange={(e) => handleRoomCountChange(Number(e.target.value))}
                                aria-label="Select room count"
                                data-testid="checkout-room-select"
                              >
                                {Array.from({ length: maxSelectableRooms }, (_, i) => i + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num} {num === 1 ? 'Room' : 'Rooms'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="trav-guest-step-btn"
                              onClick={() => handleRoomCountChange(roomCount + 1)}
                              disabled={roomCount >= maxSelectableRooms}
                              aria-label="Increase room count"
                              data-testid="room-increment-btn"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="trav-review-inclusions-card">
                      <h4 className="trav-inclusions-title">Booking Highlights &amp; Reassurances</h4>
                      <ul className="trav-inclusions-list">
                        <li className="trav-inclusions-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Free cancellation up to 24 hours prior</span>
                        </li>
                        <li className="trav-inclusions-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Instant demo confirmation &amp; voucher generation</span>
                        </li>
                        <li className="trav-inclusions-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>24/7 dedicated Traveller Concierge support</span>
                        </li>
                        <li className="trav-inclusions-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Verified authentic partner listing on Xploreo</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {dateError ? (
                    <div role="alert" data-testid="checkout-validation-error" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      ⚠️ {dateError}
                    </div>
                  ) : null}

                  <div className="trav-checkout-actions">
                    <button
                      type="button"
                      className="trav-btn-secondary"
                      onClick={() => navigate('/Traveller/browse')}
                    >
                      ← Back to Browse
                    </button>
                    <button
                      type="button"
                      className="trav-btn-primary"
                      disabled={Boolean(dateError)}
                      onClick={() => dispatch(setCheckoutStep(1))}
                      data-testid="btn-proceed-to-details"
                    >
                      Proceed to Traveller Details →
                    </button>
                  </div>
                </section>
              )}

              {/* Step 1: Traveller Details Form */}
              {currentStepIndex === 1 && (
                <section className="trav-checkout-content-card" data-testid="checkout-step-details">
                  <div className="trav-checkout-section-header">
                    <span className="trav-step-badge-pill">Step 2 of 4</span>
                    <h2 className="trav-checkout-section-title">Step 2: Traveller Contact Details</h2>
                    <p className="trav-checkout-section-desc">
                      Provide contact information for the lead traveller to receive vouchers and trip alerts.
                    </p>
                  </div>
                  <TravellerDetailsForm
                    initialValues={travellerDetails}
                    onSubmit={handleDetailsSubmit}
                    submitLabel="Proceed to Payment Selection"
                  />
                  <div style={{ marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="trav-btn-secondary"
                      onClick={() => dispatch(setCheckoutStep(0))}
                    >
                      ← Back to Itinerary Review
                    </button>
                  </div>
                </section>
              )}

              {/* Step 2: Payment Method & Simulation Controls */}
              {currentStepIndex === 2 && (
                <section className="trav-checkout-content-card" data-testid="checkout-step-payment">
                  <div className="trav-checkout-section-header">
                    <span className="trav-step-badge-pill">Step 3 of 4</span>
                    <h2 className="trav-checkout-section-title">Step 3: Select Payment Method</h2>
                    <p className="trav-checkout-section-desc">
                      Choose your simulated payment channel and test out adapter processing scenarios.
                    </p>
                  </div>

                  {errorMessage && (
                    <div
                      className="trav-checkout-error-banner"
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      role="alert"
                    >
                      <span aria-hidden="true">⚠️</span>
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <PaymentMethodSelector
                    selectedMethod={selectedMethod}
                    onSelectMethod={(method) => dispatch(setPaymentMethod(method))}
                    methods={DEFAULT_PAYMENT_METHODS}
                    disabled={isProcessing}
                  />

                  {/* Simulation Controls for testing outcomes */}
                  <div className="trav-simulation-panel" data-testid="simulation-outcome-controls">
                    <h3 className="trav-simulation-title">
                      🧪 Test Simulation Outcome (Demo Mode Control)
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                      Select how you would like the Mock Payment Adapter to respond when processing:
                    </p>
                    <div className="trav-simulation-options" role="radiogroup" aria-label="Simulated payment outcome">
                      <label className={`trav-simulation-label ${simulatedOutcome === 'SUCCESS' ? 'is-active' : ''}`}>
                        <input
                          type="radio"
                          name="simOutcome"
                          value="SUCCESS"
                          checked={simulatedOutcome === 'SUCCESS'}
                          onChange={() => dispatch(setSimulatedOutcome('SUCCESS'))}
                        />
                        <span>Simulate Success (Approved)</span>
                      </label>
                      <label className={`trav-simulation-label ${simulatedOutcome === 'FAILURE' ? 'is-active' : ''}`}>
                        <input
                          type="radio"
                          name="simOutcome"
                          value="FAILURE"
                          checked={simulatedOutcome === 'FAILURE'}
                          onChange={() => dispatch(setSimulatedOutcome('FAILURE'))}
                        />
                        <span>Simulate Card Decline / Failure</span>
                      </label>
                      <label className={`trav-simulation-label ${simulatedOutcome === 'CANCEL' ? 'is-active' : ''}`}>
                        <input
                          type="radio"
                          name="simOutcome"
                          value="CANCEL"
                          checked={simulatedOutcome === 'CANCEL'}
                          onChange={() => dispatch(setSimulatedOutcome('CANCEL'))}
                        />
                        <span>Simulate User Cancellation</span>
                      </label>
                    </div>
                  </div>

                  <div className="trav-checkout-actions">
                    <button
                      type="button"
                      className="trav-btn-secondary"
                      disabled={isProcessing}
                      onClick={() => dispatch(setCheckoutStep(1))}
                    >
                      ← Back to Details
                    </button>
                    <button
                      type="button"
                      className="trav-btn-primary"
                      disabled={isProcessing}
                      onClick={handleProcessPayment}
                      data-testid="btn-process-payment"
                    >
                      {isProcessing
                        ? 'Processing Demo Payment...'
                        : `Pay Demo Amount (${formatCurrency(totalAmount)})`}
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Sticky Booking Summary & Pricing Breakdown */}
            <aside className="trav-checkout-sidebar-col">
              <div className="trav-checkout-sidebar-sticky">
                <BookingSummaryCard booking={cardBooking} pricing={cardPricing} />

                {/* Prominent Total Payable Banner */}
                <div className="trav-payable-highlight-card">
                  <div className="trav-payable-row">
                    <div>
                      <span className="trav-payable-label">Total Payable Amount</span>
                      <span className="trav-payable-sublabel">Inclusive of all demo taxes &amp; fees</span>
                    </div>
                    <div className="trav-payable-amount">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Security & Reassurance Card */}
                <div className="trav-checkout-trust-card">
                  <div className="trav-trust-item">
                    <span className="trav-trust-icon" aria-hidden="true">🔒</span>
                    <div>
                      <span className="trav-trust-title">Safe &amp; Encrypted</span>
                      <span className="trav-trust-desc">Simulated 256-bit SSL session</span>
                    </div>
                  </div>
                  <div className="trav-trust-item">
                    <span className="trav-trust-icon" aria-hidden="true">⚡</span>
                    <div>
                      <span className="trav-trust-title">Instant Confirmation</span>
                      <span className="trav-trust-desc">Demo reservation voucher issued</span>
                    </div>
                  </div>
                  <div className="trav-trust-item">
                    <span className="trav-trust-icon" aria-hidden="true">🛡️</span>
                    <div>
                      <span className="trav-trust-title">Zero Risk Simulation</span>
                      <span className="trav-trust-desc">Powered by Mock Payment Adapter</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          /* Step 3: Confirmation / Outcome */
          <section className="trav-checkout-content-card trav-checkout-outcome-card" data-testid="checkout-step-confirmation">
            {paymentResult?.success ? (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-success">
                <div className="trav-confirm-icon-success" aria-hidden="true">✓</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', margin: '0 0 0.5rem 0' }}>
                  Demo Payment Successful!
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  Your simulated reservation has been recorded in Demo Mode. No real financial charges were made.
                </p>

                <div className="trav-receipt-card" data-testid="demo-receipt">
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      DEMO RECEIPT — NO REAL PAYMENT
                    </span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Receipt Reference:</span>
                    <strong>{paymentResult.receiptId}</strong>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Simulated Order ID:</span>
                    <span>{paymentResult.orderId}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Payment Method:</span>
                    <span style={{ textTransform: 'uppercase' }}>{paymentResult.method}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Lead Traveller:</span>
                    <span>{travellerDetails.firstName} {travellerDetails.lastName}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Reservation:</span>
                    <span>{cardBooking.title}</span>
                  </div>
                  <div className="trav-receipt-row">
                    <span>Guests / Party:</span>
                    <strong data-testid="receipt-guest-count">
                      {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                    </strong>
                  </div>
                  {isStay && (
                    <div className="trav-receipt-row">
                      <span>Rooms:</span>
                      <strong>{roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}</strong>
                    </div>
                  )}
                  <div className="trav-receipt-row">
                    <span>Simulated Amount:</span>
                    <span style={{ color: '#15803d' }}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {createdExperience ? (
                  <div style={{ maxWidth: 520, margin: '1.25rem auto 0', textAlign: 'left' }}>
                    <ExperienceGuidePanel booking={createdExperience} askFirst />
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => safeNavigate(['plan', 'package', 'trip'].includes(itemType) ? '/Traveller/trips' : '/Traveller/bookings')}
                  >
                    {['plan', 'package', 'trip'].includes(itemType) ? 'View in My Trips' : 'View in My Bookings'}
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => safeNavigate('/Traveller/dashboard')}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : paymentResult?.status === 'CANCELLED' ? (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-cancelled">
                <div className="trav-confirm-icon-cancel" aria-hidden="true">⚠️</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', margin: '0 0 0.5rem 0' }}>
                  Simulated Payment Cancelled
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  {paymentResult.errorMessage || 'The payment session was cancelled. No charges occurred.'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => safeNavigate('/Traveller/browse')}
                  >
                    Exit Checkout
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => dispatch(setCheckoutStep(2))}
                  >
                    Try Another Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="trav-confirmation-view" data-testid="checkout-outcome-failed">
                <div className="trav-confirm-icon-error" aria-hidden="true">✕</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', margin: '0 0 0.5rem 0' }}>
                  Simulated Payment Failed
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                  {errorMessage || 'The demo payment was declined by the simulated payment processor.'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="trav-btn-secondary"
                    onClick={() => safeNavigate('/Traveller/dashboard')}
                  >
                    Return to Dashboard
                  </button>
                  <button
                    type="button"
                    className="trav-btn-primary"
                    onClick={() => dispatch(setCheckoutStep(2))}
                  >
                    Retry Payment (Change Method/Outcome)
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function TravellerCheckoutWithRouter(props) {
  const navigate = useNavigate();
  const location = useLocation();
  return <TravellerCheckoutCore {...props} navigate={navigate} location={location} inRouter />;
}

export default function TravellerCheckoutPage(props) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <TravellerCheckoutWithRouter {...props} />
  ) : (
    <TravellerCheckoutCore {...props} navigate={null} location={null} inRouter={false} />
  );
}

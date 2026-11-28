import { createAsyncThunk } from '@reduxjs/toolkit';
import { createBooking, getHotel, listRooms } from '@/services/hotels.api.js';
import { createExperienceBooking, getExperience } from '@/services/partners.api.js';
import { getPaymentAdapter } from '@/services/paymentService.js';
import { getPlanById, getPlanCapacity } from '@/services/plans.api.js';
import { createTrip } from '@/services/tripGuides.api.js';
import {
  validateExperienceBooking,
  validateHotelRoomBooking,
  validatePackageBooking,
} from '@/utils/bookingValidationUtils.js';

export const processCheckoutPayment = createAsyncThunk(
  'traveller/checkout/processCheckoutPayment',
  async (
    {
      selectedItem,
      guestCount,
      roomCount = 1,
      travellerDetails,
      selectedMethod = 'upi',
      simulatedOutcome = 'SUCCESS',
      totalAmount,
      activeUserId,
      adapterMode = 'mock',
    },
    { getState, rejectWithValue },
  ) => {
    if (!activeUserId) {
      return rejectWithValue({
        message: 'Authentication required. Please sign in to your traveller account before completing checkout.',
        keepStep: true,
      });
    }

    const bookingType = (selectedItem?.type || '').toLowerCase();
    const todayIso = new Date().toISOString().split('T')[0];

    // Verify hotel, room capacity & inventory in backend BEFORE creating order / charging payment
    if (bookingType === 'hotel' || !bookingType) {
      if (!selectedItem?.id) {
        return rejectWithValue({
          message: 'No hotel selected. Please choose a valid property to book.',
          keepStep: true,
        });
      }

      try {
        const hotelRecord = await getHotel(selectedItem.id);
        if (!hotelRecord || (hotelRecord.status && hotelRecord.status !== 'active')) {
          return rejectWithValue({
            message: `The selected hotel (${selectedItem.title || selectedItem.name || selectedItem.id}) is currently unavailable for booking. Please select an active property.`,
            keepStep: true,
          });
        }

        let roomsList = [];
        try {
          roomsList = await listRooms(selectedItem.id);
        } catch (roomErr) {
          if (roomErr?.status !== 404) throw roomErr;
        }

        const requestedRoomType = String(selectedItem.roomType || '').trim();
        let matchedRoom = null;
        if (Array.isArray(roomsList) && roomsList.length > 0) {
          matchedRoom = roomsList.find(
            (r) =>
              (selectedItem.roomId && r.id === selectedItem.roomId) ||
              (requestedRoomType && String(r.type || '').trim().toLowerCase() === requestedRoomType.toLowerCase()),
          );
          if (!matchedRoom && !requestedRoomType) {
            matchedRoom = roomsList.find((r) => String(r.status || 'active').toLowerCase() !== 'inactive') || roomsList[0];
          }
        } else {
          matchedRoom = {
            type: requestedRoomType || 'Standard Room',
            availableRooms:
              selectedItem.availableRooms ??
              hotelRecord.availableRooms ??
              Math.max(1, Number(roomCount) || 1),
            maxOccupancy: Number(selectedItem.maxOccupancy || 0),
            status: 'active',
          };
        }

        const hotelCheckIn = selectedItem.checkIn || todayIso;
        const hotelCheckOut =
          selectedItem.checkOut || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
        const validation = validateHotelRoomBooking({
          hotel: hotelRecord,
          room: matchedRoom,
          roomsCount: Number(roomCount) || 1,
          guestsCount: Number(guestCount) || 1,
          checkIn: hotelCheckIn,
          checkOut: hotelCheckOut,
          today: todayIso,
        });
        if (!validation.valid) {
          return rejectWithValue({
            message: validation.error,
            keepStep: true,
          });
        }
      } catch (checkErr) {
        const notFound =
          checkErr?.status === 404 ||
          String(checkErr?.message || '').toLowerCase().includes('not found');
        return rejectWithValue({
          message: notFound
            ? `The selected hotel (${selectedItem.title || selectedItem.name || selectedItem.id}) is not integrated with the reservation backend. Please select an available property.`
            : (checkErr?.message || 'Unable to verify hotel availability.'),
          keepStep: true,
        });
      }
    } else if (bookingType === 'experience') {
      if (!selectedItem?.id) {
        return rejectWithValue({
          message: 'No experience selected. Please choose a valid experience to book.',
          keepStep: true,
        });
      }

      try {
        const expRecord = await getExperience(selectedItem.id);
        const expDate = selectedItem.checkIn || selectedItem.date || todayIso;
        const validation = validateExperienceBooking({
          experience: expRecord,
          date: expDate,
          participants: Number(guestCount) || 1,
          today: todayIso,
        });
        if (!validation.valid) {
          return rejectWithValue({
            message: validation.error,
            keepStep: true,
          });
        }
      } catch (expErr) {
        return rejectWithValue({
          message: expErr?.message || 'Unable to verify experience session availability.',
          keepStep: true,
        });
      }
    } else if (bookingType === 'plan' || bookingType === 'package' || bookingType === 'trip') {
      const targetPlanId = selectedItem?.id || selectedItem?.planId;
      if (!targetPlanId) {
        return rejectWithValue({
          message: 'No tour package selected. Please choose a valid package to book.',
          keepStep: true,
        });
      }
      try {
        // Re-check availability right before payment: inventory or capacity may have changed
        // since the detail page loaded (the server checks again when the trip is created).
        const [planRecord, bookingQuote] = await Promise.all([
          getPlanById(targetPlanId),
          getPlanCapacity(targetPlanId),
        ]);
        if (bookingQuote && bookingQuote.bookable === false) {
          return rejectWithValue({
            message: bookingQuote.issues?.[0] || 'This tour package cannot be booked right now.',
            keepStep: true,
          });
        }
        if (Number.isFinite(bookingQuote?.maxGuests) && Number(guestCount) > bookingQuote.maxGuests) {
          return rejectWithValue({
            message: `Only ${bookingQuote.maxGuests} guest(s) can be booked on this package. Please reduce the number of guests.`,
            keepStep: true,
          });
        }
        const startDate =
          selectedItem.checkIn ||
          selectedItem.itinerary?.day1?.hotel?.checkInDate ||
          planRecord?.itinerary?.day1?.hotel?.checkInDate ||
          todayIso;
        const endDate =
          selectedItem.checkOut ||
          selectedItem.itinerary?.day1?.hotel?.checkOutDate ||
          planRecord?.itinerary?.day1?.hotel?.checkOutDate ||
          '';
        const validation = validatePackageBooking({
          plan: planRecord,
          guestsCount: Number(guestCount) || 1,
          checkIn: startDate,
          checkOut: endDate,
          today: todayIso,
        });
        if (!validation.valid) {
          return rejectWithValue({
            message: validation.error,
            keepStep: true,
          });
        }
      } catch (planErr) {
        return rejectWithValue({
          message: planErr?.message || 'Unable to verify package availability.',
          keepStep: true,
        });
      }
    }

    let stablePaymentId = getState()?.traveller?.checkout?.persistenceId || null;

    try {
      const paymentAdapter = getPaymentAdapter({ mode: adapterMode });

      // 1. Create simulated order
      const order = await paymentAdapter.createOrder({
        bookingId: selectedItem?.id || 'demo-booking-1',
        bookingType: bookingType || 'hotel',
        amount: totalAmount,
        guestCount: Number(guestCount),
        travellerDetails,
      });

      // 2. Process / verify outcome via adapter
      const result = await paymentAdapter.verifyPayment({
        orderId: order.orderId,
        method: selectedMethod,
        simulatedOutcome,
      });

      if (!result.success) {
        return {
          outcome: 'NON_SUCCESS',
          result,
          errorMessage: result.errorMessage || 'Simulated payment was not successful.',
        };
      }

      // 3. Persist to real backend (only if payment succeeded and not yet persisted)
      const alreadyPersisted = Boolean(getState()?.traveller?.checkout?.hasPersisted);
      let createdBooking = null;
      let createdExperience = null;
      let createdTrip = null;

      if (!alreadyPersisted) {
        if (!stablePaymentId) {
          stablePaymentId = result.paymentId || `pay-${Date.now()}`;
        }

        const guestFullName =
          [travellerDetails?.firstName, travellerDetails?.lastName].filter(Boolean).join(' ') || 'Anjali Sharma';
        const guestEmail = travellerDetails?.email || 'anjali@xploreo.com';
        const guestPhone = travellerDetails?.phone || '+91 9876543210';

        if (bookingType === 'plan' || bookingType === 'package' || bookingType === 'trip') {
          createdTrip = await createTrip({
            id: `trip-${stablePaymentId}`,
            travellerId: activeUserId,
            planId: selectedItem.id || selectedItem.planId || 'plan-1',
            itinerary: selectedItem.itinerary,
            travellers: Number(guestCount) || 1,
          });
        } else if (bookingType === 'experience') {
          createdExperience = await createExperienceBooking({
            id: `eb-${stablePaymentId}`,
            experienceId: selectedItem.id,
            guestName: guestFullName,
            email: guestEmail,
            phone: guestPhone,
            date: selectedItem.checkIn || selectedItem.date || new Date().toISOString().split('T')[0],
            participants: Number(guestCount) || 1,
          });
        } else {
          const today = new Date();
          const checkIn = selectedItem.checkIn || today.toISOString().split('T')[0];
          const checkOut =
            selectedItem.checkOut || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
          createdBooking = await createBooking({
            id: `b-${stablePaymentId}`,
            hotelId: selectedItem.id,
            guestName: guestFullName,
            email: guestEmail,
            phone: guestPhone,
            checkIn,
            checkOut,
            guests: Number(guestCount) || 1,
            roomType: selectedItem.roomType || 'Standard Room',
            rooms: roomCount,
            notes: travellerDetails?.specialRequests || 'Booked via checkout',
          });
        }
      }

      return {
        outcome: 'SUCCEEDED',
        result,
        createdBooking,
        createdExperience,
        createdTrip,
        persistenceId: stablePaymentId,
      };
    } catch (err) {
      return rejectWithValue({
        message: err?.message || 'Payment processing failed.',
        persistenceId: stablePaymentId,
      });
    }
  },
);

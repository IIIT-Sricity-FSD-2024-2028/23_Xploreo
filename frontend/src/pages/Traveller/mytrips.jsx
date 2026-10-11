import TravellerBookingsList from './TravellerBookingsList.jsx';
import BookingDetailsView from './BookingDetailsView.jsx';

/**
 * Traveller Bookings Page
 * Primary entry point for traveller bookings in the React router.
 * 
 * DESIGN CONVENTION COMPLIANCE:
 * - Does not use raw fetch, Axios, localStorage, or duplicate Auth.
 * - Accepts data via props for direct testability and parent container composition.
 * - When used in route without props, renders standard presentation view.
 */
export default function TravellerBookingsPage(props) {
  return <TravellerBookingsList {...props} />;
}

export { TravellerBookingsList, BookingDetailsView };

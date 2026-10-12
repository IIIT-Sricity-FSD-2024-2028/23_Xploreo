import TravellerBookingsList from './TravellerBookingsList.jsx';
import BookingDetailsView from './BookingDetailsView.jsx';
import TravellerTripsList from './TravellerTripsList.jsx';
import TravellerTripDetailsView from './TravellerTripDetailsView.jsx';
import TripLiveTrackerWidget from './TripLiveTrackerWidget.jsx';

/**
 * Traveller Bookings & Trips Hub
 * 
 * Supports view modes via props:
 * - mode="trips": Displays trips and live tracking view.
 * - mode="bookings" (default): Displays booking history and details.
 */
export default function TravellerTripsPage({ mode = 'trips', ...props }) {
  if (mode === 'bookings') {
    return <TravellerBookingsList {...props} />;
  }

  return <TravellerTripsList {...props} />;
}

export {
  TravellerBookingsList,
  BookingDetailsView,
  TravellerTripsList,
  TravellerTripDetailsView,
  TripLiveTrackerWidget,
};

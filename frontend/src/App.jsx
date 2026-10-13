import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './App.css';

import ProtectedRoute from './routes/ProtectedRoutes';

import Landing from './pages/Home/landing';
import Partners from './pages/Home/partners';
import Tours from './pages/Home/tours';
import Support from './pages/Home/support';
import Bookings from './pages/Hotel/bookings';
import GuideDashboard from './pages/Guide/dashboard';
import ExperienceDashboard from './pages/Experience/dashboard';
import Login from './pages/Auth/login';
import Register from './pages/Auth/register';

// M5 Traveller Pages
import TravellerDashboard from './pages/Traveller/TravellerDashboard';
import TravellerBrowsePage from './pages/Traveller/TravellerBrowsePage';
import TravellerBookingsList from './pages/Traveller/TravellerBookingsList';
import TravellerTripsList from './pages/Traveller/TravellerTripsList';
import TravellerReviewsPage from './pages/Traveller/TravellerReviewsPage';
import TravellerSupportTicketForm from './pages/Traveller/TravellerSupportTicketForm';
import TravellerCheckoutPage from './pages/Traveller/TravellerCheckoutPage';

const guest = { username: 'Guest', role: 'default' };

function savedUser() {
  if (typeof localStorage === 'undefined') return guest;
  try {
    return JSON.parse(localStorage.getItem('xploreoUser')) || guest;
  } catch {
    return guest;
  }
}

function App() {
  const [user, setUser] = useState(savedUser);
  const authenticate = (account) => setUser(account);

  const travellerId = user?.userId || user?.id || 'trav-usr-20001';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing user={user} />} />
        <Route path="/Home/partners" element={<Partners user={user} />} />
        <Route path="/Home/tours" element={<Tours user={user} />} />
        <Route path="/Home/support" element={<Support user={user} />} />

        {/* Authentication Routes */}
        <Route
          path="/Auth/login"
          element={<Login user={user} onAuthenticated={authenticate} />}
        />
        <Route
          path="/Auth/register"
          element={<Register user={user} onAuthenticated={authenticate} />}
        />

        {/* Partner Role Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['guide']} user={user} />}>
          <Route path="/Guide/dashboard" element={<GuideDashboard user={user} />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['hotel']} user={user} />}>
          <Route path="/Hotel/bookings" element={<Bookings user={user} />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['experience']} user={user} />}>
          <Route
            path="/Experience/dashboard"
            element={<ExperienceDashboard user={user} />}
          />
        </Route>

        {/* M5 Traveller Role Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['traveller']} user={user} />}>
          <Route
            path="/Traveller/dashboard"
            element={
              <TravellerDashboard
                user={user}
                currentTravellerId={travellerId}
              />
            }
          />
          <Route
            path="/Traveller/browse"
            element={<TravellerBrowsePage user={user} />}
          />
          <Route
            path="/Traveller/bookings"
            element={
              <TravellerBookingsList
                user={user}
                currentTravellerId={travellerId}
              />
            }
          />
          <Route
            path="/Traveller/trips"
            element={
              <TravellerTripsList
                user={user}
                currentTravellerId={travellerId}
              />
            }
          />
          <Route
            path="/Traveller/reviews"
            element={
              <TravellerReviewsPage
                user={user}
                currentTravellerId={travellerId}
              />
            }
          />
          <Route
            path="/Traveller/tickets"
            element={
              <TravellerSupportTicketForm
                user={user}
                currentTravellerId={travellerId}
              />
            }
          />
          <Route
            path="/Traveller/checkout"
            element={<TravellerCheckoutPage user={user} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
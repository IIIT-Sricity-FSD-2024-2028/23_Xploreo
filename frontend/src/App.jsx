import { Provider } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { store } from "./store/index.js";
import ProtectedRoute from "./routes/ProtectedRoutes";
import Login from "./pages/Auth/login";
import Register from "./pages/Auth/register";
import ForgotPassword from "./pages/Auth/forgotPassword";
import ResetPassword from "./pages/Auth/resetPassword";
import UnauthorizedPage from "./pages/Unauthorized";
import Landing from "./pages/Home/landing";
import Partners from "./pages/Home/partners";
import Tours from "./pages/Home/tours";
import Support from "./pages/Home/support";

// Portals
import { guidePortal } from "./routes/guide.routes.jsx";
import { experiencePortal } from "./routes/experience.routes.jsx";
import { hotelPortal } from "./routes/hotel.routes.jsx";
import { travellerDetailRoutes } from "./routes/travellerDetail.routes.jsx";
import { superadminPortal } from "./routes/superadmin.routes.jsx";
import { nontechadminPortal } from "./routes/nontechadmin.routes.jsx";
import { techadminPortal } from "./routes/techadmin.routes.jsx";

// M5 Traveller Pages
import TravellerDashboard from "./pages/Traveller/TravellerDashboard";
import TravellerBrowsePage from "./pages/Traveller/TravellerBrowsePage";
import TravellerBookingsList from "./pages/Traveller/TravellerBookingsList";
import TravellerTripsList from "./pages/Traveller/TravellerTripsList";
import TravellerReviewsPage from "./pages/Traveller/TravellerReviewsPage";
import TravellerSupportTicketsPage from "./pages/Traveller/TravellerSupportTicketsPage";
import TravellerCheckoutPage from "./pages/Traveller/TravellerCheckoutPage";

function AppRoutes() {
  const { user, isAuthenticated, role } = useAuth();
  const travellerId = user?.userId || user?.id || user?.username || '20001';
  const normalizedRole = String(role || "").trim().toLowerCase();
  const homeForRole = {
    traveller: "/Traveller/dashboard",
    guide: "/guide/dashboard",
    hotel: "/hotel/dashboard",
    experience: "/experience/home",
    superadmin: "/superadmin/dashboard",
    nontechadmin: "/nta/dashboard",
    techadmin: "/tech-admin/dashboard",
  }[normalizedRole] || "/";

  return (
    <Routes>
      {/* Public Home Routes */}
      <Route path="/" element={<Landing user={user} />} />
      <Route path="/Home/landing" element={<Landing user={user} />} />
      <Route path="/Home/partners" element={<Partners user={user} />} />
      <Route path="/Home/tours" element={<Tours user={user} />} />
      <Route path="/Home/support" element={<Support user={user} />} />

      {/* Authentication Routes */}
      <Route path="/Auth/login" element={<Login user={user} />} />
      <Route path="/Auth/register" element={<Register user={user} />} />
      <Route path="/login" element={<Navigate to="/Auth/login" replace />} />
      <Route path="/register" element={<Navigate to="/Auth/register" replace />} />
      <Route path="/Auth/forgot-password" element={<ForgotPassword user={user} />} />
      <Route path="/Auth/reset-password" element={<ResetPassword user={user} />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Partner and Admin Portals */}
      <Route element={<ProtectedRoute allowedRoles={["guide"]} user={user} />}>
        <Route path={guidePortal.basePath} element={<guidePortal.layout />}>
          {guidePortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["hotel"]} user={user} />}>
        <Route path={hotelPortal.basePath} element={<hotelPortal.layout />}>
          {hotelPortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["experience"]} user={user} />}>
        <Route path={experiencePortal.basePath} element={<experiencePortal.layout />}>
          {experiencePortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["superadmin"]} user={user} />}>
        <Route path={superadminPortal.basePath} element={<superadminPortal.layout />}>
          {superadminPortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["nontechadmin"]} user={user} />}>
        <Route path={nontechadminPortal.basePath} element={<nontechadminPortal.layout />}>
          {nontechadminPortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["techadmin"]} user={user} />}>
        <Route path={techadminPortal.basePath} element={<techadminPortal.layout />}>
          {techadminPortal.routes.map((route) => (
            <Route key={route.path ?? "index"} {...route} />
          ))}
        </Route>
      </Route>

      {/* Traveller Detail Routes (M3) */}
      {travellerDetailRoutes.map((route) => (
        <Route key={route.path} {...route} />
      ))}

      {/* M5 Traveller Role Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={["traveller"]} user={user} />}>
        <Route
          path="/Traveller/dashboard"
          element={<TravellerDashboard user={user} currentTravellerId={travellerId} />}
        />
        <Route
          path="/Traveller/browse"
          element={<TravellerBrowsePage user={user} />}
        />
        <Route
          path="/Traveller/bookings"
          element={<TravellerBookingsList user={user} currentTravellerId={travellerId} />}
        />
        <Route
          path="/Traveller/trips"
          element={<TravellerTripsList user={user} currentTravellerId={travellerId} />}
        />
        <Route
          path="/Traveller/reviews"
          element={<TravellerReviewsPage user={user} currentTravellerId={travellerId} />}
        />
        <Route
          path="/Traveller/tickets"
          element={<TravellerSupportTicketsPage user={user} currentTravellerId={travellerId} />}
        />
        <Route
          path="/Traveller/checkout"
          element={<TravellerCheckoutPage user={user} />}
        />
      </Route>

      {/* Route Aliases & Catch-all */}
      <Route path="/Traveller" element={<Navigate to="/Traveller/dashboard" replace />} />
      <Route path="/superadmin/opsbook" element={<Navigate to="/superadmin/operations" replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? homeForRole : "/"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  );
}

export default App;

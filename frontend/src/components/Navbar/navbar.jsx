import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation, useInRouterContext } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationBell from "../notifications/NotificationBell.jsx";
import "./navbar.css";

const publicLinks = [
  ["Home", "/"],
  ["Partners", "/Home/partners"],
  ["Tours", "/Home/tours"],
  ["Support", "/Home/support"],
];

const portalLabels = {
  superadmin: "SuperAdmin Dashboard",
  nontechadmin: "Regional Dashboard",
  techadmin: "TechAdmin Dashboard",
  guide: "Guide Portal",
  hotel: "Hotel Portal",
  experience: "Experience Portal",
  traveller: "My Trips",
};

const portalDestinations = {
  superadmin: "/superadmin/dashboard",
  nontechadmin: "/nta/dashboard",
  techadmin: "/tech-admin/dashboard",
  guide: "/guide/dashboard",
  hotel: "/hotel/dashboard",
  experience: "/experience/home",
  traveller: "/Traveller/dashboard",
};

const TRAVELLER_NAV_LINKS = [
  {
    to: "/Traveller/dashboard",
    label: "Dashboard",
    icon: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    icon2: <polyline points="9 22 9 12 15 12 15 22" />,
  },
  {
    to: "/Traveller/bookings",
    label: "Bookings",
    icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
    icon2: (
      <>
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    to: "/Traveller/trips",
    label: "Trips",
    icon: <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />,
    icon2: (
      <>
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
];

const TRAVELLER_DROPDOWN_LINKS = [
  { to: "/Traveller/tickets", label: "Support Tickets" },
  { to: "/Traveller/reviews", label: "My Reviews" },
];

const GUIDE_NAV_LINKS = [
  {
    to: "/guide/dashboard",
    label: "Dashboard",
    icon: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    icon2: <polyline points="9 22 9 12 15 12 15 22" />,
  },
  {
    to: "/guide/tours",
    label: "Tours",
    icon: <circle cx="12" cy="12" r="10" />,
    icon2: <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />,
  },
  {
    to: "/guide/earnings",
    label: "Earnings",
    icon: <line x1="12" y1="1" x2="12" y2="23" />,
    icon2: <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  {
    to: "/guide/reviews",
    label: "Reviews",
    icon: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
    icon2: null,
  },
];

const GUIDE_DROPDOWN_LINKS = [
  { to: "/guide/support", label: "Support" },
  { to: "/guide/profile", label: "My Profile" },
];

const HOTEL_NAV_LINKS = [
  { to: "/hotel/dashboard", label: "Dashboard", icon: GUIDE_NAV_LINKS[0].icon, icon2: GUIDE_NAV_LINKS[0].icon2 },
  {
    to: "/hotel/properties",
    label: "Properties",
    icon: <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />,
    icon2: <path d="M3 21h18M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />,
  },
  {
    to: "/hotel/rooms",
    label: "Services",
    icon: <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />,
    icon2: <path d="M3 21h18M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />,
  },
  { to: "/hotel/bookings", label: "Bookings", icon: TRAVELLER_NAV_LINKS[1].icon, icon2: TRAVELLER_NAV_LINKS[1].icon2 },
  { to: "/hotel/earnings", label: "Earnings", icon: GUIDE_NAV_LINKS[2].icon, icon2: GUIDE_NAV_LINKS[2].icon2 },
  { to: "/hotel/reviews", label: "Reviews", icon: GUIDE_NAV_LINKS[3].icon, icon2: null },
];

const HOTEL_DROPDOWN_LINKS = [
  { to: "/hotel/support", label: "Support Tickets" },
  { to: "/hotel/profile", label: "My Profile" },
];

const EXPERIENCE_NAV_LINKS = [
  {
    to: "/experience/home",
    label: "Home",
    icon: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    icon2: <polyline points="9 22 9 12 15 12 15 22" />,
  },
  {
    to: "/experience/bookings",
    label: "Bookings",
    icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
    icon2: (
      <>
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    to: "/experience/catalog",
    label: "Experiences",
    icon: <circle cx="12" cy="12" r="10" />,
    icon2: <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />,
  },
  {
    to: "/experience/earnings",
    label: "Earnings",
    icon: <line x1="12" y1="1" x2="12" y2="23" />,
    icon2: <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
];

const EXPERIENCE_DROPDOWN_LINKS = [
  { to: "/experience/support", label: "Support" },
  { to: "/experience/profile", label: "My Profile" },
];

// Shared visual shell for Traveller and Guide: identical markup/classes, only the nav
// destinations and dropdown links differ per role.
function TravellerStyleNavbar({ displayName, initial, user, dropdownOpen, setDropdownOpen, onLogout, navLinks, dropdownLinks }) {
  return (
    <header className="site-header traveller-header">
      <nav className="navbar navbar-traveler" aria-label="Portal navigation">
        <Link to="/" className="navbar-logo" aria-label="Xploreo home">
          <img src={logo} alt="Logo" />
          <div className="navbar-title navbar-title-pacifico">Xploreo</div>
        </Link>
        <div className="navbar-links">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className="navbar-link">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {link.icon}
                {link.icon2}
              </svg>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="navbar-user-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell userId={user?.userId || user?.id} />
          <span className="navbar-user-greeting">Hello, {displayName} 👋</span>
          <button
            type="button"
            className="navbar-avatar-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="User profile menu"
          >
            <span className="navbar-avatar-initial">{initial}</span>
          </button>
          {dropdownOpen && (
            <div className="navbar-profile-dropdown">
              <div className="dropdown-header">
                <p className="dropdown-name">{user?.name || user?.username}</p>
                <p className="dropdown-email">{user?.email || user?.userId || 'Account'}</p>
              </div>
              <hr className="dropdown-divider" />
              {dropdownLinks.map((link) => (
                <Link key={link.to} to={link.to} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <hr className="dropdown-divider" />
              <button type="button" className="dropdown-item dropdown-logout" onClick={onLogout}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function Navbar({ user: propUser, isPublic = false } = {}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const inRouter = useInRouterContext();
  const location = inRouter ? useLocation() : null;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const user = propUser || auth?.user || { role: "default" };
  const role = (user?.role || "default").toLowerCase();

  const pathname = location?.pathname || "";
  const isPublicRoute =
    isPublic ||
    pathname === "/" ||
    pathname === "/Home/landing" ||
    pathname.startsWith("/Home/") ||
    pathname.startsWith("/Auth/");

  const signedIn = !isPublicRoute && role && role !== "default";

  const displayName = user?.name ? user.name.split(" ")[0] : (user?.username || "Traveller");
  const initial = (user?.name || user?.username || "T").charAt(0).toUpperCase();

  const handleLogout = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("xploreoUser");
      localStorage.removeItem("currentUser");
    }
    auth?.logout();
    setDropdownOpen(false);
    navigate("/Auth/login");
  };

  if (!isPublicRoute && role === "traveller") {
    return (
      <TravellerStyleNavbar
        displayName={displayName}
        initial={initial}
        user={user}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        onLogout={handleLogout}
        navLinks={TRAVELLER_NAV_LINKS}
        dropdownLinks={TRAVELLER_DROPDOWN_LINKS}
      />
    );
  }

  // Guide uses the exact same visual system as Traveller (same markup, same .navbar-traveler
  // theme) — only the nav destinations and dropdown links differ.
  if (!isPublicRoute && role === "guide") {
    return (
      <TravellerStyleNavbar
        displayName={displayName}
        initial={initial}
        user={user}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        onLogout={handleLogout}
        navLinks={GUIDE_NAV_LINKS}
        dropdownLinks={GUIDE_DROPDOWN_LINKS}
      />
    );
  }

  if (!isPublicRoute && role === "hotel") {
    return (
      <TravellerStyleNavbar
        displayName={user?.businessName || displayName}
        initial={initial}
        user={user}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        onLogout={handleLogout}
        navLinks={HOTEL_NAV_LINKS}
        dropdownLinks={HOTEL_DROPDOWN_LINKS}
      />
    );
  }

  // Experience partners use the exact same visual system as Traveller/Guide (same markup,
  // same .navbar-traveler theme) — only the nav destinations and dropdown links differ.
  if (!isPublicRoute && role === "experience") {
    return (
      <TravellerStyleNavbar
        displayName={displayName}
        initial={initial}
        user={user}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        onLogout={handleLogout}
        navLinks={EXPERIENCE_NAV_LINKS}
        dropdownLinks={EXPERIENCE_DROPDOWN_LINKS}
      />
    );
  }

  const portalPath = portalDestinations[role] || "/";
  const portalLabel = portalLabels[role] || "Dashboard";

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="navbar-logo" aria-label="Xploreo home">
          <img src={logo} alt="" />
          <span className="navbar-title">Xploreo</span>
        </Link>
        <div className="navbar-links">
          {publicLinks.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === "/"} className="navbar-link">
              {label}
            </NavLink>
          ))}
          {signedIn && (
            <NavLink to={portalPath} className="navbar-link" style={{ color: "#0f766e", fontWeight: 700 }}>
              {portalLabel}
            </NavLink>
          )}
        </div>
        {!signedIn ? (
          <div className="navbar-right">
            <Link to="/Auth/login" className="navbar-login">Log in</Link>
            <Link to="/Auth/register" className="navbar-btn">Get started</Link>
          </div>
        ) : (
          <div className="navbar-right" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="navbar-user" style={{ margin: 0 }}>
              {user?.name || user?.username || "Account"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="navbar-logout-btn"
              style={{
                background: "transparent",
                border: "1px solid rgba(15,76,76,0.2)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#547074",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

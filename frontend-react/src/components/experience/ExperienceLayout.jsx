import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';

// Same links, order and icons as the old navbar for the "experience" role (navlinks.js).
const LINKS = [
  { to: '/experience/home', label: 'Home', icon: 'dashboard.svg' },
  { to: '/experience/bookings', label: 'Bookings', icon: 'operations.png' },
  { to: '/experience/catalog', label: 'Experiences', icon: 'tours.svg' },
  { to: '/experience/earnings', label: 'Earnings', icon: 'earnings.svg' },
];

export default function ExperienceLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <Navbar links={LINKS} userName={user.name} profileTo="/experience/profile" onLogout={logout} />
      <Outlet />
    </>
  );
}

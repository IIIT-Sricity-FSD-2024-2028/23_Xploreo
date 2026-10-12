import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';
import '@/styles/experience.css';

const LINKS = [
  { to: '/experience/home', label: 'Home' },
  { to: '/experience/catalog', label: 'Catalog & slots' },
  { to: '/experience/bookings', label: 'Bookings' },
  { to: '/experience/earnings', label: 'Earnings' },
  { to: '/experience/profile', label: 'Profile' },
];

export default function ExperienceLayout() {
  const { user } = useAuth();
  return (
    <div className="exp-app">
      <Navbar brand="Xploreo · Experiences" links={LINKS} userLabel={`${user.name} · ${user.region}`} />
      <main className="exp-shell">
        <Outlet />
      </main>
    </div>
  );
}

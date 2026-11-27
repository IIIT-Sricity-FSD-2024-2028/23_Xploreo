import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';

const LINKS = [
  { to: '/nta/dashboard', label: 'Regional Dashboard', icon: 'dashboard.svg' },
  { to: '/nta/plans', label: 'Manage Packages', icon: 'tours.svg' },
  { to: '/nta/package-bookings', label: 'Package Bookings', icon: 'tours.svg' },
  { to: '/nta/guides', label: 'Guide Applications', icon: 'user.svg' },
];

export default function NtaLayout() {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.username || 'Non-Tech Admin';
  const regionTag = user?.region ? ` (${user.region})` : '';

  return (
    <>
      <Navbar
        links={LINKS}
        userName={`${displayName}${regionTag}`}
        profileTo="/nta/dashboard"
        onLogout={logout}
      />
      <main className="admin-portal-content">
        <Outlet />
      </main>
    </>
  );
}

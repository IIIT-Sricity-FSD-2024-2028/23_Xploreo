import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';

// The old guide navbar had Dashboard, Earnings and Reviews; Tours and Schedule were reachable only by URL
// (listed under "deviations" in MERGE_NOTES). Support lives in the profile menu, as in the old site.
const LINKS = [
  { to: '/guide/dashboard', label: 'Dashboard', icon: 'dashboard.svg' },
  { to: '/guide/tours', label: 'Tours', icon: 'tours.svg' },
  { to: '/guide/schedule', label: 'Schedule', icon: 'schedule.svg' },
  { to: '/guide/earnings', label: 'Earnings', icon: 'earnings.svg' },
  { to: '/guide/reviews', label: 'Reviews', icon: 'reviews.svg' },
];

export default function GuideLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <Navbar links={LINKS} userName={user.name} profileTo="/guide/profile" supportTo="/guide/support" onLogout={logout} />
      <Outlet />
    </>
  );
}

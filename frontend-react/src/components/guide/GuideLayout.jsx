import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';

// The old guide navbar (Dashboard, Earnings, Reviews, ...) arrives with the other guide pages in the next
// stage. Until then only the shared profile exists, reachable from the profile menu.
const LINKS = [];

export default function GuideLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <Navbar links={LINKS} userName={user.name} profileTo="/guide/profile" onLogout={logout} />
      <Outlet />
    </>
  );
}

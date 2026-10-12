import { Outlet } from 'react-router-dom';
import { Navbar, useAuth } from '@/foundation';
import '@/styles/experience.css';

// Guide portal pages (dashboard, tours, schedule, earnings, reviews, support) arrive in the next stage.
const LINKS = [{ to: '/guide/profile', label: 'Profile' }];

export default function GuideLayout() {
  const { user } = useAuth();
  return (
    <div className="exp-app">
      <Navbar brand="Xploreo · Guides" links={LINKS} userLabel={`${user.name} · ${user.region}`} />
      <main className="exp-shell">
        <Outlet />
      </main>
    </div>
  );
}

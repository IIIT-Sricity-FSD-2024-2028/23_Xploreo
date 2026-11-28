import { Navigate } from 'react-router-dom';
import NtaLayout from '@/components/nta/NtaLayout.jsx';
import NtaDashboardPage from '@/pages/NonTechAdmin/dashboard.jsx';
import PlansPage from '@/pages/NonTechAdmin/plans.jsx';
import NtaPackageBookingsPage from '@/pages/NonTechAdmin/packageBookings.jsx';
import GuidesPage from '@/pages/NonTechAdmin/guides.jsx';

export const nontechadminPortal = {
  basePath: '/nta',
  layout: NtaLayout,
  requires: { role: 'nontechadmin' },
  homePath: '/nta/dashboard',
  routes: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <NtaDashboardPage /> },
    { path: 'plans', element: <PlansPage /> },
    { path: 'package-bookings', element: <NtaPackageBookingsPage /> },
    { path: 'guides', element: <GuidesPage /> },
  ],
};

// M2: Experience portal routes. No guard logic here: the router wraps this descriptor in the role guard.
import { Navigate } from 'react-router-dom';
import ExperienceLayout from '@/components/experience/ExperienceLayout.jsx';
import ExperienceHome from '@/pages/Experience/ExperienceHome.jsx';
import ExperienceCatalog from '@/pages/Experience/ExperienceCatalog.jsx';
import ExperienceBookings from '@/pages/Experience/ExperienceBookings.jsx';
import ExperienceEarnings from '@/pages/Experience/ExperienceEarnings.jsx';
import PartnerProfile from '@/pages/Partner/PartnerProfile.jsx';

export const experiencePortal = {
  basePath: '/experience',
  layout: ExperienceLayout,
  requires: { partnerType: 'experience' },
  homePath: '/experience/home',
  routes: [
    { index: true, element: <Navigate to="home" replace /> },
    { path: 'home', element: <ExperienceHome /> },
    { path: 'catalog', element: <ExperienceCatalog /> },
    { path: 'bookings', element: <ExperienceBookings /> },
    { path: 'earnings', element: <ExperienceEarnings /> },
    { path: 'profile', element: <PartnerProfile /> },
  ],
};

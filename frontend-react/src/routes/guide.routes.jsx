// M2: Guide portal routes. No guard logic here: the router wraps this descriptor in the role guard.
import { Navigate } from 'react-router-dom';
import GuideLayout from '@/components/guide/GuideLayout.jsx';
import GuideDashboard from '@/pages/Guide/GuideDashboard.jsx';
import GuideTours from '@/pages/Guide/GuideTours.jsx';
import GuideEarnings from '@/pages/Guide/GuideEarnings.jsx';
import GuideReviews from '@/pages/Guide/GuideReviews.jsx';
import GuideSchedule from '@/pages/Guide/GuideSchedule.jsx';
import GuideSupport from '@/pages/Guide/GuideSupport.jsx';
import PartnerProfile from '@/pages/Partner/PartnerProfile.jsx';

export const guidePortal = {
  basePath: '/guide',
  layout: GuideLayout,
  requires: { partnerType: 'guide' },
  homePath: '/guide/dashboard',
  routes: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <GuideDashboard /> },
    { path: 'tours', element: <GuideTours /> },
    { path: 'schedule', element: <GuideSchedule /> },
    { path: 'earnings', element: <GuideEarnings /> },
    { path: 'reviews', element: <GuideReviews /> },
    { path: 'support', element: <GuideSupport /> },
    { path: 'profile', element: <PartnerProfile /> },
  ],
};

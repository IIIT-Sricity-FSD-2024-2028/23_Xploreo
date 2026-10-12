// M2: Guide portal routes. Only the shared profile exists so far; the other six guide pages
// (dashboard, tours, earnings, reviews, schedule, support) are the next stage.
import { Navigate } from 'react-router-dom';
import GuideLayout from '@/components/guide/GuideLayout.jsx';
import PartnerProfile from '@/pages/Partner/PartnerProfile.jsx';

export const guidePortal = {
  basePath: '/guide',
  layout: GuideLayout,
  requires: { partnerType: 'guide' },
  homePath: '/guide/profile',
  routes: [
    { index: true, element: <Navigate to="profile" replace /> },
    { path: 'profile', element: <PartnerProfile /> },
  ],
};

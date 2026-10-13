// Stylesheet bundles, one per kind of page, mirroring what each old HTML page linked.
//   <link href="../css/styles.css"> + <link href="../css/experiencestyles.css">  -> EXPERIENCE_CSS
//   <link href="../css/shared.css"> + <link href="../css/profile.css">           -> PROFILE_CSS
// `?inline` gives the CSS text (with @imports resolved) instead of adding it to the page.
import sharedCss from './css/shared.css?inline';
import stylesCss from './css/styles.css?inline';
import experienceCss from './css/experiencestyles.css?inline';
import profileCss from './css/profile.css?inline';
import guidePortalCss from './css/guide-portal.css?inline';
import dashboardCss from './css/dashboard.css?inline';
import hotelStyleCss from './css/hotelstyle.css?inline';
import toursCss from './css/tours.css?inline';
import trackingCss from './css/tracking.css?inline';
import earningsCss from './css/earnings.css?inline';
import reviewsCss from './css/reviews.css?inline';
import scheduleCss from './css/schedule.css?inline';
import moduleCrudCss from './css/module-crud.css?inline';
import supportCss from './css/support.css?inline';
import guideDashboardCss from './css/guide-dashboard.css?inline';
import guideEarningsCss from './css/guide-earnings.css?inline';
import guideReviewsCss from './css/guide-reviews.css?inline';
import guideCommonCss from '@/components/guide/guideCommon.css?inline';

export const NAVBAR_CSS = [sharedCss];
export const EXPERIENCE_CSS = [stylesCss, experienceCss];
export const PROFILE_CSS = [sharedCss, profileCss];

// Guide pages, in the order each old page linked its stylesheets (the styles the old JS injected come last).
export const GUIDE_DASHBOARD_CSS = [sharedCss, guidePortalCss, dashboardCss, hotelStyleCss, experienceCss, guideDashboardCss, guideCommonCss];
export const GUIDE_TOURS_CSS = [sharedCss, toursCss, trackingCss, guideCommonCss];
export const GUIDE_EARNINGS_CSS = [sharedCss, guidePortalCss, earningsCss, guideEarningsCss, guideCommonCss];
export const GUIDE_REVIEWS_CSS = [sharedCss, guidePortalCss, reviewsCss, moduleCrudCss, guideReviewsCss, guideCommonCss];
export const GUIDE_SCHEDULE_CSS = [sharedCss, scheduleCss, moduleCrudCss, guideCommonCss];
export const GUIDE_SUPPORT_CSS = [sharedCss, supportCss, guideCommonCss];

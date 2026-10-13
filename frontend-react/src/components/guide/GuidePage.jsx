import { usePageStyles } from '@/lib/usePageStyles.js';

// Wraps a guide page the way the old HTML did: the page's own stylesheets while it is mounted, and either
//   <main id="main" class="page-wrapper"> (dashboard, tours)   or   <div id="main"> (earnings, reviews, ...).
export default function GuidePage({ css, title, bodyClass = '', pageWrapper = false, children }) {
  usePageStyles(css, bodyClass, title);
  return pageWrapper ? (
    <main id="main" className="page-wrapper">{children}</main>
  ) : (
    <div id="main">{children}</div>
  );
}

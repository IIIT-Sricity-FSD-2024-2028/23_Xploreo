# legacy/

`css/` holds the ORIGINAL stylesheets from `front_end/css/`, copied byte-for-byte.
Do not edit them here: if the old UI changes, copy the file again. Pages use the same
class names and markup as the old HTML, so the React app looks exactly like the old site.

Why the styles are injected per page (`usePageStyles`) instead of imported globally:
the old site was multi-page, and each page loaded only its own stylesheets
(`profile.html` loads shared+profile, the Experience pages load styles+experiencestyles).
Those files redefine the same class names (`.primary-btn`, `.modal`, `.profile-header`, ...),
so loading them all at once would change how every page looks.

## Density (why the pages are smaller than the old site)

The old stylesheets were drawn for a very roomy screen. `scaleCss.js` multiplies every `px`
length by `UI_SCALE` (0.8) when a page's CSS is injected, so cards, text, padding and gaps all
shrink together and the layout stays identical. Change `UI_SCALE` to make everything bigger or
smaller in one place. Inline sizes written in JSX should use `px()` from `@/lib/density.js`.

Guide bundles (`GUIDE_DASHBOARD_CSS`, `GUIDE_TOURS_CSS`, `GUIDE_EARNINGS_CSS`, `GUIDE_REVIEWS_CSS`, `GUIDE_SCHEDULE_CSS`, `GUIDE_SUPPORT_CSS`) follow the same rule: each lists the sheets its old HTML page linked, then the styles the old JS injected (kept as their own files: `guide-dashboard.css`, `guide-earnings.css`, `guide-reviews.css`), then `components/guide/guideCommon.css` (loading/error blocks, toast, dialogs that the old pages built inline).

# M2 branch: merge notes

Branch: `feature/partner-guide-experience`. Everything lives in `frontend-react/`.

## What is a TEMP-STUB (delete / repoint when `react-foundation` lands)

| Path | What it fakes | On merge |
|---|---|---|
| `src/dev-stubs/**` | AuthContext, session, `request()`, Mock Kit (`registerMock` + helpers), `components/common/*`, tokens/global CSS, router guard, dev toolbar | **delete the folder** |
| `src/App.jsx`, `src/main.jsx` | app root + entry | **delete** (M1's replace them) |
| `src/foundation.js` | the single seam: every M2 file imports auth / request / mock kit / common components from `@/foundation` | **repoint the re-exports** at M1's real files |

Nothing else needs editing: pages and services only ever import from `@/foundation`.

## Contract M2 assumes from M1 (confirm or tell M2 what differs)

- `useAuth()` -> `{ user: { id, name, email, phone, businessName, role: 'partner', partnerType: 'guide'|'experience'|'hotel', region }, role, region, isAuthenticated }`
- `request(path, { method, body, params })` -> parsed JSON; throws `ApiError { status, message, fieldErrors }` (400 field errors, 401, 403, 404).
- Mock Kit: `registerMock(method, pattern, handler)`; handler gets `ctx = { method, path, params, query, body, headers, user: { id, role, region } }`; helpers `requireUser`, `requireRole`, `assertRegion`, `assertOwner`, `whitelist`.
- Common component: only `Navbar { links: [{ to, label, icon }], userName, avatar, profileTo, supportTo?, onLogout }`. The stub is a faithful port of the old `navbar.js`/`shared.css` (same markup, same classes). Modal / StatCard / StatusBadge are **not** assumed: pages use the original markup (`.modal`/`.modal-box`, `.stat-card`, `.status-pill`) and the original CSS.
- `useAuth()` also returns `logout()` (the navbar's Logout item calls it).
- Route files export a portal descriptor `{ basePath, layout, requires: { partnerType }, homePath, routes }`; the router applies the role guard.
- Mock domains are folders `src/mocks/<domain>/index.js`, loaded by the Mock Kit when named in `VITE_MOCKS`.

## Legacy CSS (the UI is the old UI)

The React pages render the old `front_end` markup and class names, styled by verbatim copies of the old CSS in `src/legacy/css/`. The old site was multi-page and each HTML page linked only its own stylesheets (the sheets collide: `styles.css` and `shared.css` both style `.navbar`, `.modal`, `.stat-card`). `usePageStyles(cssTexts, bodyClass, title)` reproduces that: it injects the page's `<style data-legacy-css>` nodes on mount and removes them on unmount. Bundles live in `src/legacy/styles.js` (`NAVBAR_CSS`, `EXPERIENCE_CSS`, `PROFILE_CSS`); see `src/legacy/README.md`. Icons are copied from `front_end/components/ui` to `public/ui/` (served by `ui(file)` in `src/lib/assets.js`).

On merge: M1's global styling must not restyle bare elements or `.navbar`/`.modal`/`.stat-card` globally, or the injected page CSS will fight it. If M1 wants one global stylesheet, move the shared rules there and keep only the per-page files.

## Compact density (UI_SCALE)

The old site was built at a size that needs a lot of scrolling on a laptop screen. The legacy CSS is injected through `scaleCss()` (`src/legacy/scaleCss.js`), which multiplies every px length by `UI_SCALE` (0.8) and sets `html { font-size: 12.8px }` so rem/em sizes (and the browser's default heading sizes) shrink with it. Fonts never go below 11px, 1px borders stay 1px, `url(...)` declarations and containers wider than 900px are left alone, so layouts keep their proportions and max-widths. Sizes written inline in JSX go through `px()` / `fontPx()` in `src/lib/density.js`. To change the size of the whole portal, change `UI_SCALE` (one number); to turn it off, set it to 1. The CSS files in `src/legacy/css/` stay verbatim copies of the old ones.

## Guide portal (`/guide/*`)

Pages: `dashboard` (browse plans / my applications / my jobs), `tours`, `schedule`, `earnings`, `reviews`, `support`, plus the shared `profile`. Page code is in `src/pages/Guide/`, shared pieces in `src/components/guide/`, the service in `src/services/guide.api.js`, the mock domain in `src/mocks/guide/`.

Mock endpoints the guide pages call (all real backend endpoints, mocked until the backend is switched on):
`GET /plans`, `POST /guide-applications`, `GET /guide-applications/guide/:id`, `GET /guide-assignments/guide/:id`, `PATCH /guide-assignments/:id/confirm|reject`, `GET /traveller/:id`, `GET /trips/guide/:id`, `PATCH /trips/:id/tracking`, `GET|POST /schedule`, `PATCH|DELETE /schedule/:id`, `GET|POST /tickets`, `GET /reviews`.

Extra dev users (not in the old data): `guide-goa-1` (a new guide: only empty states) and `guide-del-1` (owner of rows that guide A must never see).

Differences from the old guide pages (decided on purpose):

- **Tours**: no Leaflet map and no "send message to traveller" box. The old map plotted made-up coordinates and the message box only used localStorage; there is no backend endpoint for either. The modal shows the itinerary and the live status instead. Start / Complete / Finish / Pause / Resume / Skip are `PATCH /trips/:id/tracking`. No star rating or review box on completed tours (reviews are not linked to trips in the data).
- **Dashboard**: the "Super Admin Cut (4%)" line is gone (money is computed by the server, not the page). The toast after applying shows the server's decision (accepted / rejected + reason).
- **Schedule**: Guide ID is locked to the signed-in guide and there is no guide-filter box (the old page let a guide type any guide id). The old Block-dates / Time-slot popups only wrote to localStorage and are not rebuilt. Delete asks for confirmation.
- **Support**: only `subject`, `message`, `category` are sent (the old page also sent a fixed priority).
- **Navbar**: Tours and Schedule are linked (the old navbar only had Dashboard, Earnings, Reviews, so those two pages were reachable by URL only). Support is in the profile menu.
- **Earnings**: totals use the server's `paidAmount` per job; the page only adds them up for display.

## Mock additions M2 made (mock-only until the backend matches)

- `GET /guide/:id`, `PATCH /guide/:id` (guide only; owner + region checks; whitelist `years_exp`, `bio`, `lang_spoken`, `prof_title`). The real backend already has `PATCH /guide/:id`.
- `GET /experience-bookings/earnings` summary also returns `refundPercent` and `utilizationPercent` (the page shows server numbers only).

## Switching a domain to the real backend

1. In your own `.env.local`: `VITE_MOCKS=schedule` (partners real) -> then `VITE_MOCKS=` (all real).
2. Walk every screen of that domain; compare field names, enums, dates, pagination, error format.
3. If real and mock differ, **fix the mock**, not the page.

## Known backend gaps found while building (see PR description)

- No earnings endpoint exists. `GET /experience-bookings/earnings` is mock-only; the page shows "not available" against the real API.
- `PATCH /experiences/:id` and `DELETE /experiences/:id` check region only, **not ownership**: a second partner in the same region can edit/delete another partner's experience. The mock enforces ownership (403).
- `PATCH /auth/users/:id` has no self-only check and accepts `role` / `location`. The mock enforces self-only and blocks role/region changes.
- `GET /auth/users/:id` is admin-only, so a partner cannot read their own profile; the profile page reads from the session.
- Region is taken from the `x-user-location` header, not a verified token.
- The backend does not reject conflicting slots, and trusts client-sent `booked`; the mock rejects duplicates and recomputes `booked` from bookings.

### Guide-portal gaps

- `GET /reviews` ignores `targetType` / `targetId` and returns every review; the guide page filters on the client as a courtesy. The mock returns only the signed-in guide's reviews.
- `POST/PATCH/DELETE /schedule` have no ownership check and trust the `guideId` in the body, so one guide can write to another's schedule. The mock answers 403.
- `GET /traveller/:id` can be read by any guide. The mock only allows travellers who are on that guide's jobs.
- There is no guide earnings endpoint; the page uses `paidAmount` from `/guide-assignments/guide/:id`.
- There is no endpoint for tracking messages or traveller requests (the old localStorage message box), so it is not rebuilt.
- Login returns identity headers, not a token (the mock/stub uses the same convention as above).

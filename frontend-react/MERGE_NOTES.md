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

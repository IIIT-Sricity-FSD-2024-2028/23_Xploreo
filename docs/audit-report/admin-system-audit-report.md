# Xploreo React Application — Comprehensive Admin System Audit Report

**Audit Target:** Frontend React Application & NestJS Backend Integration  
**Admin Roles Covered:** SuperAdmin (SA), TechAdmin (TA), NonTechAdmin (NTA)  
**Date of Audit:** October 27, 2026  
**Audit Mode:** READ-ONLY Verification (Zero code modified, zero destructive actions)  

---

## 1. Executive Summary

A comprehensive, evidence-based code and architectural audit of the Xploreo travel platform was conducted. The audit inspected all implemented routes, components, styles, state management layers, API services, NestJS backend controllers, database entities, authentication flows, and automated test suites.

### Key Takeaways
1. **Frontend Architecture & Build**: The frontend is built with React 19 and Vite 8, using Vanilla CSS scoped per module (`superadmin.css`, `nta.css`, `tickets.css`). The production build succeeds (`npm run build` exits 0), generating 210 kB CSS and 1,163 kB JS.
2. **Critical Security / Auth Inconsistency (P0)**: While newer services (`adminManagement.api.js`, `tickets.api.js`, `finance.api.js`) use the shared `request.js` or `apiRequest()` that properly attach signed JWT `Authorization: Bearer <token>` headers, legacy service functions in `plans.api.js` and `nta.api.js` construct manual headers containing **only** `x-user-role` and `x-user-id` without any `Authorization` Bearer token. Because the backend `AuthGuard` (`auth.guard.ts`) requires a valid signed JWT and strictly rejects raw role headers (`UnauthorizedException: Authentication token required`), calling `getPlans()`, `createPlan()`, `updatePlan()`, or `getNtaDashboardMetrics()` in live mode with these services will fail with `401 Unauthorized`.
3. **Simulated Mock Data Leak in Production (P1)**: The SuperAdmin Operations & Bookings page (`opsbook.jsx`) and Finance page (`finance.jsx`) load ledger, refunds, disputes, and payouts exclusively from local in-memory fixtures (`DEMO_TRANSACTION_LEDGER`, `DEMO_REFUND_QUEUE`, etc.) regardless of whether the system is connected to a live backend. Mutations (`processRefundAction`, `resolveDisputeAction`, `processPayoutAction`) mutate only in-memory Javascript objects and never reach the backend.
4. **Role Boundary Enforcement**: Role enforcement on the backend is robust:
   - SuperAdmin: Full access to staff, plans, trips, finance summary, user restriction.
   - TechAdmin: Narrowed slice; can resolve support tickets and update user status (active/inactive), but cannot create users or delete plans.
   - NonTechAdmin: Strictly scoped by region (`req.user.region`). Backend checks in `PlansService` prevent NTA from reading, creating, or editing plans outside their assigned city.
5. **Backend Test Suite**: 3 backend test suites (`auth-security.spec.ts`, `password-reset.spec.ts`, `cancellation-refund.spec.ts`) pass cleanly (46/46 tests passed). Frontend unit testing infrastructure is unconfigured (`Missing script: "test"` in `package.json`).

---

## 2. Repository and Architecture Overview

### Tech Stack
- **Frontend Framework**: React 19.2.8, React DOM 19.2.8
- **Bundler & Dev Server**: Vite 8.2.2
- **Router**: React Router DOM 7.18.4 (`BrowserRouter`, nested `<Routes>`, layout outlets)
- **Styling**: Vanilla CSS design systems (`superadmin.css`, `nta.css`, `tickets.css`), custom CSS custom properties (`--sa-*`, `--nta-*`)
- **Backend Framework**: NestJS 11.0.1, Express platform
- **Database & Persistence**: TypeORM 0.3.28 with SQLite3 (`database.sqlite`)
- **Auth Tokens**: JSON Web Token (`jsonwebtoken` 9.0.3) signed with `JWT_SECRET`
- **Testing**: Jest 29.7.0 (Backend), ESLint 10 with React hooks plugin

### Session & Identity Flow
- **Session Storage**: `localStorage.getItem('xploreoUser')` and `localStorage.getItem('xploreoToken')` via `session.js`.
- **Identity Headers**: `identityHeaders()` attaches `x-user-role`, `Authorization: Bearer <token>`, `x-user-id`, and `x-user-location`.
- **Protected Routes**: `<ProtectedRoute allowedRoles={[...]} user={user} />` inspects `user.role`.

---

## 3. Complete Admin Route Inventory

| Route | Role | Component | Layout | Purpose |
|---|---|---|---|---|
| `/superadmin` | `superadmin` | Redirects to `/superadmin/dashboard` | `SuperAdminLayout` | Root portal entry |
| `/superadmin/dashboard` | `superadmin` | `SuperAdminDashboardPage` | `SuperAdminLayout` | Platform KPIs, velocity chart, recent bookings |
| `/superadmin/users` | `superadmin` | `SuperAdminUsersPage` | `SuperAdminLayout` | Manage Guides, Travelers, Hotel & Experience Partners |
| `/superadmin/admins` | `superadmin` | `SuperAdminAdminsPage` | `SuperAdminLayout` | Manage Regional (NTA) & Tech Admin staff |
| `/superadmin/finance` | `superadmin` | `SuperAdminFinancePage` | `SuperAdminLayout` | Revenue metrics, earnings charts, live money roll-up |
| `/superadmin/operations` | `superadmin` | `SuperAdminOpsBookPage` | `SuperAdminLayout` | Transaction ledger, refund authorization, disputes |
| `/tech-admin` | `techadmin` | Redirects to `/tech-admin/dashboard` | `TechAdminLayout` | Root portal entry |
| `/tech-admin/dashboard` | `techadmin` | `TechAdminDashboard` | `TechAdminLayout` | Ticket KPIs, workload distribution, recent tickets |
| `/tech-admin/users` | `techadmin` | `SuperAdminUsersPage` | `TechAdminLayout` | View accounts & suspend/restore status |
| `/tech-admin/tickets` | `techadmin` | `TechAdminTicketsPage` | `TechAdminLayout` | Full support tickets queue and resolution |
| `/nta` | `nontechadmin` | Redirects to `/nta/dashboard` | `NtaLayout` | Root portal entry |
| `/nta/dashboard` | `nontechadmin` | `NtaDashboardPage` | `NtaLayout` | Regional KPI telemetry, bookings feed, live finance |
| `/nta/plans` | `nontechadmin` | `PlansPage` | `NtaLayout` | Curate packages, hotels, experiences (No transport) |
| `/nta/guides` | `nontechadmin` | `GuidesPage` | `NtaLayout` | Regional guide application decision modal & review |

---

## 4. Page / Component / Service / Endpoint Mapping

| Page Component | Sub-Components | Service Module | Primary Backend Endpoints |
|---|---|---|---|
| `SuperAdminDashboardPage` | `SAMetricCard`, `SAChart`, `SATable`, `SABadge` | `superadmin.api.js` | `GET /api/auth/users`, `GET /api/trips` |
| `SuperAdminUsersPage` | `SAMetricCard`, `SATable`, `SABadge` | `superadmin.api.js` | `GET /api/auth/users`, `PATCH /api/auth/users/:id`, `POST /api/auth/register` |
| `SuperAdminAdminsPage` | `SAMetricCard`, `SATable`, `SABadge` | `adminManagement.api.js` | `GET /api/auth/staff`, `POST /api/auth/staff`, `PATCH /api/auth/users/:id` |
| `SuperAdminFinancePage` | `SAMetricCard`, `SAChart`, `LiveFinancePanel` | `superadmin.api.js`, `finance.api.js` | `GET /api/finance/summary` (Live) + In-memory fixtures |
| `SuperAdminOpsBookPage` | `SAMetricCard`, `SATable`, `SABadge` | `superadmin.api.js` | In-memory fixtures (`mockStore.ledger`, `mockStore.refunds`, `mockStore.disputes`) |
| `TechAdminDashboard` | `SAMetricCard`, `TicketStatusBadge`, `TicketDetailsModal` | `tickets.api.js` | `GET /api/tickets`, `PATCH /api/tickets/:id` |
| `TechAdminTicketsPage` | `TicketList`, `TicketFilterBar`, `TicketDetailsModal` | `tickets.api.js` | `GET /api/tickets`, `PATCH /api/tickets/:id` |
| `NtaDashboardPage` | `SAMetricCard`, `SAChart`, `LiveFinancePanel` | `nta.api.js`, `finance.api.js` | `GET /api/plans`, `GET /api/trips`, `GET /api/finance/summary` |
| `PlansPage` | `PlanList`, `PlanForm`, `PlanCard`, `ItineraryBuilder` | `plans.api.js`, `hotels.api.js` | `GET /api/plans`, `POST /api/plans`, `PATCH /api/plans/:id`, `DELETE /api/plans/:id`, `GET /api/hotels` |
| `GuidesPage` | `SABadge`, `GuideDecisionModal` | `nta.api.js`, `plans.api.js` | `GET /api/guide-applications`, `PATCH /api/guide-applications/:id/decision`, `GET /api/plans` |

---

## 5. Actor Findings

### 5.1 SuperAdmin (SA)
- **Dashboard & KPIs**: Accurately aggregates total users (`GET /auth/users`) and trips (`GET /trips`). Velocity charts display static time-series mock curves.
- **Users & Partners Console**: Fully functional CRUD with role tabs. Correctly calls `PATCH /auth/users/:id` to restrict or activate users and partners.
- **Admin Management**: Dedicated portal (`admins.jsx`) cleanly interfaces with `GET /auth/staff` and `POST /auth/staff` for creating NTA and TechAdmin accounts. Prevents listing or creating SuperAdmins.
- **Operations & Ledger Defect**: `opsbook.jsx` displays transactions, refunds, and disputes entirely from mock data. The approval of a refund does not call any backend banking/payment or trip cancellation API; it merely mutates an in-memory array.
- **Finance Defect**: `finance.jsx` renders live figures via `<LiveFinancePanel />` (`/finance/summary`), but the historical KPI cards and payout records underneath are static demo numbers from `DEMO_FINANCE_METRICS`.

### 5.2 TechAdmin (TA)
- **Scope & Responsibilities**: Confirmed from code: TechAdmin handles system support tickets and user suspension/restoration.
- **Dashboard**: `TechAdminDashboard` displays 4 KPI cards (Total, Open, Resolved, High Priority), priority/category progress bars, and recent tickets.
- **Ticket Resolution**: `TechAdminTicketsPage` successfully integrates with `GET /tickets` and `PATCH /tickets/:id` through `request.js`.
- **Users Page Reuse**: Reuses `SuperAdminUsersPage` with `isSuperAdmin = false`, disabling creation/editing forms and exposing only the suspend/restore status switch. Backend `auth.service.ts` enforces that TechAdmins can only touch the `status` field.

### 5.3 NonTechAdmin (NTA)
- **Regional Isolation**: Fully enforced both in UI and backend. An NTA assigned to "Jaipur" only sees Jaipur packages, trips, and guide applications.
- **Plan Management**: `PlansPage` uses `PlanList` and `PlanForm` with `ItineraryBuilder`. Strictly models Hotel Stays + Curated Experiences without flights/transport.
- **Backend Delete Protection**: While `PlanCard` or UI shows action triggers, the backend strictly permits only `SUPERADMIN` to delete plans (`plans.controller.ts:103`); NTA receives a clean 403 Forbidden.
- **Guide Review Workflow**: `GuidesPage` correctly fetches applications via `GET /guide-applications` and submits decisions to `PATCH /guide-applications/:id/decision`.

---

## 6. API and Backend Contract Audit

### Defect Analysis: Missing Auth Tokens in `plans.api.js` and `nta.api.js`
In `backend/src/common/guards/auth.guard.ts`:
```typescript
if (token) {
  // verify JWT ...
  return true;
}
throw new UnauthorizedException('Authentication token required. Please log in to continue.');
```
However, in `frontend/src/services/plans.api.js`:
```javascript
// Lines 200-203, 382-385, 438-441:
headers: {
  'x-user-role': role,
  'x-user-id': String(userId),
}
```
**Impact**: Because `fetchData` in `api.js` passes the caller-provided `headers` object, `Authorization: Bearer <token>` is omitted. The backend immediately rejects requests with `401 Unauthorized` unless mock mode (`VITE_MOCKS=plans`) is active.

### Defect Analysis: Missing Live Backend Endpoints for Operations Ledger & Payouts
- `GET /api/superadmin/ledger` - Missing
- `POST /api/superadmin/refunds/:id/action` - Missing
- `GET /api/superadmin/payouts` - Missing
- `frontend/src/services/superadmin.api.js` routes all operations and payout requests to `mockStore`.

---

## 7. CSS, UI, and Responsive Design Audit

1. **Design System & Aesthetic Consistency**:
   - Both `superadmin.css` and `nta.css` use cohesive Slate palettes (`#0f172a`, `#64748b`, `#f8fafc`).
   - Standardized KPI Metric Cards: White backgrounds (`#ffffff`), 14px border radii, 3px top accent lines, and smooth translateY hover elevation.
   - Consistent Badges: `SABadge` provides semantic green, amber, red, blue, and purple statuses across SA, TA, and NTA.
2. **Responsive Layouts**:
   - Grid templates use `repeat(auto-fit, minmax(240px, 1fr))` for metric cards.
   - Tables feature `.sa-table-wrapper` and `.nta-table-wrapper` with `overflow-x: auto` to prevent viewport breakages on smaller screens.
3. **Accessibility**:
   - Focus rings: High-contrast `:focus-visible` styling (`outline: 2px solid var(--sa-card-accent)`).
   - Reduced motion support: `@media (prefers-reduced-motion: reduce)` disables animations and transforms.

---

## 8. Authentication and Authorization Matrix

| Actor Role | Route Access | Can Manage Staff | Can Suspend Users | Can Create Plans | Can Delete Plans | Can Resolve Tickets | Can Approve Guides |
|---|---|---|---|---|---|---|---|
| **SuperAdmin** | `/superadmin/*` | **Yes** (`POST /auth/staff`) | **Yes** | **Yes** (All regions) | **Yes** | Read-only | **Yes** |
| **TechAdmin** | `/tech-admin/*` | **No** (Forbidden) | **Yes** (Status only) | **No** (Forbidden) | **No** (Forbidden) | **Yes** | **No** |
| **NonTechAdmin** | `/nta/*` | **No** (Forbidden) | **No** (Forbidden) | **Yes** (Own region only) | **No** (403 Forbidden) | **No** | **Yes** (Own region only) |

---

## 9. Cross-Actor Workflow Audit

1. **NTA Creates Plan -> Traveller Books -> SA Observes**:
   - Initiator: NonTechAdmin (`POST /plans`).
   - Regional Constraint: Destination must match NTA assigned region.
   - Downstream: Traveller creates Trip referencing Plan ID.
   - Result: Appears in SA Dashboard (`/superadmin/dashboard`) via `GET /trips` and Live Finance (`/finance/summary`).
2. **TechAdmin Suspends Account -> User Access Revoked**:
   - Initiator: TechAdmin via `/tech-admin/users` (`PATCH /auth/users/:id` with `{ status: 'inactive' }`).
   - Downstream: User login rejected with error "Account is deactivated/restricted".
3. **Traveller Submits Support Ticket -> TechAdmin Resolves**:
   - Initiator: Traveller via `POST /tickets`.
   - Downstream: Appears in TechAdmin Queue (`/tech-admin/tickets`).
   - Resolution: TA submits resolution summary via `PATCH /tickets/:id`. Status transitions to `RESOLVED`.

---

## 10. Test Execution Log

1. **Frontend Production Build**:
   - Command: `npm run build` in `frontend/`
   - Exit Code: `0` (Success)
   - Asset footprint: 210.74 kB CSS, 1,163.06 kB JS.
2. **Frontend Linter Check**:
   - Command: `npm run lint` in `frontend/`
   - Exit Code: `1` (86 problems: 80 errors, 6 warnings).
   - Primary issues: Unused variables, conditional React hook declarations in `TravellerSupportTicketsPage.jsx` and `TravellerTripsList.jsx`.
3. **Backend Jest Test Suites**:
   - Command: `npm test` in `backend/`
   - Exit Code: `0` (3 passed, 3 total; 46 passed, 46 total).
   - Passed Suites:
     - `auth-security.spec.ts`
     - `password-reset.spec.ts`
     - `cancellation-refund.spec.ts`

---

## 11. Defect Log & Findings by Priority

### P0 / Critical Defects
- **DEF-01: Missing JWT Bearer Token in `plans.api.js` and `nta.api.js`**
  - *File References*: `frontend/src/services/plans.api.js` (lines 201, 383, 439), `frontend/src/services/nta.api.js` (lines 72-79).
  - *Root Cause*: Manual header construction bypasses `identityHeaders()`. Requests include only `x-user-role` and `x-user-id`, which backend `AuthGuard` rejects with 401.
  - *Recommended Fix*: Refactor `plans.api.js` and `nta.api.js` to call the unified `request()` helper from `@/foundation` or merge `identityHeaders()`.

### P1 / Major Defects
- **DEF-02: Operations Ledger, Refunds, and Disputes Run Entirely on In-Memory Mock Data**
  - *File References*: `frontend/src/services/superadmin.api.js` (lines 198-290), `frontend/src/pages/SuperAdmin/opsbook.jsx` (lines 65-75).
  - *Root Cause*: No live backend controller endpoints exist for superadmin operations/refund queue.
  - *Recommended Fix*: Implement backend `/api/superadmin/operations` and `/api/superadmin/refunds` controllers backed by database entities.

### P2 / Significant Functional & Usability Defects
- **DEF-03: Hardcoded Mock Fallback Credentials in Admin Dashboards**
  - *File References*: `frontend/src/pages/SuperAdmin/dashboard.jsx` (line 25: `user || { userId: 'SA001', role: 'superadmin' }`), `frontend/src/pages/TechAdmin/dashboard.jsx` (line 40: `user || { userId: 'TA001', role: 'techadmin' }`).
  - *Root Cause*: If rendered without an explicit session prop, pages fall back to static user IDs instead of reading `getUser()` from `session.js`.
  - *Recommended Fix*: Replace fallback literals with `getUser()` or redirect unauthenticated visits to `/Auth/login`.

- **DEF-04: Conditional Hook Execution in Traveller Pages Breaking React Linter**
  - *File References*: `frontend/src/pages/Traveller/TravellerSupportTicketsPage.jsx` (line 27), `frontend/src/pages/Traveller/TravellerTripsList.jsx` (line 58).
  - *Root Cause*: Calling `useLocation` or `useNavigate` conditionally violates React Rules of Hooks.
  - *Recommended Fix*: Hoist hook invocations to the top level of the component function.

### P3 / Minor Consistency & Styling Issues
- **DEF-05: Unused Variable Warnings in Service Modules**
  - *File References*: `frontend/src/services/tickets.api.js` (line 11: `BASE_URL`), `frontend/src/services/nta.api.js` (line 3: `DEMO_NTA_DASHBOARD_METRICS`).
  - *Recommended Fix*: Remove unused imports and constants.

---

## 12. Prioritized Remediation Plan

1. **Phase 1: Security & Auth Alignment (Immediate)**
   - Update `plans.api.js` and `nta.api.js` to use `identityHeaders()` or the shared `request()` wrapper so that `Authorization: Bearer <token>` is sent on every API call.
2. **Phase 2: Remove Frontend Mock Dependencies for Admin Operations**
   - Implement backend endpoints for SuperAdmin operations, transactions ledger, and refund approvals.
   - Connect `superadmin.api.js` to live endpoints with error handling.
3. **Phase 3: Session Handling & React Hook Cleanups**
   - Unify session fallback across all admin pages using `useAuth()` / `getUser()`.
   - Fix conditional hooks in `TravellerSupportTicketsPage.jsx` and `TravellerTripsList.jsx` so that `npm run lint` passes without errors.
4. **Phase 4: Frontend Test Infrastructure**
   - Add Vitest or Jest scripts to `frontend/package.json` to enable automated frontend unit testing.

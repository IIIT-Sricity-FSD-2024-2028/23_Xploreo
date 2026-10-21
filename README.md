# Xploreo — Integrated Travel and Hospitality Platform

**Academic Project Submission — Full Stack Development (FSD)**  
**Repository:** `23_Xploreo`  
**Domain:** Travel and Hospitality  

---

## Table of Contents

- [1. Executive Summary and Problem Statement](#1-executive-summary-and-problem-statement)
- [2. System Architecture and Domain Actors](#2-system-architecture-and-domain-actors)
- [3. Key Implemented Features](#3-key-implemented-features)
- [4. Technology Stack and Dependencies](#4-technology-stack-and-dependencies)
- [5. Project Setup and Local Execution](#5-project-setup-and-local-execution)
- [6. Testing, Linting, and Production Builds](#6-testing-linting-and-production-builds)
- [7. API Documentation and Swagger](#7-api-documentation-and-swagger)
- [8. Development and Demo Credentials](#8-development-and-demo-credentials)
- [9. Repository Directory Structure](#9-repository-directory-structure)
- [10. Individual Contributions](#10-individual-contributions)
  - [10.1 Apuri Rushi — M4: All Administrator Modules & Security](#101-apuri-rushi--m4-all-administrator-modules--security)
  - [10.2 Krovi Sriram — M5: Traveler Modules](#102-krovi-sriram--m5-traveler-modules)
  - [10.3 Sreekar — M1: Landing Pages and Authentication](#103-sreekar--m1-landing-pages-and-authentication)
  - [10.4 Siddarth — Guide Modules & Experience Dashboard/Bookings](#104-siddarth--guide-modules--experience-dashboardbookings)
  - [10.5 Dheeraj — Hotel Modules & Experience Catalog/Earnings](#105-dheeraj--hotel-modules--experience-catalogearnings)
- [11. Verification and Audit Summary](#11-verification-and-audit-summary)

---

## 1. Executive Summary and Problem Statement

Modern travel planning requires travelers to navigate disconnected applications to arrange accommodation, local tours, curated experiences, and guide services. This fragmented process creates scheduling conflicts, opaque pricing, and administrative friction between travelers, service providers, and administrators.

**Xploreo** is an integrated travel and hospitality platform engineered to unify trip planning, partner inventory management, guide coordination, and platform governance into a single cohesive system. The platform guarantees end-to-end data consistency across multi-actor operations:
- **Travelers** discover packages, customize multi-day itineraries, book accommodations and curated experiences, and submit support inquiries.
- **Service Partners (Hotels & Experiences)** manage room inventories, excursion catalogs, time slots, and monitor earnings.
- **Local Guides** receive assignments, review trip itineraries, submit applications, and coordinate tours.
- **Administrators (SuperAdmin, TechAdmin, and Regional NTAs)** oversee platform compliance, manage users, curate regional travel plans, track financial payouts, resolve technical support tickets, and enforce strict regional data isolation across five supported hubs (**Jaipur**, **Goa**, **Delhi**, **Mumbai**, and **Kerala**).

---

## 2. System Architecture and Domain Actors

The platform operates across seven distinct actor roles coordinated via role-based access control (RBAC), signed JSON Web Tokens (JWT), and verified server-side identity:

| Actor Role | Primary Responsibility | Scoping / Isolation Model |
|---|---|---|
| **Traveler** (`traveller`) | Discovers packages, books hotels/experiences, manages trips and reviews. | Self-ownership: can only access own profile, trips, and bookings. |
| **Guide** (`guide`) | Accepts tours, coordinates itineraries, views traveller requests and earnings. | Guide-scoped: assigned trips and location-specific tour requests. |
| **Hotel Partner** (`hotel`) | Manages room catalogs, availability, booking check-ins/outs, and earnings. | Partner-scoped: only owns and mutates own hotel property. |
| **Experience Partner** (`experience`) | Manages activity catalogs, time-slots, capacities, and customer bookings. | Partner-scoped: strictly restricted to assigned operating hub. |
| **Non-Tech Admin** (`nontechadmin`) | Regional package curator, guide application evaluator, and metrics monitor. | **Strict Regional Scope:** NTA001–NTA005 restricted to their assigned region. |
| **Tech Admin** (`techadmin`) | Manages operational system logs, technical health, and cross-actor support tickets. | Global technical operations & unified support ticket management. |
| **SuperAdmin** (`superadmin`) | Global oversight: manages all users, platform partners, disputes, and financial payouts. | Global unrestricted access across all 5 geographical hubs. |

---

## 3. Key Implemented Features

1. **Multi-Region Package Architecture:**
   - 10 canonical regional travel packages across Jaipur, Goa, Delhi, Mumbai, and Kerala.
   - Packages consist strictly of partner hotel accommodations and curated local experiences (no speculative transit/flights).
2. **Strict Regional Isolation for Non-Tech Admins:**
   - Five dedicated NTA accounts (`NTA001`–`NTA005`) bound to regional hubs.
   - Server-enforced query filtering and mutation locks prevent cross-region data leakage or tampered client requests.
3. **Cross-Actor Support Ticket System:**
   - Submitters (Travelers, Guides, Hotels, Experience Partners) create and track tickets from their portals.
   - Tech Admin triages tickets from a centralized queue with real-time status transitions.
4. **Partner Inventory & Booking Engine:**
   - Hotel Partners manage room availability, check-in flows, and occupancy analytics.
   - Experience Partners configure slot timings, participant caps, and view live bookings.
5. **Unified Seed Data Architecture:**
   - Central repository at `Database/seeds/` shared across backend services and frontend mock fallbacks, ensuring zero ID drift.

---

## 4. Technology Stack and Dependencies

### Frontend Architecture
- **Framework:** React 19 (`react` 19.2.8, `react-dom` 19.2.8)
- **Routing:** React Router DOM v7 (`react-router-dom` 7.18.4)
- **Bundler & Dev Server:** Vite 8 (`vite` 8.2.2, `@vitejs/plugin-react` 6.1.0)
- **Styling:** Modular Vanilla CSS with scoped design systems (no TailwindCSS)
- **Linting:** ESLint 10 (`eslint` 10.9.0) with React Hooks plugin

### Backend Architecture
- **Framework:** NestJS 11 (`@nestjs/core` 11.0.1, `@nestjs/common` 11.1.19, `@nestjs/platform-express` 11.0.1)
- **Language / Runtime:** TypeScript 5.7 (`typescript` 5.7.3), Node.js (v20+ / v22 LTS tested)
- **Validation & Transformation:** `class-validator` 0.15.1, `class-transformer` 0.5.1
- **Security & Token Management:** `jsonwebtoken` 9.0.3, signed Bearer token authentication
- **API Documentation:** Swagger / OpenAPI (`@nestjs/swagger` 11.4.2, `swagger-ui-express` 5.0.1)
- **Data Persistence:** In-memory repositories initialized via central JSON seed loader (`Database/seeds/*.json`) with TypeORM/SQLite scaffolding ready.

---

## 5. Project Setup and Local Execution

### Prerequisites
- **Node.js:** v20.x or v22.x LTS installed (`node -v`)
- **npm:** v10.x or higher (`npm -v`)
- **Git**

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/IIIT-Sricity-FSD-2024-2028/23_Xploreo.git
   cd 23_Xploreo
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

Open two separate terminal windows:

- **Terminal 1 — Backend API Server:**
  ```bash
  cd backend
  npm run build
  npm run start:prod
  ```
  *(Alternatively, for development live-reload: `npm run start:dev`)*  
  The NestJS backend starts on: **`http://localhost:3000/api`**  
  Swagger OpenAPI documentation: **`http://localhost:3000/api/docs`**

- **Terminal 2 — Frontend Application:**
  ```bash
  cd frontend
  npm run dev
  ```
  The Vite frontend starts on: **`http://localhost:5173`**

---

## 6. Testing, Linting, and Production Builds

### Backend Commands (run from `backend/`)
- **Production Build:**
  ```bash
  npm run build
  ```
  *Executes `nest build` and compiles TypeScript to `dist/`.*

### Password-reset email setup

The login page includes a **Forgot password?** flow. It sends a single-use password-reset link from `xploreo2324@gmail.com`; each link expires after **5 minutes**. To enable delivery, copy `backend/.env.example` to `backend/.env` and set `SMTP_PASS` to a [Google App Password](https://myaccount.google.com/apppasswords) for that mailbox (not its normal Google password). Set `FRONTEND_URL` to the deployed React URL before production deployment.

The backend exposes `POST /api/auth/password-reset/request` and `POST /api/auth/password-reset/confirm`. Reset passwords are stored with Node's `scrypt`; existing seeded demo passwords continue to work until changed.
- **Security & Authorization Test Suite:**
  ```bash
  npm test
  ```
  *Executes Jest tests validating authentication, JWT verification, and regional NTA isolation.*
- **End-to-End Test Suite:**
  ```bash
  npm run test:e2e
  ```
  *Executes e2e tests via `jest --config ./test/jest-e2e.json`.*

### Frontend Commands (run from `frontend/`)
- **Production Bundle Build:**
  ```bash
  npm run build
  ```
  *Executes `vite build` into `dist/`.*
- **Code Linting:**
  ```bash
  npm run lint
  ```
  *Runs `eslint .` across React components and utilities.*

---

## 7. API Documentation and Swagger

When the backend server is running, the interactive Swagger OpenAPI UI is accessible at:
- **`http://localhost:3000/api/docs`**

The specification defines all core domain resources:
- `POST /api/auth/login` — Authenticates user and issues signed JWT with role and region claims.
- `POST /api/auth/register` — Registers new actor accounts.
- `GET/POST /api/plans` — Regional plan catalog with server-side destination scoping.
- `GET/POST /api/tickets` — Cross-actor support ticket submission and triage.
- `GET/POST /api/bookings` — Hotel accommodation bookings.
- `GET/POST /api/experience-bookings` — Curated experience slot bookings.
- `GET/POST /api/guide-requests` — Guide tour requests and regional applications.

---

## 8. Development and Demo Credentials

All seeded development credentials are authenticated server-side against `Database/seeds/users.json` and `backend/src/auth/auth.repository.ts`:

| Role | Username / User ID | Password | Scope / Region | Notes |
|---|---|---|---|---|
| **SuperAdmin** | `SA001` | `SA@123` | Global | Unrestricted administrative access across all 5 hubs |
| **Tech Admin** | `TA001` | `TA@123` | Global | System monitoring and centralized support ticket queue |
| **NTA (Jaipur)** | `NTA001` | `NTA@123` | Jaipur | Regional plans, guide requests, and dashboard metrics |
| **NTA (Goa)** | `NTA002` | `NTA@123` | Goa | Regional plans, guide requests, and dashboard metrics |
| **NTA (Delhi)** | `NTA003` | `NTA@123` | Delhi | Regional plans, guide requests, and dashboard metrics |
| **NTA (Mumbai)** | `NTA004` | `NTA@123` | Mumbai | Regional plans, guide requests, and dashboard metrics |
| **NTA (Kerala)** | `NTA005` | `NTA@123` | Kerala | Regional plans, guide requests, and dashboard metrics |
| **Traveler** | `T001` | `TRA@123` | Self | Package discovery, itinerary builder, personal trips |
| **Guide** | `G001` | `GUD@123` | Kerala / Regional | Tour assignments, traveler coordination, earnings |
| **Hotel Partner** | `HP001` | `HP@123` | Jaipur | Heritage Stays Pvt Ltd inventory & room check-ins |
| **Experience Partner**| `XP001` | `XP@123` | Kerala | Pink City Days / Backwater experiences and slots |

---

## 9. Repository Directory Structure

```
23_Xploreo/
├── Database/                     # Central data layer and canonical seeds
│   ├── fixtures/                 # Mock and preview catalogs (hotels, experiences, admin)
│   ├── seeds/                    # Live backend seed files (users, plans, tickets, etc.)
│   ├── dbschema.sql              # Relational schema reference
│   └── README.md                 # Database contracts and domain models
├── backend/                      # NestJS REST API Server
│   ├── src/
│   │   ├── auth/                 # JWT authentication, RBAC, user repositories
│   │   ├── plans/                # Travel package plans and regional isolation
│   │   ├── tickets/              # Centralized support ticket module
│   │   ├── bookings/             # Hotel booking engine
│   │   ├── experience-bookings/  # Experience slot booking engine
│   │   ├── guide-requests/       # Guide assignments and applications
│   │   └── common/               # Guards, interceptors, and seed-loader utilities
│   ├── test/                     # Unit and e2e test specifications
│   └── package.json              # Backend scripts and dependencies
├── frontend/                     # React 19 + Vite 8 SPA Client
│   ├── src/
│   │   ├── components/           # Reusable UI libraries (superadmin, nta, tickets, guide, hotel)
│   │   ├── context/              # AuthContext and state normalization
│   │   ├── pages/                # Role-specific portal views
│   │   ├── routes/               # Declarative route configuration and guards
│   │   └── services/             # API client, session management, and fixtures
│   ├── vite.config.js            # Vite build configuration
│   └── package.json              # Frontend scripts and dependencies
├── docs/                         # Technical audit reports and implementation blueprints
└── README.md                     # Project submission documentation
```

---

## 10. Individual Contributions

The following team ownership matrix documents the verified individual contributions across the Xploreo platform for academic evaluation.

### 10.1 Apuri Rushi — M4: All Administrator Modules & Security

**Scope:** Complete architecture and implementation of all administrator modules (SuperAdmin, Non-Tech Admin, Tech Admin support management), authentication security, regional data isolation, and central backend seed consolidation.

#### 1. SuperAdmin Portal & Executive Modules
- `frontend/src/pages/SuperAdmin/dashboard.jsx` — Platform overview, KPI metric cards, revenue trends, and operational activity streams.
- `frontend/src/pages/SuperAdmin/users.jsx` — User and partner management, role elevation, suspension controls, and credential verification.
- `frontend/src/pages/SuperAdmin/opsbook.jsx` — Global operational bookings, dispute management, and cross-region reservation oversight.
- `frontend/src/pages/SuperAdmin/finance.jsx` — Financial summaries, platform commission analytics, partner payout calculations, and transaction records.
- `frontend/src/components/superadmin/SuperAdminLayout.jsx` — Common administrative layout wrapper with persistent navigation and active context.
- `frontend/src/components/superadmin/SAMetricCard.jsx` — Reusable metric display card with trend indicators.
- `frontend/src/components/superadmin/SAChart.jsx` — Responsive chart visualizations for revenue and booking volume distributions.
- `frontend/src/components/superadmin/SATable.jsx` — Paginated administrative data grid with status filtering.
- `frontend/src/components/superadmin/SABadge.jsx` — Standardized status indicators.
- `frontend/src/components/superadmin/superadmin.css` — Dedicated design system styling for SuperAdmin portal.

#### 2. Non-Tech Admin (NTA) & Regional Package Management
- `frontend/src/pages/NonTechAdmin/dashboard.jsx` — Dynamic regional dashboard scoped to the authenticated NTA's assigned territory.
- `frontend/src/pages/NonTechAdmin/plans.jsx` — Regional package management interface for creating, publishing, and editing multi-day itineraries.
- `frontend/src/pages/NonTechAdmin/guides.jsx` — Guide application evaluation portal, document verification, and status approval/rejection.
- `frontend/src/components/nta/PlanList.jsx` — Regional package table with status toggles and detail drawers.
- `frontend/src/components/nta/PlanCard.jsx` — Visual card component representing regional packages.
- `frontend/src/components/nta/PlanForm.jsx` — Comprehensive package creation/edit form enforcing partner hotel and experience selections.
- `frontend/src/components/nta/PlanDetailsModal.jsx` — Modal view inspecting full day-by-day itineraries and partner links.
- `frontend/src/components/nta/ItineraryBuilder.jsx` — Day-by-day activity and accommodation scheduler.
- `frontend/src/components/nta/NtaLayout.jsx` — Dedicated layout wrapper for NTA views.
- `frontend/src/components/nta/nta.css` — Design system styling for NTA pages.

#### 3. Cross-Actor Support Ticket System & Tech Admin Management
- `frontend/src/pages/TechAdmin/tickets.jsx` — Centralized Tech Admin ticket queue with status transitions and resolution notes.
- `frontend/src/components/tickets/TicketList.jsx` — Multi-role ticket list supporting filtering by status and priority.
- `frontend/src/components/tickets/TicketCreateForm.jsx` — Standardized ticket creation modal available to all submitting actors.
- `frontend/src/components/tickets/TicketDetailsModal.jsx` — Full ticket history and administrative action drawer.
- `frontend/src/components/tickets/TicketStatusBadge.jsx` — Status indicator badge for open/in-progress/resolved states.
- `frontend/src/components/tickets/tickets.css` — Reusable styling for the cross-actor ticket system.
- `frontend/src/services/tickets.api.js` — Client wrapper communicating with `/api/tickets`.
- `backend/src/tickets/tickets.controller.ts` — REST controller for ticket creation, retrieval, and status updates.
- `backend/src/tickets/tickets.service.ts` — Business logic enforcing actor-ownership and Tech Admin triage rules.
- `backend/src/tickets/tickets.repository.ts` — Repository managing persistent support ticket records.
- `backend/src/tickets/dto/create-ticket.dto.ts` & `update-ticket.dto.ts` — DTO validation schemas.
- `Database/seeds/tickets.json` — Seed records covering tickets from Travelers, Guides, Hotels, and Experience Partners.

#### 4. Authentication, Authorization & Five-Region Isolation
- `backend/src/auth/auth.service.ts` — JWT token generation with signed `userId`, `role`, and `region` claims.
- `backend/src/auth/auth.repository.ts` — Authentication repository seeding and verifying all 5 regional NTA accounts (`NTA001`–`NTA005`).
- `backend/src/auth/auth-security.spec.ts` — Security test suite validating JWT signatures, cross-region mutation denial, and SuperAdmin authority.
- `backend/src/plans/plans.service.ts` — Enforces destination query scoping and mutation locks to `req.user.region` for NTAs.
- `backend/src/plans/plans.controller.ts` — REST endpoints for plan curation guarded by `RolesGuard` and `AuthGuard`.
- `frontend/src/context/AuthContext.jsx` — Normalizes session profiles and maps canonical NTA regions from signed tokens.
- `frontend/src/services/session.js` — Secure session storage with complete cleanup of `xploreoUser`, `currentUser`, and `xploreoToken`.
- `Database/seeds/users.json` — Consolidated credentials for all system actors including the 5 regional NTAs.
- `Database/seeds/plans.json` — Canonical travel packages across Jaipur, Goa, Delhi, Mumbai, and Kerala.
- `docs/nta-five-region-implementation-plan.txt` & `docs/nta-login-fix-report.txt` — Architecture blueprints and audit reports.

---

### 10.2 Krovi Sriram — M5: Traveler Modules

**Scope:** Architecture and implementation of traveler-facing features, including package browsing, trip planning, multi-day itinerary viewing, checkout flows, booking management, and review submissions.

#### 1. Traveler Core Pages & Dashboards
- `frontend/src/pages/Traveller/TravellerDashboard.jsx` — Primary traveler dashboard displaying upcoming itineraries, booking shortcuts, and active trip statuses.
- `frontend/src/pages/Traveller/TravellerBrowsePage.jsx` — Comprehensive package and service browsing interface across regional destinations.
- `frontend/src/pages/Traveller/TravellerCheckoutPage.jsx` — Step-by-step booking and checkout flow with price calculations and contact validation.
- `frontend/src/pages/Traveller/TravellerTripsList.jsx` — Dedicated trip management view showing active, upcoming, and past journeys.
- `frontend/src/pages/Traveller/TravellerBookingsList.jsx` — Overview of confirmed hotel and experience reservations.
- `frontend/src/pages/Traveller/TravellerReviewsPage.jsx` — Completed trip feedback and rating dashboard.
- `frontend/src/pages/Traveller/TravellerSupportTicketsPage.jsx` — Traveler support ticket submission and history view.

#### 2. Item Details & Modals
- `frontend/src/pages/TravellerDetail/TravellerItemDetailPage.jsx` — Detailed package inspection view featuring hotel amenities and experience schedules.
- `frontend/src/pages/TravellerDetail/HotelDetailPage.jsx` — Property-specific room catalog and amenity overview.
- `frontend/src/pages/TravellerDetail/RoomDetailPage.jsx` — Detailed room specifications and booking rates.
- `frontend/src/pages/TravellerDetail/ExperienceDetailPage.jsx` — Curated experience details, meeting locations, and duration information.
- `frontend/src/pages/TravellerDetail/BookingConfirmationPage.jsx` — Post-checkout confirmation receipt and itinerary summary.
- `frontend/src/pages/TravellerDetail/ReviewSubmitPage.jsx` — Dedicated review submission form for completed services.
- `frontend/src/pages/Traveller/BrowseItemDetailModal.jsx` — Quick-view drawer for packages, hotels, and activities.
- `frontend/src/pages/Traveller/TravellerTripDetailsView.jsx` — Expanded view of individual multi-day itinerary milestones.
- `frontend/src/pages/Traveller/BookingDetailsView.jsx` — Detailed voucher and confirmation view for individual reservations.

#### 3. Cards, Widgets & Stylesheets
- `frontend/src/pages/Traveller/BrowsePlanCard.jsx` — Package summary card for regional browsing.
- `frontend/src/pages/Traveller/BrowseHotelCard.jsx` — Hotel property card with star ratings and pricing.
- `frontend/src/pages/Traveller/BrowseExperienceCard.jsx` — Experience activity card highlighting categories and duration.
- `frontend/src/pages/Traveller/BrowseGuideCard.jsx` — Local guide profile card with spoken languages and specialties.
- `frontend/src/pages/Traveller/TripLiveTrackerWidget.jsx` — Real-time progress widget for ongoing journeys.
- `frontend/src/pages/Traveller/ReviewSubmissionForm.jsx` — Star rating and textual feedback form component.
- `frontend/src/pages/Traveller/TravellerReviewsList.jsx` — List view of past reviews submitted by the traveler.
- `frontend/src/pages/Traveller/travellerDashboard.css` — Dashboard styling.
- `frontend/src/pages/Traveller/travellerBrowse.css` — Browse catalog styling.
- `frontend/src/pages/Traveller/travellerCheckout.css` — Checkout flow layout styling.
- `frontend/src/pages/Traveller/travellerTrips.css` — Trip list and tracker styling.
- `frontend/src/pages/Traveller/travellerBookings.css` — Booking history styling.
- `frontend/src/pages/Traveller/travellerReviews.css` — Review page styling.
- `frontend/src/pages/Traveller/travellerSupportTickets.css` — Traveler ticket page styling.
- `frontend/src/pages/TravellerDetail/travellerDetail.css` — Shared detail page styling.
- `frontend/src/routes/traveller.routes.jsx` & `travellerDetail.routes.jsx` — Route definitions for traveler views.

---

### 10.3 Sreekar — M1: Landing Pages and Authentication

**Scope:** Initial platform landing experience, public marketing pages, primary navigation, authentication entry screens, and initial registration forms.

#### 1. Public Marketing & Informational Pages
- `frontend/src/pages/Home/landing.jsx` — Main public landing page featuring dynamic video hero, platform highlights, and actor portals.
- `frontend/src/pages/Home/partners.jsx` — Information page explaining service partner onboarding and collaboration models.
- `frontend/src/pages/Home/tours.jsx` — Public tour showcase and curated travel inspiration view.
- `frontend/src/pages/Home/support.jsx` — Public help center and FAQ interface.
- `frontend/src/pages/Home/home.css` — Visual styling and layout rules for public landing pages.

#### 2. Authentication Entry & Registration
- `frontend/src/pages/Auth/login.jsx` — Primary sign-in screen connecting users to role-specific destinations.
- `frontend/src/pages/Auth/register.jsx` — Multi-role user registration form supporting Travelers, Guides, and Partners.
- `frontend/src/pages/Auth/auth.css` — Form styling and responsive layouts for login and registration pages.

#### 3. Public Navigation & Shared Layout
- `frontend/src/components/Navbar/navbar.jsx` — Universal top navigation bar adapting dynamically to guest vs authenticated states.
- `frontend/src/components/Navbar/navbar.css` — Navigation bar styling and responsive dropdown rules.
- `frontend/src/components/Footer/footer.jsx` — Universal footer component.
- `frontend/src/components/Footer/footer.css` — Footer styling.

---

### 10.4 Siddarth — Guide Modules & Experience Dashboard/Bookings

**Scope:** Architecture and implementation of the Guide portal modules, alongside the Experience Partner dashboard and booking management interfaces.

#### 1. Guide Portal Pages
- `frontend/src/pages/Guide/GuideDashboard.jsx` — Guide cockpit displaying active tour schedules, upcoming traveler meetups, and quick stats.
- `frontend/src/pages/Guide/GuideTours.jsx` — Tour itinerary management, schedule confirmation, and traveler contact details.
- `frontend/src/pages/Guide/GuideEarnings.jsx` — Completed tour payouts, payout history, and tip tracking.
- `frontend/src/pages/Guide/GuideReviews.jsx` — Traveler ratings and feedback received by the guide.
- `frontend/src/pages/Guide/GuideSupport.jsx` — Guide support ticket submission and assistance portal.

#### 2. Guide Components, Styling & Routes
- `frontend/src/components/guide/GuideLayout.jsx` — Unified layout structure and navigation sidebar for guide views.
- `frontend/src/components/guide/Dialog.jsx` — Confirmation and alert modal component for tour updates.
- `frontend/src/components/guide/StatusChip.jsx` — Status indicator chip for tour stages (scheduled, ongoing, completed).
- `frontend/src/components/guide/Toast.jsx` — Transient notification alerts for guide interactions.
- `frontend/src/pages/Guide/guideDashboard.css` — Guide dashboard styling.
- `frontend/src/pages/Guide/guideTours.css` — Guide tour calendar and list styling.
- `frontend/src/pages/Guide/guideEarnings.css` — Guide financial statement styling.
- `frontend/src/pages/Guide/guideReviews.css` — Guide review list styling.
- `frontend/src/pages/Guide/guideShared.css` — Shared guide portal design system tokens.
- `frontend/src/routes/guide.routes.jsx` — Routing definitions for all `/guide/*` endpoints.

#### 3. Experience Partner Dashboard & Bookings
- `frontend/src/pages/Experience/ExperienceHome.jsx` — Experience Partner dashboard with real-time participation metrics and activity summaries.
- `frontend/src/pages/Experience/ExperienceBookings.jsx` — Experience participant management, reservation verification, and attendance status.
- `frontend/src/pages/Experience/experienceShared.css` — Shared styling for experience partner dashboard components.

---

### 10.5 Dheeraj — Hotel Modules & Experience Catalog/Earnings

**Scope:** Architecture and implementation of the Hotel Partner portal modules, alongside the Experience Partner catalog, time-slot scheduler, and earnings management.

#### 1. Hotel Partner Portal Pages
- `frontend/src/pages/Hotel/HotelDashboard.jsx` — Hotel executive cockpit showing occupancy rates, room revenue, and today's arrivals.
- `frontend/src/pages/Hotel/HotelProperties.jsx` — Multi-property management dashboard to add, list, and delete hotels and oversee associated room types/services.
- `frontend/src/pages/Hotel/HotelRooms.jsx` — Room category catalog, pricing per night, and inventory configuration.
- `frontend/src/pages/Hotel/HotelBookings.jsx` — Guest reservation management, arrival dates, and check-in/check-out actions.
- `frontend/src/pages/Hotel/HotelEarnings.jsx` — Room revenue statements, payout histories, and platform fee breakdowns.
- `frontend/src/pages/Hotel/HotelReviews.jsx` — Guest feedback and ratings for hotel properties and amenities.
- `frontend/src/pages/Hotel/HotelProfile.jsx` — Hotel property details, photos, amenities, and location settings.
- `frontend/src/pages/Hotel/HotelSupport.jsx` — Hotel partner support ticket submission interface.


#### 2. Hotel Components, Styles & Routes
- `frontend/src/components/hotel/HotelLayout.jsx` — Common sidebar and header layout for hotel views.
- `frontend/src/components/hotel/HotelPage.jsx` — Page frame wrapper providing consistent headings and action buttons.
- `frontend/src/components/hotel/hotelKit.jsx` — Common UI building blocks for hotel dashboards and tables.
- `frontend/src/components/hotel/hotelUnified.css` — Comprehensive styling system for the Hotel Partner portal.
- `frontend/src/routes/hotel.routes.jsx` — Routing configuration for all `/hotel/*` endpoints.

#### 3. Experience Partner Catalog, Slot Management & Earnings
- `frontend/src/pages/Experience/ExperienceCatalog.jsx` — Activity catalog management with create/edit actions and fixed regional hub binding.
- `frontend/src/pages/Experience/ExperienceEarnings.jsx` — Activity revenue analytics and payout history for Experience Partners.
- `frontend/src/components/experience/ExperienceFormModal.jsx` — Activity creation and editing modal form.
- `frontend/src/components/experience/SlotManager.jsx` — Time-slot scheduling and capacity management component.
- `frontend/src/components/experience/SlotModal.jsx` — Modal for adding/editing available participant slots.
- `frontend/src/components/experience/ImageDropzone.jsx` — Image upload and asset preview component.
- `frontend/src/components/experience/ModalFrame.jsx` — Dialog frame for experience management modals.
- `frontend/src/components/experience/Feedback.jsx` — Visual status banners and alert feedback.
- `frontend/src/components/experience/ExperiencePage.jsx` — Content frame wrapper for experience views.
- `frontend/src/components/experience/ExperienceLayout.jsx` — Primary navigation and sidebar layout for experience views.
- `frontend/src/routes/experience.routes.jsx` — Routing configuration for all `/experience/*` endpoints.

---

## 11. Verification and Audit Summary

All modules and integrations across the Xploreo platform have been verified against the physical repository:

1. **Compilation & Builds:**
   - **Backend:** `npm run build` (`nest build`) compiles with zero TypeScript errors into `backend/dist/`.
   - **Frontend:** `npm run build` (`vite build`) compiles with zero errors into `frontend/dist/`.
2. **Automated Security Tests:**
   - **Backend:** `npm test` runs all test suites in `backend/src/auth/auth-security.spec.ts` validating signed JWT issuance, regional isolation for `NTA001`–`NTA005`, and SuperAdmin authority.
3. **Live Authentication Verification:**
   - Server-side login tested and verified for all 7 platform roles (`T001`, `G001`, `HP001`, `XP001`, `SA001`, `TA001`, and `NTA001` through `NTA005`).
4. **Data Integrity:**
   - Verified that seed files under `Database/seeds/` maintain consistent references across travel plans, hotel catalog records, experience catalog records, and guide requests.

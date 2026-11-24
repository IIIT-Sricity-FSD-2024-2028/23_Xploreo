# Xploreo Centralized Development Seed Data Architecture

## 1. Overview & Purpose

The root `Database/` directory serves as the **single canonical source of truth** for all development seed data, operational defaults, and frontend preview fixtures across the Xploreo platform.

Previously, seed and mock data were fragmented across 20+ backend repositories, frontend mock databases (`mockKit`), and ad-hoc fallback fixtures with conflicting identities and mismatched keys. This centralized architecture provides:

1. **One Canonical Location:** All operational development records live in `Database/seeds/`.
2. **Predictable Schema & Identifiers:** Strict, consistent UUID and entity ID standards across all 7 platform roles.
3. **Dual Consumer Support:** Both backend (NestJS/TypeScript) and frontend (Vite/React) consume this single directory without duplicating datasets.
4. **Preservation of Existing Assets:** The original database schema (`dbschema.sql`) and architectural diagrams (`ER_Diagram (2).jpg`) remain preserved in place.

---

## 2. Directory Structure

```text
Database/
├── README.md                      # Architecture, conventions, and operational guide (this document)
├── dbschema.sql                   # Reference SQL schema definition
├── ER_Diagram (2).jpg             # Original Entity-Relationship architectural diagram
├── index.js                       # Universal Node/ESM module loader for seeds and fixtures
├── seeds/                         # Canonical operational seed data (backend initial state & live entities)
│   ├── users.json                 # Core authentication credentials & role records
│   ├── travellers.json            # Traveller domain profiles (canonical T001 + backward-compatible aliases)
│   ├── guides.json                # Guide professional profiles & certifications
│   ├── admins.json                # Tech Admin, Non-Tech Admin, and SuperAdmin records
│   ├── partner_profiles.json      # Hotel & Experience partner business profiles
│   ├── cities.json                # Supported operating regions (Mumbai, Delhi, Jaipur, Goa, Kerala)
│   ├── locations.json             # Regional points of interest & attraction locations
│   ├── hotels.json                # Hotel listings with pricing, stars, and locations
│   ├── room_types.json            # Inventory room types with occupancy and availability
│   ├── experiences.json           # Guided experiences, pricing, categories, and time slots
│   ├── plans.json                 # Holiday packages & structured day-by-day itineraries
│   ├── hotel_bookings.json        # Hotel reservation records
│   ├── experience_bookings.json   # Experience booking records
│   ├── trips.json                 # Traveller itineraries & live guide tracking states
│   ├── guide_applications.json    # Guide applications for package itineraries
│   ├── guide_requests.json        # Specific guide allocation requests
│   ├── reviews.json               # Ratings and reviews for hotels, experiences, and guides
│   └── tickets.json               # Support tickets, priorities, categories, and resolutions
└── fixtures/                      # Isolated development fixtures for previews and simulations
    ├── admin/
    │   ├── nta_metrics.json       # Non-Tech Admin telemetry, KPIs, and regional breakdowns
    │   └── superadmin_metrics.json# SuperAdmin ledger, disputes, refunds, and earnings series
    ├── browse/
    │   └── browse_fixtures.json   # Public catalog browse previews & fallback cards
    ├── hotels/
    │   └── catalog.json           # Extended multi-city hotel inventory catalog
    ├── experiences/
    │   └── catalog.json           # Extended curated experience catalog
    ├── payments/
    │   └── mock_transactions.json # Payment gateway sandbox simulation payloads
    └── upload/
        └── mock_files.json        # Mock multi-part file upload responses
```

---

## 3. Canonical Identity Conventions & Role Directory

All platform roles have canonical operational accounts established across backend and frontend, with complete 5-region coverage across Jaipur, Goa, Delhi, Mumbai, and Kerala:

| Role | Canonical User ID | Username / Email | Default Password | Primary Name / Entity | Region |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Traveller** | `T001` | `anjali@xploreo.com` | `TRA@123` | Anjali Sharma (legacy: `20001`) | Global |
| **Super Admin** | `SA001` | `raj@xploreo.com` | `SA@123` | Raj Sharma (legacy: `seed-superadmin-1`) | Global |
| **Tech Admin** | `TA001` | `dev@xploreo.com` | `TA@123` | Dev Mehta (legacy: `seed-tech-1`) | Global |
| **Non-Tech Admin (Jaipur)** | `NTA001` | `nontech.admin@xploreo.com` | `NTA@123` | Neha Mehra | Jaipur |
| **Non-Tech Admin (Goa)** | `NTA002` | `nta.goa@xploreo.com` | `NTA@123` | Rohan D Souza | Goa |
| **Non-Tech Admin (Delhi)** | `NTA003` | `nta.delhi@xploreo.com` | `NTA@123` | Sunita Verma | Delhi |
| **Non-Tech Admin (Mumbai)** | `NTA004` | `nta.mumbai@xploreo.com` | `NTA@123` | Aakash Kulkarni | Mumbai |
| **Non-Tech Admin (Kerala)** | `NTA005` | `nta.kerala@xploreo.com` | `NTA@123` | Ananya Nair | Kerala |
| **Hotel Partner (Jaipur)** | `HP001` | `hotel.partner@xploreo.com` | `HP@123` | Heritage Stays Pvt Ltd | Jaipur |
| **Hotel Partner (Goa)** | `HP002` | `hotel.goa@xploreo.com` | `HP@123` | Goa Coastal Resorts & Stays Ltd | Goa |
| **Hotel Partner (Delhi)** | `HP003` | `hotel.delhi@xploreo.com` | `HP@123` | Capital Heritage Stays Pvt Ltd | Delhi |
| **Hotel Partner (Mumbai)** | `HP004` | `hotel.mumbai@xploreo.com` | `HP@123` | Marine Bay Hotels & Suites | Mumbai |
| **Hotel Partner (Kerala)** | `HP005` | `hotel.kerala@xploreo.com` | `HP@123` | Malabar Coast Retreats Pvt Ltd | Kerala |
| **Exp Partner (Jaipur)** | `XP001` | `experience.partner@xploreo.com`| `XP@123` | Pink City Days & Heritage Trails | Jaipur |
| **Exp Partner (Goa)** | `XP002` | `exp.goa@xploreo.com` | `XP@123` | Goa Coastal Adventures Ltd | Goa |
| **Exp Partner (Delhi)** | `XP003` | `exp.delhi@xploreo.com` | `XP@123` | Dilli Walking Tours & Trails | Delhi |
| **Exp Partner (Mumbai)** | `XP004` | `exp.mumbai@xploreo.com` | `XP@123` | Bombay Heritage Expeditions | Mumbai |
| **Exp Partner (Kerala)** | `XP005` | `exp.kerala@xploreo.com` | `XP@123` | Kerala Backwaters Kayaking & Tours | Kerala |
| **Lead Guide (Mumbai)** | `G001` | `sreekar@gmail.com` | `GUD@123` | Sreekar Sharma | Mumbai |
| **Lead Guide (Kerala)** | `G002` | `arjun.nair@example.com` | `GUD@123` | Arjun Nair | Kerala |
| **Lead Guide (Jaipur)** | `G003` | `priya.rathore@example.com` | `GUD@123` | Priya Rathore | Jaipur |
| **Lead Guide (Goa)** | `G006` | `carlos.fernandes@example.com` | `GUD@123` | Carlos Fernandes | Goa |
| **Lead Guide (Delhi)** | `G009` | `amitav.sengupta@example.com` | `GUD@123` | Amitav Sengupta | Delhi |

*(Total of 15 regional guides: G001, G012, G013 for Mumbai; G002, G014, G015 for Kerala; G003, G004, G005 for Jaipur; G006, G007, G008 for Goa; G009, G010, G011 for Delhi)*

### Identity Resolution & Alias Handling:
- **Traveller:** Canonical `T001` is used across active live flows. Legacy numeric identifier `20001` is maintained as a `legacyId` property on `T001` in `travellers.json` and documented in `Database/fixtures/legacy/legacy_identities.json`.
- **Admins:** Canonical `TA001` (Dev Mehta, `dev@xploreo.com`) and `SA001` (Raj Sharma, `raj@xploreo.com`) are unified with their legacy backend keys (`seed-tech-1`, `seed-superadmin-1`) via `legacyId` mappings.
- **Guest Bookings:** Bookings made by unauthenticated or guest users utilize `seed-guest` (Meera Nair), fully indexed in `travellers.json`.

---

## 4. How Backend Repositories Load Canonical Seeds

The backend utilizes `backend/src/common/utils/seed-loader.ts`.

### Loading Mechanism:
```typescript
import { loadSeedData, loadSeedRecord } from '../common/utils/seed-loader';

// For arrays:
private hotels: Hotel[] = loadSeedData<Hotel>('hotels.json');

// For structured record objects:
private admins = loadSeedRecord('admins.json', { techAdmins: [] }).techAdmins;
```

### Runtime Path Resolution:
`seed-loader.ts` checks the following paths in sequence, ensuring robustness across both development (`ts-node`/`nest start`) and compiled production output (`dist/`):
1. `path.resolve(process.cwd(), '../Database/seeds', filename)` (when running from `backend/`)
2. `path.resolve(process.cwd(), 'Database/seeds', filename)` (when running from monorepo root)
3. `path.resolve(__dirname, '../../../../Database/seeds', filename)` (when executing compiled JS in `dist/`)
4. `path.resolve(__dirname, '../../../../../Database/seeds', filename)`

### Migrated Backend Repositories (All 20):
1. `AuthRepository` (`auth/auth.repository.ts`)
2. `HotelsRepository` (`hotels/hotels.repository.ts`)
3. `RoomTypesRepository` (`hotels/room-types.repository.ts`)
4. `PartnerProfileRepository` (`hotels/partner-profile.repository.ts`)
5. `BookingsRepository` (`bookings/bookings.repository.ts`)
6. `ExperiencesRepository` (`experiences/experiences.repository.ts`)
7. `ExperienceBookingsRepository` (`experience-bookings/experience-bookings.repository.ts`)
8. `PlansRepository` (`plans/plans.repository.ts`)
9. `TripsRepository` (`trips/trips.repository.ts`)
10. `ReviewsRepository` (`reviews/reviews.repository.ts`)
11. `TicketsRepository` (`tickets/tickets.repository.ts`)
12. `GuideRepository` (`guide/guide.repository.ts`)
13. `GuideApplicationsRepository` (`guide-applications/guide-applications.repository.ts`)
14. `GuideRequestsRepository` (`guide-requests/guide-requests.repository.ts`)
15. `NontechadminRepository` (`nontechadmin/nontechadmin.repository.ts`)
16. `TechadminRepository` (`techadmin/techadmin.repository.ts`)
17. `SuperadminRepository` (`superadmin/superadmin.repository.ts`)
18. `TravellerRepository` (`traveller/traveller.repository.ts`)
19. `CitiesRepository` (`cities/cities.repository.ts`)
20. `LocationRepository` (`location/location.repository.ts`)

---

## 5. How Frontend Consumes Canonical Data

The frontend Vite build is configured with an alias in `frontend/vite.config.js`:
```javascript
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    '@database': fileURLToPath(new URL('../Database', import.meta.url)),
  },
},
server: {
  fs: {
    allow: ['..'],
  },
},
```

### Consumption Strategy:
- **Fixtures Re-exporting:** Previously hardcoded fixture arrays (`MOCK_TICKETS`, `MOCK_PLANS`, `DEFAULT_HOTEL_FIXTURES`, etc.) now import and re-export directly from `@database/...`.
- **Zero In-Memory Drift:** Changing a record in `Database/seeds/` or `Database/fixtures/` instantly reflects across both backend repositories and frontend mock adapters.

---

## 6. Mock Mode vs. Live API Mode

### Default Configuration:
- **Live APIs are the default:** When the environment variable `VITE_MOCKS` is unset or empty, the frontend operates in **100% Live API Mode**.
- `isPlansMockMode()` in `frontend/src/services/plans.api.js` defaults to `false`.
- `loadMocks()` in `frontend/src/lib/mockKit/loadMocks.js` returns an empty array, registering no mock interceptors.

### Explicit Mock Mode & Unified Transport:
To enable mock mode for development or isolated offline testing:
- Set `VITE_MOCKS=all` in `frontend/.env.development` or run:
  ```bash
  VITE_MOCKS=all npm run dev
  ```
- Or enable specific domains: `VITE_MOCKS=plans,hotels,partners,guide,nta,superadmin`
- **Unified Transport Bridge:** Both `request.js` and `apiRequest()` in `frontend/src/services/api.js` check MockKit registry before dispatching HTTP network calls. When `VITE_MOCKS` is enabled, all registered mock routes (hotels, bookings, experiences, reviews, uploads) respond locally without creating a split-brain hybrid state.
- **Unmocked Routes:** Endpoints without registered mock interceptors fall through to live REST APIs.

### Fallback Policy:
- **No Silent Fallbacks:** Pages and services (`plans.api.js`, `nta.api.js`, `superadmin.api.js`, `TravellerTripsList.jsx`, `TravellerDashboard.jsx`, `TechAdmin/tickets.jsx`, `TravellerItemDetailPage.jsx`) do not silently substitute mock fixtures on live API failure. Errors propagate to the caller to display standard error feedback and retry controls.

---

## 7. How to Add or Modify Seed Records Safely

1. **ID Uniqueness:** Never reuse an ID within the same entity type. Use standard patterns:
   - Hotel: `hotel-<partner>-<number>` (e.g. `hotel-hp001-3`)
   - Experience: `exp-<number>`
   - Plan: `plan-<number>` or `plan-<region>-<slug>`
   - Booking: `bkg-<id>` or `BK-<year>-<number>`
   - Trip: `trip-<region>-<number>`
2. **Foreign Key Integrity:**
   - Any new hotel booking must reference a valid `hotelId` in `hotels.json` and `travellerId` in `users.json`/`travellers.json`.
   - Any new experience booking must reference a valid `experienceId` in `experiences.json`.
   - Any new trip must reference a valid `planId` and `travellerId`.
3. **Verification Command:**
   Run the relational validation script before saving changes:
   ```bash
   node -e "require('./Database/index.js')"
   ```

---

## 8. Unresolved Legacy Fixtures & Notes

- **Guide Request Experience Resolution:** `guide_requests.json` record `guide-request-1` references canonical `exp-2` ('Alleppey Sunrise Kayaking & Canal Walk') corresponding to `trip-guide-request-1` (`plan-1`). The historical untyped reference is preserved in `Database/fixtures/legacy/guide_requests.legacy.json`.
- **Legacy Identity Fixture:** Backward-compatible mappings (`T001` <-> `20001`, `TA001` <-> `seed-tech-1`, `SA001` <-> `seed-superadmin-1`) are documented in `Database/fixtures/legacy/legacy_identities.json`.
- **Mock Adapter Retirement:** `frontend/src/services/mockHotelAdapter.js` has been retired from all active routes. The Traveller portal exclusively uses the live `GET /api/bookings` backend endpoint.
- **Isolated Domain Demos:** Sub-domain fixtures in `frontend/src/mocks/schedule/`, `frontend/src/mocks/upload/` remain isolated for developer preview testing when `VITE_MOCKS` is explicitly enabled.

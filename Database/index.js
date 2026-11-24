/**
 * Database/index.js
 * Central access point for canonical development seeds and fixtures.
 * Supports both Node.js CommonJS and ESM environments.
 */

const fs = require('fs');
const path = require('path');

function readJson(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

module.exports = {
  // Seeds
  getUsers: () => readJson('./seeds/users.json'),
  getTravellers: () => readJson('./seeds/travellers.json'),
  getGuides: () => readJson('./seeds/guides.json'),
  getAdmins: () => readJson('./seeds/admins.json'),
  getPartnerProfiles: () => readJson('./seeds/partner_profiles.json'),
  getCities: () => readJson('./seeds/cities.json'),
  getLocations: () => readJson('./seeds/locations.json'),
  getHotels: () => readJson('./seeds/hotels.json'),
  getRoomTypes: () => readJson('./seeds/room_types.json'),
  getExperiences: () => readJson('./seeds/experiences.json'),
  getPlans: () => readJson('./seeds/plans.json'),
  getHotelBookings: () => readJson('./seeds/hotel_bookings.json'),
  getExperienceBookings: () => readJson('./seeds/experience_bookings.json'),
  getTrips: () => readJson('./seeds/trips.json'),
  getGuideApplications: () => readJson('./seeds/guide_applications.json'),
  getGuideRequests: () => readJson('./seeds/guide_requests.json'),
  getReviews: () => readJson('./seeds/reviews.json'),
  getTickets: () => readJson('./seeds/tickets.json'),

  // Fixtures
  getNtaMetrics: () => readJson('./fixtures/admin/nta_metrics.json'),
  getSuperadminMetrics: () => readJson('./fixtures/admin/superadmin_metrics.json'),
  getHotelCatalog: () => readJson('./fixtures/hotels/catalog.json'),
  getExperienceCatalog: () => readJson('./fixtures/experiences/catalog.json'),
  getBrowseFixtures: () => readJson('./fixtures/browse/browse_fixtures.json'),
  getMockPayments: () => readJson('./fixtures/payments/mock_transactions.json'),
  getMockUploadFiles: () => readJson('./fixtures/upload/mock_files.json'),
};

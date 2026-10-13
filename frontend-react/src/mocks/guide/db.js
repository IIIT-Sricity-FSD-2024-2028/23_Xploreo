// In-memory "database" for the guide mock domain (M2 guide portal).
// Shapes copy backend/src: plans, guide-applications, guide-assignments, trips, reviews,
// schedule, tickets and traveller entities. Dates are relative to today so the demo never goes stale.
//
// Seeded on purpose:
//   guide-jpr-1   busy guide: applications in two states, a job in every assignment status,
//                 one trip not started / one ongoing / one completed, reviews, schedule, tickets
//   guide-goa-1   a brand-new guide: nothing but the Goa plans   -> every empty state
//   (other guides exist only as owners of their own rows, to prove "guide A cannot see guide B")
import { dayOffset, reviews } from '../partners/db.js';

const iso = (offsetDays, hour = 10) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

// ── Plans ─────────────────────────────────────────────────────────────────────
const plan = (id, title, destination, originCity, durationNights, pricePerPerson, hotelStars, description, tags) => ({
  id, title, description, originCity, destination, durationNights, pricePerPerson, hotelStars,
  includesFlight: false, image: '', tags, isActive: true, status: 'published',
});

export const plans = [
  plan('plan-jpr-1', 'Pink City Heritage Escape', 'Jaipur', 'Delhi', 3, 18500, 4, 'Palaces, bazaars and a sunset over Nahargarh with a local storyteller guiding every stop.', ['heritage', 'culture']),
  plan('plan-jpr-2', 'Royal Rajasthan Fort Trail', 'Jaipur', 'Mumbai', 4, 24000, 5, 'Amber, Jaigarh and Nahargarh forts, a camel ride and a candle-lit dinner in a haveli courtyard.', ['forts', 'luxury']),
  plan('plan-jpr-3', 'Jaipur Food & Bazaar Weekender', 'Jaipur', 'Delhi', 2, 9800, 3, 'Kachori breakfasts, lassi stops and a block-printing workshop in the old city.', ['food', 'weekend']),
  plan('plan-goa-1', 'Goa Beach & Spice Retreat', 'Goa', 'Mumbai', 4, 21000, 4, 'Quiet beaches in the south, a spice plantation lunch and a sunset cruise on the Mandovi.', ['beach', 'relax']),
  plan('plan-goa-2', 'Old Goa Heritage Weekend', 'Goa', 'Bengaluru', 2, 11500, 3, 'Churches, Fontainhas and a feni tasting, walked at a gentle pace.', ['heritage', 'weekend']),
  plan('plan-del-1', 'Delhi Old & New', 'Delhi', 'Jaipur', 3, 15500, 4, 'Chandni Chowk food walk, Humayun’s Tomb and the lanes of Hauz Khas.', ['city', 'food']),
  plan('plan-mum-1', 'Mumbai Coast to Caves', 'Mumbai', 'Pune', 3, 17200, 4, 'Marine Drive, Elephanta Caves by ferry and a Bollywood studio afternoon.', ['city', 'islands']),
  plan('plan-ker-1', 'Kerala Backwaters & Hills', 'Kerala', 'Bengaluru', 5, 26500, 5, 'A houseboat in Alleppey, tea gardens in Munnar and a kathakali evening.', ['backwaters', 'nature']),
];

export const findPlan = (id) => plans.find((p) => p.id === id);

// ── Guide applications ────────────────────────────────────────────────────────
let applicationSeq = 4;
export const applications = [
  { id: 'app-1', guideId: 'guide-jpr-1', planId: 'plan-jpr-1', guidePricePerPerson: 1500, status: 'accepted', autoDecisionReason: "Auto-accepted: Guide location 'Jaipur' matches plan destination 'Jaipur'", createdAt: iso(-40), updatedAt: iso(-40) },
  { id: 'app-2', guideId: 'guide-jpr-1', planId: 'plan-jpr-2', guidePricePerPerson: 2200, status: 'accepted', autoDecisionReason: "Auto-accepted: Guide location 'Jaipur' matches plan destination 'Jaipur'", createdAt: iso(-33), updatedAt: iso(-33) },
  { id: 'app-3', guideId: 'guide-jpr-1', planId: 'plan-jpr-3', guidePricePerPerson: 1200, status: 'pending', createdAt: iso(-2), updatedAt: iso(-2) },
  { id: 'app-9', guideId: 'guide-del-1', planId: 'plan-del-1', guidePricePerPerson: 1400, status: 'accepted', autoDecisionReason: "Auto-accepted: Guide location 'Delhi' matches plan destination 'Delhi'", createdAt: iso(-12), updatedAt: iso(-12) },
];
export const newApplicationId = () => `app-${applicationSeq++}`;

// ── Guide assignments (jobs) ──────────────────────────────────────────────────
const assignment = (id, planId, travellerId, fee, count, startOffset, nights, status, extra = {}) => ({
  id,
  planId,
  bookingId: `bk-${id.split('-')[1]}`,
  travellerId,
  guideId: 'guide-jpr-1',
  guidePricePerPerson: fee,
  paidAmount: fee * count,
  travelerCount: count,
  startDate: dayOffset(startOffset),
  endDate: dayOffset(startOffset + nights),
  status,
  createdAt: iso(startOffset - 12),
  updatedAt: iso(startOffset - 12),
  ...extra,
});

export const assignments = [
  assignment('asg-1', 'plan-jpr-1', 'trav-201', 1500, 3, 3, 3, 'pending_guide_confirm'),
  assignment('asg-2', 'plan-jpr-2', 'trav-202', 2200, 2, 10, 4, 'pending_guide_confirm'),
  assignment('asg-3', 'plan-jpr-1', 'trav-203', 1500, 4, -1, 3, 'confirmed'),
  assignment('asg-4', 'plan-jpr-2', 'trav-204', 2200, 2, 7, 4, 'confirmed'),
  assignment('asg-5', 'plan-jpr-3', 'trav-205', 1200, 2, -30, 2, 'confirmed'),
  assignment('asg-6', 'plan-jpr-1', 'trav-206', 1500, 2, 15, 3, 'rejected_by_guide'),
  assignment('asg-7', 'plan-jpr-3', 'trav-207', 1200, 1, 20, 2, 'cancelled'),
  { ...assignment('asg-8', 'plan-del-1', 'trav-208', 1400, 2, 5, 3, 'pending_guide_confirm'), guideId: 'guide-del-1' },
];
export const findAssignment = (id) => assignments.find((a) => a.id === id);

// ── Trips (what the traveller booked; the assigned guide runs the live tracking) ─
function itineraryFor(titles, startOffset) {
  const experience = (n, title, location, dayIdx) => ({
    id: `itx-${n}`,
    experienceId: `exp-x-${n}`,
    title,
    location,
    startsAt: iso(startOffset + dayIdx, 9 + (n % 3) * 3),
    endsAt: iso(startOffset + dayIdx, 11 + (n % 3) * 3),
    status: 'confirmed',
  });
  let n = 1;
  const days = titles.map((dayTitles, dayIdx) => ({
    dayNumber: dayIdx + 1,
    experiences: dayTitles.map(([title, location]) => experience(n++, title, location, dayIdx)),
  }));
  return {
    day1: {
      flight: null,
      transport: { id: 'tr-1', provider: 'Xploreo Cabs', vehicleType: 'SUV', pickupLocation: 'Jaipur Airport', dropoffLocation: 'Hotel', pickupAt: iso(startOffset, 8), status: 'confirmed' },
      hotel: { id: 'ht-1', hotelId: 'hotel-1', name: 'Haveli Courtyard Inn', checkInDate: dayOffset(startOffset), checkOutDate: dayOffset(startOffset + titles.length), roomType: 'Deluxe', status: 'confirmed' },
    },
    days,
  };
}

const HERITAGE = [
  [['Amber Fort Sunrise Walk', 'Amber Fort'], ['City Palace Tour', 'City Palace'], ['Hawa Mahal Photo Stop', 'Hawa Mahal']],
  [['Jantar Mantar Stories', 'Jantar Mantar'], ['Johari Bazaar Walk', 'Johari Bazaar'], ['Nahargarh Sunset', 'Nahargarh Fort']],
];

export const trips = [
  {
    id: 'trip-1', travellerId: 'trav-203', planId: 'plan-jpr-1', guideId: 'guide-jpr-1', status: 'started',
    itinerary: itineraryFor(HERITAGE, -1), totalAmount: 74000, currentDay: 1, currentStop: 'City Palace Tour',
    currentLocation: 'City Palace', trackingStatus: 'ongoing', progressPercentage: 40, lastUpdatedAt: iso(0, 9),
  },
  {
    id: 'trip-2', travellerId: 'trav-204', planId: 'plan-jpr-2', guideId: 'guide-jpr-1', status: 'confirmed',
    itinerary: itineraryFor(HERITAGE, 7), totalAmount: 96000, currentDay: 1, currentStop: '',
    currentLocation: '', trackingStatus: 'not_started', progressPercentage: 0, lastUpdatedAt: iso(-5),
  },
  {
    id: 'trip-3', travellerId: 'trav-205', planId: 'plan-jpr-3', guideId: 'guide-jpr-1', status: 'completed',
    itinerary: itineraryFor([[['Kachori Breakfast Crawl', 'Rawat Mishthan'], ['Block Printing Workshop', 'Sanganer']]], -30),
    totalAmount: 19600, currentDay: 1, currentStop: 'Block Printing Workshop', currentLocation: 'Sanganer',
    trackingStatus: 'completed', progressPercentage: 100, lastUpdatedAt: iso(-29),
  },
  {
    id: 'trip-9', travellerId: 'trav-208', planId: 'plan-del-1', guideId: 'guide-del-1', status: 'confirmed',
    itinerary: itineraryFor([[['Chandni Chowk Food Walk', 'Chandni Chowk']]], 5), totalAmount: 31000, currentDay: 1,
    currentStop: '', currentLocation: '', trackingStatus: 'not_started', progressPercentage: 0, lastUpdatedAt: iso(-3),
  },
];
export const findTrip = (id) => trips.find((t) => t.id === id);

// ── Travellers (what a guide may see about the people on their jobs) ──────────
const traveller = (userId, fname, lname, phno, gender, dobYear) => ({
  userId, fname, lname, email: `${fname}.${lname}@mail.example`.toLowerCase(), phno, plang: ['English'], bio: '', interests: [],
  gender, dob: `${dobYear}-04-12`, status: 'active', isDeleted: false,
});
export const travellers = [
  traveller('trav-201', 'Ananya', 'Rao', 9876500201, 'Female', 1994),
  traveller('trav-202', 'Rohit', 'Menon', 9876500202, 'Male', 1988),
  traveller('trav-203', 'Sneha', 'Kulkarni', 9876500203, 'Female', 1991),
  traveller('trav-204', 'Vikram', 'Bhatia', 9876500204, 'Male', 1985),
  traveller('trav-205', 'Meera', 'Joshi', 9876500205, 'Female', 1996),
  traveller('trav-206', 'Arjun', 'Pillai', 9876500206, 'Male', 1990),
  traveller('trav-207', 'Kavya', 'Shetty', 9876500207, 'Female', 1999),
  traveller('trav-208', 'Imran', 'Sheikh', 9876500208, 'Male', 1987),
];

// ── Reviews written about guides (pushed into the shared reviews list the /reviews mock serves) ─
let guideReviewSeq = 5000;
const guideReview = (rating, comment, ageDays, userId) => ({
  id: guideReviewSeq++,
  userId,
  targetType: 'guide',
  targetId: 'guide-jpr-1',
  rating,
  comment,
  createdAt: new Date(Date.now() - ageDays * 86400000).toISOString(),
});
[
  guideReview(5, 'Aarav made the forts come alive. We never felt rushed and learned so much.', 3, 20001),
  guideReview(5, 'Friendly guide and a very well planned city walk.', 9, 20002),
  guideReview(4, 'Great local knowledge. Lunch spot was a gem. Started a little late.', 17, 20003),
  guideReview(3, 'Good tour but the pace was fast for our group with kids.', 31, 20004),
  guideReview(5, 'Best part of our Rajasthan trip, hands down.', 44, 20005),
].forEach((r) => reviews.push(r));
reviews.push({ id: 5100, userId: 20009, targetType: 'guide', targetId: 'guide-del-1', rating: 2, comment: 'Late and unprepared.', createdAt: iso(-6) });

// ── Schedule ──────────────────────────────────────────────────────────────────
let scheduleSeq = 1;
const slot = (guideId, title, offset, startTime, endTime, status, location, capacity, notes = '') => ({
  id: scheduleSeq++, guideId, title, date: dayOffset(offset), startTime, endTime, status, location, capacity, notes,
  createdAt: iso(-10),
});
export const scheduleItems = [
  slot('guide-jpr-1', 'Heritage Walk: Amber Fort', 2, '07:00', '11:00', 'booked', 'Amber Fort, Jaipur', 6, 'Sunrise group, pick-up at Hotel Narain'),
  slot('guide-jpr-1', 'Old City Food Trail', 4, '16:00', '19:30', 'available', 'Johari Bazaar, Jaipur', 8),
  slot('guide-jpr-1', 'City Palace Private Tour', 5, '10:00', '13:00', 'booked', 'City Palace, Jaipur', 4, 'Private family of four'),
  slot('guide-jpr-1', 'Family Holiday', 9, '00:00', '23:59', 'blocked', 'Jaipur', 1, 'Not available'),
  slot('guide-jpr-1', 'Nahargarh Sunset Walk', 12, '16:30', '19:00', 'available', 'Nahargarh Fort, Jaipur', 10),
  slot('guide-jpr-1', 'Block Printing Day', 14, '10:00', '15:00', 'available', 'Sanganer, Jaipur', 6),
  slot('guide-del-1', 'Chandni Chowk Walk', 3, '09:00', '12:00', 'available', 'Chandni Chowk, Delhi', 8),
];
export const newScheduleId = () => scheduleSeq++;

// ── Support tickets ───────────────────────────────────────────────────────────
let ticketSeq = 4;
export const tickets = [
  {
    id: 'TKT-1001', userId: 'guide-jpr-1', userName: 'Aarav Sharma (Guide)', userRole: 'GUIDE', travellerId: 'guide-jpr-1',
    travellerName: 'Aarav Sharma (Guide)', subject: 'Payout for last month not received', category: 'Payment & Payouts',
    message: 'The payout for the Jaipur Food & Bazaar weekend has not shown up in my account yet.', priority: 'HIGH', status: 'RESOLVED',
    createdAt: iso(-14), resolvedAt: iso(-12), resolution: 'The payout was delayed by the bank holiday and has now been released. Please check your account.', resolvedBy: 'Tech Admin',
  },
  {
    id: 'TKT-1002', userId: 'guide-jpr-1', userName: 'Aarav Sharma (Guide)', userRole: 'GUIDE', travellerId: 'guide-jpr-1',
    travellerName: 'Aarav Sharma (Guide)', subject: 'Cannot change my blocked dates', category: 'Technical Issue',
    message: 'The schedule page keeps showing the old blocked dates after I save a new range.', priority: 'MEDIUM', status: 'OPEN',
    createdAt: iso(-1),
  },
  {
    id: 'TKT-1003', userId: 'guide-del-1', userName: 'Imran Khan (Guide)', userRole: 'GUIDE', travellerId: 'guide-del-1',
    travellerName: 'Imran Khan (Guide)', subject: 'Profile photo will not upload', category: 'Account Settings',
    message: 'Uploading my profile photo fails every time.', priority: 'LOW', status: 'OPEN', createdAt: iso(-3),
  },
];
export const newTicketId = () => `TKT-${1000 + ticketSeq++}`;

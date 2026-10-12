// In-memory "database" for the partners + schedule mock domains (M2).
// Shapes copy backend/src/experiences, experience-bookings, reviews and auth entities.
// Deterministic (seeded) so every reload shows the same data. Dates are relative to today.
//
// Seeded on purpose (see M2 guide §5):
//   exp-goa-1  8 experiences, 100+ bookings in every status, one FULL slot, one experience with no slots
//   exp-goa-2  2 experiences, same region as exp-goa-1  -> "partner A opens partner B's item" = 403
//   exp-del-1  exactly ONE experience and ONE booking
//   exp-ker-1  no experiences and no bookings           -> empty list / empty earnings
//   all 5 regions: Jaipur, Goa, Delhi, Mumbai, Kerala

export const REGIONS = ['Jaipur', 'Goa', 'Delhi', 'Mumbai', 'Kerala'];

export const EXPERIENCE_CATEGORIES = [
  'adventure', 'culture', 'culinary', 'wellness', 'wildlife', 'photography', 'tours',
  'attraction tickets', 'water sports', 'cruises', 'family', 'luxury', 'weekend getaway',
  'honeymoon', 'pilgrimage',
];

const pad = (n) => String(n).padStart(2, '0');
function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function dayOffset(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function todayDate() {
  return dayOffset(0);
}
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function minutes(time) {
  const m = String(time).match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
}

// ── Partners (login users) ────────────────────────────────────────────────────
export const users = [
  { userId: 'exp-goa-1', username: 'coastal.trails', name: 'Coastal Trails Goa', email: 'hello@coastaltrails.example', phone: '+91 98765 40001', role: 'experience', location: 'Goa', businessName: 'Coastal Trails Pvt Ltd' },
  { userId: 'exp-goa-2', username: 'spice.route', name: 'Spice Route Experiences', email: 'team@spiceroute.example', phone: '+91 98765 40002', role: 'experience', location: 'Goa', businessName: 'Spice Route LLP' },
  { userId: 'exp-mum-1', username: 'mumbai.moments', name: 'Mumbai Moments', email: 'hi@mumbaimoments.example', phone: '+91 98765 40003', role: 'experience', location: 'Mumbai', businessName: 'Mumbai Moments' },
  { userId: 'exp-jpr-1', username: 'pink.city.days', name: 'Pink City Days', email: 'go@pinkcitydays.example', phone: '+91 98765 40006', role: 'experience', location: 'Jaipur', businessName: 'Pink City Days' },
  { userId: 'exp-del-1', username: 'delhi.heritage', name: 'Delhi Heritage Walks', email: 'walks@delhiheritage.example', phone: '+91 98765 40004', role: 'experience', location: 'Delhi', businessName: 'Delhi Heritage Walks' },
  { userId: 'exp-ker-1', username: 'kerala.backwater', name: 'Kerala Backwater Co', email: 'ahoy@keralabackwater.example', phone: '+91 98765 40005', role: 'experience', location: 'Kerala', businessName: 'Kerala Backwater Co' },
  { userId: 'guide-jpr-1', username: 'aarav.guide', name: 'Aarav Sharma (Guide)', email: 'aarav@guides.example', phone: '+91 98765 50001', role: 'guide', location: 'Jaipur', businessName: '' },
  { userId: 'guide-goa-1', username: 'maria.guide', name: 'Maria Fernandes (Guide)', email: 'maria@guides.example', phone: '+91 98765 50002', role: 'guide', location: 'Goa', businessName: '' },
  { userId: 'guide-del-1', username: 'imran.guide', name: 'Imran Khan (Guide)', email: 'imran@guides.example', phone: '+91 98765 50003', role: 'guide', location: 'Delhi', businessName: '' },
  { userId: 'guide-mum-1', username: 'neha.guide', name: 'Neha Patil (Guide)', email: 'neha@guides.example', phone: '+91 98765 50004', role: 'guide', location: 'Mumbai', businessName: '' },
  { userId: 'guide-ker-1', username: 'anil.guide', name: 'Anil Nair (Guide)', email: 'anil@guides.example', phone: '+91 98765 50005', role: 'guide', location: 'Kerala', businessName: '' },
];

// ── Experiences ───────────────────────────────────────────────────────────────
const TEMPLATES = {
  'exp-goa-1': [
    { title: 'Sunset Beach Photography Walk', category: 'photography', price: 1500, durationHours: 2, capacity: 12, description: 'Golden-hour guided walk for photographers and first-time visitors along Goa’s quietest beaches.' },
    { title: 'Spice Plantation & Cooking Class', category: 'culinary', price: 2200, durationHours: 4, capacity: 10, description: 'Walk a working spice farm, then cook a four-course Goan lunch with the family that runs it.' },
    { title: 'Dolphin Spotting Boat Ride', category: 'water sports', price: 1800, durationHours: 3, capacity: 8, description: 'Early-morning boat ride out of Sinquerim with a naturalist guide. Life jackets provided.' },
    { title: 'Old Goa Heritage Walk', category: 'culture', price: 900, durationHours: 2, capacity: 15, description: 'Churches, chapels and Portuguese-era lanes with a local historian.' },
    { title: 'Sunrise Yoga on the Cliffs', category: 'wellness', price: 700, durationHours: 2, capacity: 14, description: 'Beginner-friendly vinyasa flow on the clifftop as the sun comes up. Mats provided.' },
    { title: 'Backwater Kayak Safari', category: 'water sports', price: 2000, durationHours: 3, capacity: 6, description: 'Paddle the mangrove channels with a guide. Small groups only.', scenario: 'full' },
    { title: 'Night Market Food Trail', category: 'culinary', price: 1200, durationHours: 3, capacity: 10, description: 'Eleven street-food stops across the Saturday night markets. New experience, no sessions yet.', scenario: 'noslots' },
    { title: 'Mollem Wildlife Trek', category: 'wildlife', price: 2600, durationHours: 5, capacity: 8, description: 'Guided forest trek through Bhagwan Mahavir sanctuary. Paused for the monsoon.', scenario: 'inactive' },
  ],
  'exp-goa-2': [
    { title: 'Fontainhas Latin Quarter Tour', category: 'culture', price: 800, durationHours: 2, capacity: 12, description: 'Painted houses, tiny chapels and the story of Panjim’s old Latin quarter.' },
    { title: 'Cashew Distillery Visit', category: 'culinary', price: 1100, durationHours: 2, capacity: 10, description: 'See feni being made the traditional way and taste three vintages.' },
  ],
  'exp-mum-1': [
    { title: 'Dharavi Social Enterprise Walk', category: 'culture', price: 1000, durationHours: 3, capacity: 10, description: 'A resident-led walk through Dharavi’s recycling and pottery workshops.' },
    { title: 'Mohammed Ali Road Food Crawl', category: 'culinary', price: 1400, durationHours: 3, capacity: 8, description: 'Kebabs, malpua and falooda after the evening prayer.' },
    { title: 'Elephanta Caves Day Trip', category: 'tours', price: 2400, durationHours: 6, capacity: 14, description: 'Ferry, guide and lunch included.' },
  ],
  'exp-jpr-1': [
    { title: 'Amber Fort Sunrise Tour', category: 'tours', price: 1600, durationHours: 3, capacity: 12, description: 'Beat the crowds and see the fort turn gold with a licensed guide.' },
    { title: 'Block Printing Workshop', category: 'culture', price: 1300, durationHours: 3, capacity: 8, description: 'Print your own textile with a Sanganer master printer.' },
  ],
  'exp-del-1': [
    { title: 'Old Delhi Heritage Walk', category: 'culture', price: 1100, durationHours: 3, capacity: 10, description: 'Chandni Chowk, Jama Masjid and the lanes in between.', scenario: 'single' },
  ],
  'exp-ker-1': [],
};

const OFFSETS = [-4, -1, 0, 1, 2, 3, 6, 9];
const TIMES = ['09:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'];
const FIRST = ['Aditi', 'Rohan', 'Meera', 'Karan', 'Sana', 'Vikram', 'Priya', 'Arjun', 'Isha', 'Dev', 'Nisha', 'Rahul', 'Tara', 'Kabir', 'Anaya', 'Samir', 'Leela', 'Yash', 'Zoya', 'Neil'];
const LAST = ['Shah', 'Mehta', 'Iyer', 'Kapoor', 'Reddy', 'Nair', 'Bose', 'Khan', 'Gupta', 'Das', 'Pillai', 'Joshi'];

const COMMENTS = [
  'Wonderful host, we learned so much and the group size was perfect.',
  'Well organised and exactly as described. Would book again.',
  'Great value. The guide was warm, funny and clearly loves this place.',
  'Beautiful experience, though the start was a little late.',
  'Highlight of our trip. Photos came out amazing.',
  'Good but a bit rushed at the end. Still recommended.',
];

export const experiences = [];
export const bookings = [];
export const reviews = [];

let bookingSeq = 1;
let reviewSeq = 1;
const rngFor = (n) => makeRng(1000 + n * 7919);

Object.entries(TEMPLATES).forEach(([partnerId, templates], partnerIdx) => {
  const owner = users.find((u) => u.userId === partnerId);
  templates.forEach((tpl, idx) => {
    const rng = rngFor(partnerIdx * 31 + idx);
    const expId = `exp-${partnerId.split('-').slice(1).join('')}-${idx + 1}`;
    const exp = {
      id: expId,
      partnerId,
      title: tpl.title,
      description: tpl.description,
      destination: owner.location,
      category: tpl.category,
      availability: 'available',
      price: tpl.price,
      durationHours: tpl.durationHours,
      capacity: tpl.capacity,
      booked: 0,
      image: '',
      nextSlot: '',
      slots: [],
      status: tpl.scenario === 'inactive' ? 'inactive' : 'active',
      isDeleted: false,
    };

    if (tpl.scenario !== 'noslots') {
      const offsets = tpl.scenario === 'single' ? [2] : OFFSETS;
      offsets.forEach((off, i) => {
        exp.slots.push({
          id: `${expId}-s${i + 1}`,
          date: dayOffset(off),
          time: TIMES[(idx + i) % 4],
          booked: 0,
          capacity: tpl.capacity,
          available: true,
        });
      });
      if (tpl.scenario !== 'single' && partnerId === 'exp-goa-1' && idx < 3) {
        exp.slots.push({ id: `${expId}-s-today2`, date: dayOffset(0), time: TIMES[(idx + 3) % 4], booked: 0, capacity: tpl.capacity, available: true });
      }
    }

    // Bookings for each slot
    exp.slots.forEach((slot) => {
      let ratio;
      const r = rng();
      if (tpl.scenario === 'full' && slot.date === dayOffset(1)) ratio = 1;
      else if (tpl.scenario === 'single') ratio = 0;
      else ratio = r < 0.15 ? 0 : r < 0.4 ? 0.3 : r < 0.65 ? 0.6 : r < 0.85 ? 0.9 : 1;
      const target = Math.round(slot.capacity * ratio);
      let filled = 0;
      const isPast = slot.date < todayDate();
      const isToday = slot.date === todayDate();
      let guard = 0;
      while (filled < target && guard++ < 50) {
        const party = Math.max(1, Math.min(1 + Math.floor(rng() * 4), target - filled));
        const roll = rng();
        let status;
        if (isPast) status = roll < 0.8 ? 'COMPLETED' : 'CANCELLED';
        else if (isToday) status = roll < 0.25 ? 'CHECKED_IN' : roll < 0.4 ? 'END_REQUESTED' : 'CONFIRMED';
        else status = roll < 0.9 ? 'CONFIRMED' : 'CANCELLED';
        if (tpl.scenario === 'full' && slot.date === dayOffset(1)) status = 'CONFIRMED';
        pushBooking(exp, slot, party, status, rng);
        if (status !== 'CANCELLED') filled += party;
      }
    });

    if (tpl.scenario === 'single') {
      pushBooking(exp, exp.slots[0], 2, 'CONFIRMED', rng);
    }

    experiences.push(exp);

    // Reviews (experience partners with history only)
    if (tpl.scenario !== 'noslots' && tpl.scenario !== 'single') {
      const n = Math.floor(rng() * 3);
      for (let k = 0; k < n; k += 1) {
        reviews.push({
          id: reviewSeq++,
          userId: 2000 + Math.floor(rng() * 90),
          targetType: 'experience',
          targetId: expId,
          rating: 3 + Math.floor(rng() * 3),
          comment: COMMENTS[Math.floor(rng() * COMMENTS.length)],
          createdAt: new Date(Date.now() - Math.floor(rng() * 20) * 86400000).toISOString(),
        });
      }
    }
  });
});

function pushBooking(exp, slot, participants, status, rng) {
  const name = `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
  const created = new Date(`${slot.date}T09:00:00`);
  created.setDate(created.getDate() - (2 + Math.floor(rng() * 10)));
  bookings.push({
    id: `eb-${String(bookingSeq++).padStart(4, '0')}`,
    experienceId: exp.id,
    travellerId: `trav-${100 + Math.floor(rng() * 400)}`,
    guestName: name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@mail.example`,
    phone: `+91 9${Math.floor(100000000 + rng() * 899999999)}`,
    date: slot.date,
    time: slot.time,
    slotId: slot.id,
    participants,
    totalAmount: participants * exp.price,
    status,
    createdAt: created.toISOString(),
  });
}

// ── Derived fields, recomputed whenever bookings change (the "server" owns these) ──
export const ACTIVE = ['CONFIRMED', 'CHECKED_IN', 'END_REQUESTED', 'COMPLETED'];

export function refreshExperience(exp) {
  exp.slots.forEach((slot) => {
    slot.booked = bookings
      .filter((b) => b.experienceId === exp.id && b.slotId === slot.id && ACTIVE.includes(b.status))
      .reduce((sum, b) => sum + b.participants, 0);
    if (slot.booked >= slot.capacity) slot.available = false;
  });
  const today = todayDate();
  const upcoming = exp.slots
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date === b.date ? minutes(a.time) - minutes(b.time) : a.date < b.date ? -1 : 1));
  const next = upcoming.find((s) => s.available);
  exp.booked = upcoming.reduce((sum, s) => sum + s.booked, 0);
  exp.availability = next ? 'available' : 'unavailable';
  exp.nextSlot = next ? `${next.date} ${next.time}` : '';
  return exp;
}

experiences.forEach(refreshExperience);

let experienceSeq = 100;
export function newExperienceId(partnerId) {
  experienceSeq += 1;
  return `exp-${partnerId.split('-').slice(1).join('')}-${experienceSeq}`;
}

export function findExperience(id) {
  return experiences.find((e) => e.id === id);
}
export function findBooking(id) {
  return bookings.find((b) => b.id === id);
}
export function findUser(id) {
  return users.find((u) => u.userId === id);
}
export function publicUser(user) {
  const { ...safe } = user;
  return safe;
}
export function embedExperience(exp) {
  return exp
    ? { id: exp.id, partnerId: exp.partnerId, title: exp.title, destination: exp.destination, category: exp.category, price: exp.price, image: exp.image }
    : undefined;
}

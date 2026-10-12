// TEMP-STUB: stands in for M1's session.js (the only file allowed to touch storage).
// Dev users here must line up with the ids in src/mocks/partners/fixtures.js.

export const DEV_USERS = [
  { id: 'exp-goa-1', name: 'Coastal Trails Goa', partnerType: 'experience', region: 'Goa', email: 'hello@coastaltrails.example', phone: '+91 98765 40001', businessName: 'Coastal Trails Pvt Ltd' },
  { id: 'exp-goa-2', name: 'Spice Route Experiences', partnerType: 'experience', region: 'Goa', email: 'team@spiceroute.example', phone: '+91 98765 40002', businessName: 'Spice Route LLP' },
  { id: 'exp-mum-1', name: 'Mumbai Moments', partnerType: 'experience', region: 'Mumbai', email: 'hi@mumbaimoments.example', phone: '+91 98765 40003', businessName: 'Mumbai Moments' },
  { id: 'exp-del-1', name: 'Delhi Heritage Walks', partnerType: 'experience', region: 'Delhi', email: 'walks@delhiheritage.example', phone: '+91 98765 40004', businessName: 'Delhi Heritage Walks' },
  { id: 'exp-ker-1', name: 'Kerala Backwater Co', partnerType: 'experience', region: 'Kerala', email: 'ahoy@keralabackwater.example', phone: '+91 98765 40005', businessName: 'Kerala Backwater Co' },
  { id: 'guide-jpr-1', name: 'Aarav Sharma (Guide)', partnerType: 'guide', region: 'Jaipur', email: 'aarav@guides.example', phone: '+91 98765 50001', businessName: '' },
];

const KEY = 'xploreo.dev.identity';
const DEFAULT_ID = 'exp-goa-1';

function readStored() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getIdentity() {
  const stored = readStored();
  if (stored === 'none') return null;
  return DEV_USERS.find((u) => u.id === (stored || DEFAULT_ID)) ?? DEV_USERS[0];
}

export function storeIdentity(idOrNone) {
  try {
    sessionStorage.setItem(KEY, idOrNone);
  } catch {
    /* storage unavailable: fall back to the default dev user */
  }
}

// What the current backend expects: x-user-id / x-user-role / x-user-location headers.
// (The real foundation will send the login token instead; mocks only see the headers.)
const BACKEND_ROLE = { experience: 'experience', guide: 'guide', hotel: 'hotel' };

export function identityHeaders() {
  const identity = getIdentity();
  if (!identity) return {};
  return {
    'x-user-id': identity.id,
    'x-user-role': BACKEND_ROLE[identity.partnerType],
    'x-user-location': identity.region,
  };
}

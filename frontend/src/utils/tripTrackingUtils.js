/**
 * tripTrackingUtils.js
 * Pure utility functions for trip tracking, timestamp comparison, 
 * progress reconciliation, and connection/visibility event handling.
 * 
 * Rules:
 * - Server timestamps are authoritative.
 * - Handles duplicate, delayed, stale, and out-of-order tracking snapshots
 *   without regressing trip progress.
 * - Monotonic progress percentage enforcement: progress can only stay the same
 *   or advance, unless an authoritative reset occurs with a newer server timestamp.
 */

/**
 * Compare two ISO timestamp strings or Date-convertible inputs safely.
 * Returns:
 *   > 0 if timestampA is newer than timestampB
 *   < 0 if timestampA is older than timestampB
 *   0 if equal or cannot be determined
 * @param {string|Date} timestampA
 * @param {string|Date} timestampB
 * @returns {number}
 */
export function compareServerTimestamps(timestampA, timestampB) {
  if (!timestampA && !timestampB) return 0;
  if (!timestampA) return -1;
  if (!timestampB) return 1;

  const timeA = new Date(timestampA).getTime();
  const timeB = new Date(timestampB).getTime();

  if (isNaN(timeA) || isNaN(timeB)) return 0;
  return timeA - timeB;
}

/**
 * Reconcile a current trip snapshot with an incoming tracking update.
 * Prevents regressions caused by stale, delayed, or out-of-order polling responses.
 * 
 * @param {Object} currentTrip
 * @param {Object} incomingTrip
 * @returns {Object} Reconciled trip state
 */
export function reconcileTripTracking(currentTrip, incomingTrip) {
  if (!incomingTrip) return currentTrip;
  if (!currentTrip) return incomingTrip;

  // If different trips, do not reconcile
  if (currentTrip.id && incomingTrip.id && currentTrip.id !== incomingTrip.id) {
    return incomingTrip;
  }

  const timestampDiff = compareServerTimestamps(
    incomingTrip.lastUpdatedAt,
    currentTrip.lastUpdatedAt
  );

  // If incoming update has an older server timestamp than current, discard stale tracking fields
  if (timestampDiff < 0) {
    return currentTrip;
  }

  // If timestamps are equal or incoming is strictly newer:
  // Monotonic progress protection: progressPercentage must not regress unless status changed
  const currentProgress = Number(currentTrip.progressPercentage) || 0;
  const incomingProgress = Number(incomingTrip.progressPercentage) || 0;

  let reconciledProgress = incomingProgress;
  if (
    timestampDiff === 0 &&
    incomingProgress < currentProgress &&
    incomingTrip.status === currentTrip.status
  ) {
    reconciledProgress = currentProgress;
  }

  return {
    ...currentTrip,
    ...incomingTrip,
    progressPercentage: Math.max(reconciledProgress, incomingProgress),
    lastUpdatedAt: incomingTrip.lastUpdatedAt || currentTrip.lastUpdatedAt,
  };
}

/**
 * Maps TripTrackingStatus enum values to accessible human-readable labels and badge classes.
 * @param {string} trackingStatus 'not_started' | 'ongoing' | 'paused' | 'completed'
 * @returns {{ label: string, className: string, stepIndex: number }}
 */
export function getTrackingStatusBadge(trackingStatus) {
  switch ((trackingStatus || '').toLowerCase()) {
    case 'ongoing':
      return {
        label: 'In Transit / Live',
        className: 'is-ongoing',
        stepIndex: 2,
      };
    case 'paused':
      return {
        label: 'Paused / Break',
        className: 'is-paused',
        stepIndex: 2,
      };
    case 'completed':
      return {
        label: 'Trip Completed',
        className: 'is-completed',
        stepIndex: 3,
      };
    case 'not_started':
    default:
      return {
        label: 'Scheduled / Not Started',
        className: 'is-not-started',
        stepIndex: 1,
      };
  }
}

/**
 * Formats a relative or formatted update time for live tracking display.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatLastUpdatedTime(isoDate) {
  if (!isoDate) return 'Just now';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Recently';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Maps raw backend Trip entity/DTO to frontend trip properties.
 * Conforms to backend Trip entity:
 * { id, travellerId, planId, guideId, status, itinerary, totalAmount, currentDay,
 *   currentStop, currentLocation, trackingStatus, progressPercentage, lastUpdatedAt }
 * @param {object} raw
 * @returns {object|null}
 */
export function mapBackendTrip(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || `trip-${Math.random().toString(36).slice(2, 9)}`,
    travellerId: String(raw.travellerId || '').trim(),
    planId: raw.planId || '',
    guideId: raw.guideId ? String(raw.guideId).trim() : null,
    status: (raw.status || 'draft').toLowerCase(),
    totalAmount: typeof raw.totalAmount === 'number' ? raw.totalAmount : (Number(raw.totalAmount) || 0),
    currentDay: typeof raw.currentDay === 'number' ? raw.currentDay : (Number(raw.currentDay) || 1),
    currentStop: raw.currentStop || 'Not started',
    currentLocation: raw.currentLocation || '',
    trackingStatus: (raw.trackingStatus || 'not_started').toLowerCase(),
    progressPercentage: typeof raw.progressPercentage === 'number' ? raw.progressPercentage : (Number(raw.progressPercentage) || 0),
    lastUpdatedAt: raw.lastUpdatedAt || new Date().toISOString(),
    itinerary: raw.itinerary && typeof raw.itinerary === 'object' ? raw.itinerary : {},
  };
}


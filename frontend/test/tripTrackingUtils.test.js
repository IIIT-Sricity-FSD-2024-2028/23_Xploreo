import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareServerTimestamps,
  reconcileTripTracking,
  getTrackingStatusBadge,
  formatLastUpdatedTime,
} from '../src/utils/tripTrackingUtils.js';

describe('tripTrackingUtils unit tests', () => {
  describe('compareServerTimestamps', () => {
    it('accurately identifies newer timestamps', () => {
      const earlier = '2026-10-12T10:00:00.000Z';
      const later = '2026-10-12T10:05:00.000Z';

      assert.ok(compareServerTimestamps(later, earlier) > 0);
      assert.ok(compareServerTimestamps(earlier, later) < 0);
      assert.strictEqual(compareServerTimestamps(earlier, earlier), 0);
    });

    it('handles missing or invalid timestamps gracefully', () => {
      assert.strictEqual(compareServerTimestamps(null, null), 0);
      assert.strictEqual(compareServerTimestamps('invalid', 'also-invalid'), 0);
      assert.ok(compareServerTimestamps('2026-10-12T10:00:00Z', null) > 0);
      assert.ok(compareServerTimestamps(null, '2026-10-12T10:00:00Z') < 0);
    });
  });

  describe('reconcileTripTracking', () => {
    const baseTrip = {
      id: 'trip-1',
      status: 'started',
      trackingStatus: 'ongoing',
      progressPercentage: 50,
      currentStop: 'Stop 2',
      currentLocation: 'Jaipur',
      lastUpdatedAt: '2026-10-12T10:00:00.000Z',
    };

    it('accepts incoming update when server timestamp is strictly newer', () => {
      const incomingUpdate = {
        id: 'trip-1',
        status: 'started',
        trackingStatus: 'ongoing',
        progressPercentage: 65,
        currentStop: 'Stop 3',
        currentLocation: 'Amer',
        lastUpdatedAt: '2026-10-12T10:10:00.000Z', // 10 mins newer
      };

      const reconciled = reconcileTripTracking(baseTrip, incomingUpdate);
      assert.strictEqual(reconciled.progressPercentage, 65);
      assert.strictEqual(reconciled.currentStop, 'Stop 3');
      assert.strictEqual(reconciled.currentLocation, 'Amer');
      assert.strictEqual(reconciled.lastUpdatedAt, '2026-10-12T10:10:00.000Z');
    });

    it('discards stale incoming updates with an older server timestamp', () => {
      const staleIncoming = {
        id: 'trip-1',
        status: 'started',
        trackingStatus: 'ongoing',
        progressPercentage: 25, // Stale lower progress
        currentStop: 'Stop 1 (Stale)',
        currentLocation: 'Airport',
        lastUpdatedAt: '2026-10-12T09:45:00.000Z', // 15 mins older!
      };

      const reconciled = reconcileTripTracking(baseTrip, staleIncoming);
      // Must retain baseTrip state without regressing
      assert.strictEqual(reconciled.progressPercentage, 50);
      assert.strictEqual(reconciled.currentStop, 'Stop 2');
      assert.strictEqual(reconciled.currentLocation, 'Jaipur');
      assert.strictEqual(reconciled.lastUpdatedAt, '2026-10-12T10:00:00.000Z');
    });

    it('preserves higher progress percentage when timestamps are identical', () => {
      const duplicateOrDelayed = {
        id: 'trip-1',
        status: 'started',
        trackingStatus: 'ongoing',
        progressPercentage: 40, // regressed progress on duplicate timestamp
        currentStop: 'Stop 2',
        currentLocation: 'Jaipur',
        lastUpdatedAt: '2026-10-12T10:00:00.000Z', // same timestamp
      };

      const reconciled = reconcileTripTracking(baseTrip, duplicateOrDelayed);
      assert.strictEqual(reconciled.progressPercentage, 50);
    });
  });

  describe('getTrackingStatusBadge', () => {
    it('returns appropriate badge class and label for all backend statuses', () => {
      assert.strictEqual(getTrackingStatusBadge('ongoing').className, 'is-ongoing');
      assert.strictEqual(getTrackingStatusBadge('paused').className, 'is-paused');
      assert.strictEqual(getTrackingStatusBadge('completed').className, 'is-completed');
      assert.strictEqual(getTrackingStatusBadge('not_started').className, 'is-not-started');
      assert.strictEqual(getTrackingStatusBadge(null).className, 'is-not-started');
    });
  });

  describe('formatLastUpdatedTime', () => {
    it('returns formatted string for valid timestamps', () => {
      const formatted = formatLastUpdatedTime('2026-10-12T10:15:00.000Z');
      assert.ok(typeof formatted === 'string' && formatted.length > 0);
    });

    it('returns fallback for null or missing timestamps', () => {
      assert.strictEqual(formatLastUpdatedTime(null), 'Just now');
      assert.strictEqual(formatLastUpdatedTime(''), 'Just now');
    });
  });
});

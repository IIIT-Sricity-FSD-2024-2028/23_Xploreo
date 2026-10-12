import {
  getTrackingStatusBadge,
  formatLastUpdatedTime,
} from '../../utils/tripTrackingUtils.js';
import './travellerTrips.css';

/**
 * TripLiveTrackerWidget
 * Real-time progress bar, current location, current stop, and authoritative timestamp display.
 * Pure presentation component; receives reconciled server data via props.
 */
export default function TripLiveTrackerWidget({
  currentDay = 1,
  currentStop = 'Not started',
  currentLocation = 'Origin',
  trackingStatus = 'not_started',
  progressPercentage = 0,
  lastUpdatedAt = null,
  isLive = false,
}) {
  const badgeInfo = getTrackingStatusBadge(trackingStatus);
  const clampedProgress = Math.min(100, Math.max(0, Number(progressPercentage) || 0));

  return (
    <div
      className="trav-progress-widget"
      data-testid="trip-live-tracker-widget"
      role="region"
      aria-label="Trip Progress & Live Tracking"
    >
      <div className="trav-progress-label-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Day {currentDay} Progress</span>
          {isLive && trackingStatus === 'ongoing' && (
            <span className="trav-live-indicator" aria-label="Live Tracking Active">
              <span className="trav-live-pulse-dot" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <span
          className={`trav-tracking-badge ${badgeInfo.className}`}
          data-testid="tracking-status-badge"
        >
          {badgeInfo.label}
        </span>
      </div>

      {/* Accessible Progress Bar */}
      <div
        className="trav-progress-track"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Trip progress completion percentage"
      >
        <div
          className="trav-progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      <div className="trav-current-stop-row">
        <div>
          <span>Current Location: </span>
          <span className="trav-stop-pill" data-testid="trip-current-location">
            📍 {currentLocation}
          </span>
        </div>

        <div>
          <span>Current Stop: </span>
          <span className="trav-stop-pill" data-testid="trip-current-stop">
            🛑 {currentStop}
          </span>
        </div>

        <span className="trav-tracking-timestamp" data-testid="trip-last-updated">
          Server Updated: {formatLastUpdatedTime(lastUpdatedAt)}
        </span>
      </div>
    </div>
  );
}

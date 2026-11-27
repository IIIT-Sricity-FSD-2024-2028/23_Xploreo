import { useMemo, useState } from 'react';
import { getExperiencesByDestination } from '../../mocks/plans/experiences.fixture.js';
import { addDaysIso, isPlansMockMode } from '../../services/plans.api.js';
import './nta.css';

const dayOf = (value) => /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''))?.[1];
// "HH:MM" from an "HH:MM" value or an ISO date-time (saved packages store ISO).
const timeOf = (value, fallback) => {
  const s = String(value || '');
  return (/^(\d{2}:\d{2})/.exec(s) || /T(\d{2}:\d{2})/.exec(s))?.[1] || fallback;
};

/** Seats left in an experience's session on `date`, or null when it has no session that day. */
function sessionSeatsOn(experience, date) {
  if (!date) return null;
  const slots = Array.isArray(experience?.slots) ? experience.slots : [];
  if (slots.length === 0) return Number(experience?.capacity) > 0 ? Number(experience.capacity) : null;
  const slot = slots.find((s) => dayOf(s.date) === date);
  if (!slot || !slot.available) return null;
  return Math.max(0, Number(slot.capacity || 0) - Number(slot.booked || 0));
}

/**
 * Reusable Multi-Day Itinerary Builder for NTA Travel Packages.
 * Product requirements:
 * - One Partner Hotel stay selected for the package applies to Day 1.
 * - Days 2 onward: Curated local experiences chosen from the destination catalog.
 * - Multi-experience support per day with duplicate prevention within the same day.
 * - Dynamic days generated: Days 2 through durationNights + 1.
 * - Zero flights. Zero transport.
 * 
 * @param {Object} props
 * @param {Object} props.itinerary - { day1: { hotel }, days: [...] }
 * @param {Function} props.onChange - (updatedItinerary) => void
 * @param {number} props.durationNights - Package duration in nights
 * @param {string} props.destination - Destination city (e.g. Jaipur, Goa)
 * @param {Object} [props.selectedHotel] - The package's selected partner hotel record
 * @param {Array} [props.catalog] - The destination's available partner experiences (from Redux,
 *   with their sessions). Fixture experiences are used only in mock mode.
 * @param {boolean} [props.disabled] - Disabled state during submission
 */
export default function ItineraryBuilder({
  itinerary = {},
  onChange,
  durationNights = 3,
  destination = '',
  selectedHotel = null,
  catalog = [],
  disabled = false,
}) {
  const day1Hotel = itinerary?.day1?.hotel || {
    name: selectedHotel?.name || '',
    hotelId: selectedHotel?.hotelId || selectedHotel?.id || '',
    roomType: '',
    checkInDate: '',
    checkOutDate: '',
  };
  const checkIn = dayOf(day1Hotel.checkInDate);
  const dateOfDay = (dayNumber) => (checkIn ? addDaysIso(checkIn, dayNumber - 1) : null);

  const experienceDays = Array.isArray(itinerary?.days) ? itinerary.days : [];

  // The destination's experiences: live partner inventory, or the fixture catalog in mock mode.
  const availableCatalog = useMemo(() => {
    if (isPlansMockMode()) return getExperiencesByDestination(destination);
    return catalog.map((e) => ({
      id: e.id,
      experienceId: e.id,
      title: e.title || e.name,
      category: e.category || 'Experience',
      pricePerPerson: Number(e.pricePerPerson ?? e.price) || 0,
      defaultStartTime: timeOf(e.slots?.[0]?.time, '10:00'),
      defaultEndTime: '13:00',
      raw: e,
    }));
  }, [destination, catalog]);

  // Seats left on a day for a catalog experience (null = no session that day). Mock entries
  // carry no sessions and are always offered.
  const seatsFor = (catExp, date) => (catExp.raw ? sessionSeatsOn(catExp.raw, date) : Infinity);

  // Per-day selected experience picker state
  const [activeExpSelectors, setActiveExpSelectors] = useState({});

  // Update Day 1 Hotel check-in/out dates. Choosing a check-in sets check-out to the package's
  // number of nights later (it can still be edited; PlanForm validates that they agree).
  const handleHotelFieldChange = (field, value) => {
    if (!onChange) return;
    const updatedHotel = {
      ...day1Hotel,
      [field]: value,
    };
    if (field === 'checkInDate' && value) {
      updatedHotel.checkOutDate = addDaysIso(value, Math.max(1, Number(durationNights) || 1));
    }
    onChange({
      ...itinerary,
      day1: {
        ...itinerary?.day1,
        hotel: updatedHotel,
      },
    });
  };

  // Add an experience from catalog to a specific day
  const handleSelectExperience = (dayNumber, expId) => {
    if (!onChange || !expId) return;
    const catalogItem = availableCatalog.find((e) => e.id === expId || e.experienceId === expId);
    if (!catalogItem) return;

    const existingDayIndex = experienceDays.findIndex((d) => d.dayNumber === dayNumber);
    const currentDayExperiences = existingDayIndex >= 0 ? experienceDays[existingDayIndex].experiences || [] : [];

    // Duplicate prevention within the same day
    if (currentDayExperiences.some((e) => e.experienceId === catalogItem.experienceId || e.id === catalogItem.id)) {
      alert(`"${catalogItem.title}" is already scheduled for Day ${dayNumber}.`);
      return;
    }

    const newExp = {
      id: catalogItem.id,
      experienceId: catalogItem.experienceId,
      title: catalogItem.title,
      location: `${catalogItem.title}, ${destination}`,
      category: catalogItem.category,
      pricePerPerson: catalogItem.pricePerPerson,
      startsAt: catalogItem.defaultStartTime || '10:00',
      endsAt: catalogItem.defaultEndTime || '13:00',
      status: 'planned',
    };

    let updatedDays = [...experienceDays];
    if (existingDayIndex >= 0) {
      updatedDays[existingDayIndex] = {
        ...updatedDays[existingDayIndex],
        experiences: [...currentDayExperiences, newExp],
      };
    } else {
      updatedDays.push({
        dayNumber,
        experiences: [newExp],
      });
      updatedDays.sort((a, b) => a.dayNumber - b.dayNumber);
    }

    onChange({
      ...itinerary,
      days: updatedDays,
    });

    // Reset selector for this day
    setActiveExpSelectors((prev) => ({ ...prev, [dayNumber]: '' }));
  };

  // Edit time or status for a scheduled experience
  const handleExperienceChange = (dayNumber, expIndex, field, value) => {
    if (!onChange) return;
    const updatedDays = experienceDays.map((dayGroup) => {
      if (dayGroup.dayNumber !== dayNumber) return dayGroup;
      const updatedExps = [...(dayGroup.experiences || [])];
      updatedExps[expIndex] = {
        ...updatedExps[expIndex],
        [field]: value,
      };
      return {
        ...dayGroup,
        experiences: updatedExps,
      };
    });

    onChange({
      ...itinerary,
      days: updatedDays,
    });
  };

  // Remove an experience
  const handleRemoveExperience = (dayNumber, expIndex) => {
    if (!onChange) return;
    const updatedDays = experienceDays.map((dayGroup) => {
      if (dayGroup.dayNumber !== dayNumber) return dayGroup;
      const updatedExps = [...(dayGroup.experiences || [])];
      updatedExps.splice(expIndex, 1);
      return {
        ...dayGroup,
        experiences: updatedExps,
      };
    });

    onChange({
      ...itinerary,
      days: updatedDays,
    });
  };

  // Build day numbers array based on durationNights (Days 2 to durationNights + 1)
  const totalDays = Math.max(2, (Number(durationNights) || 1) + 1);
  const subsequentDayNumbers = Array.from({ length: totalDays - 1 }, (_, i) => i + 2);

  return (
    <div className="nta-itinerary-builder">
      <div className="nta-itinerary-header">
        <div>
          <h3 className="nta-form-section-title">
            🗓️ Multi-Day Itinerary Schedule ({totalDays} Days / {durationNights} Nights)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Day 1 hosts your selected partner hotel stay. Days 2–{totalDays} feature curated experiences chosen from the destination catalog.
          </p>
        </div>
      </div>

      {/* DAY 1: SELECTED PARTNER HOTEL ACCOMMODATION */}
      <div className="nta-itinerary-day-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="nta-itinerary-day-badge">
            Day 1: Arrival & Partner Hotel Check-In
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Single Partner Hotel for Package</span>
        </div>

        {day1Hotel.name ? (
          <div style={{ background: '#f8fafc', border: '1.5px solid #dbeafe', borderRadius: '10px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>{day1Hotel.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                  {day1Hotel.stars || 4}★ Partner Stay
                </span>
                {day1Hotel.pricePerNight ? (
                  <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                    ₹{Number(day1Hotel.pricePerNight).toLocaleString('en-IN')}/night
                  </span>
                ) : null}
              </div>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
              Room Category: <strong>{day1Hotel.roomType || 'not selected'}</strong> • Hotel ID: {day1Hotel.hotelId} • Location: {destination}
            </p>

            <div className="nta-form-grid-2col">
              <div className="nta-form-group">
                <label className="nta-form-label" htmlFor="plan-checkin">
                  <span>Check-in Date <span style={{ color: '#ef4444' }}>*</span></span>
                </label>
                <input
                  id="plan-checkin"
                  type="date"
                  className="nta-form-input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={dayOf(day1Hotel.checkInDate) || ''}
                  onChange={(e) => handleHotelFieldChange('checkInDate', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>

              <div className="nta-form-group">
                <label className="nta-form-label" htmlFor="plan-checkout">
                  <span>Check-out Date <span style={{ color: '#ef4444' }}>*</span></span>
                </label>
                <input
                  id="plan-checkout"
                  type="date"
                  className="nta-form-input"
                  min={checkIn || new Date().toISOString().slice(0, 10)}
                  value={dayOf(day1Hotel.checkOutDate) || ''}
                  onChange={(e) => handleHotelFieldChange('checkOutDate', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
            ⚠️ Please select a Partner Hotel above to assign accommodation to this package.
          </div>
        )}
      </div>

      {/* DAYS 2+: DAILY CURATED EXPERIENCES */}
      {subsequentDayNumbers.map((dayNum) => {
        const dayGroup = experienceDays.find((d) => d.dayNumber === dayNum) || { experiences: [] };
        const experiences = dayGroup.experiences || [];
        const dayDate = dateOfDay(dayNum);

        // Offer only experiences with an open session (and seats) on this day's date, and not
        // already scheduled for the day.
        const availableToAdd = availableCatalog.filter((catExp) => {
          if (experiences.some((e) => e.experienceId === catExp.experienceId)) return false;
          const seats = seatsFor(catExp, dayDate);
          return seats !== null && seats > 0;
        });

        return (
          <div key={`day-${dayNum}`} className="nta-itinerary-day-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="nta-itinerary-day-badge">
                Day {dayNum}{dayDate ? ` (${dayDate})` : ''}: Curated Activities & Experiences
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {experiences.length} {experiences.length === 1 ? 'activity' : 'activities'} scheduled
              </span>
            </div>

            {experiences.length === 0 ? (
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                No experiences added for Day {dayNum} yet. Select an activity from the {destination} catalog below.
              </div>
            ) : (
              experiences.map((exp, expIdx) => (
                <div key={exp.id || `exp-${expIdx}`} className="nta-itinerary-exp-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{exp.title}</strong>
                        {exp.category && (
                          <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 7px', borderRadius: '4px', fontWeight: '600' }}>
                            {exp.category}
                          </span>
                        )}
                        {exp.pricePerPerson !== undefined && (
                          <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#065f46', padding: '2px 7px', borderRadius: '4px', fontWeight: '700' }}>
                            ₹{Number(exp.pricePerPerson).toLocaleString('en-IN')}/person
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        📍 {exp.location || destination}
                      </span>
                      {(() => {
                        // A scheduled experience must still have a session on this day's date.
                        const catExp = availableCatalog.find((c) => c.experienceId === exp.experienceId);
                        if (!catExp) {
                          return (
                            <span style={{ fontSize: '12px', color: '#b91c1c', display: 'block', marginTop: '2px' }}>
                              Not available in the {destination} catalog — remove it.
                            </span>
                          );
                        }
                        const seats = dayDate ? seatsFor(catExp, dayDate) : Infinity;
                        if (seats === null || seats === 0) {
                          return (
                            <span style={{ fontSize: '12px', color: '#b91c1c', display: 'block', marginTop: '2px' }}>
                              {seats === 0 ? `Session on ${dayDate} is full` : `No session on ${dayDate}`} — remove it or change the dates.
                            </span>
                          );
                        }
                        return Number.isFinite(seats) ? (
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                            {seats} seat(s) left on {dayDate}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <button
                      type="button"
                      className="nta-itinerary-remove-btn"
                      onClick={() => handleRemoveExperience(dayNum, expIdx)}
                      disabled={disabled}
                      title="Remove experience"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="nta-form-grid-2col" style={{ marginTop: '8px' }}>
                    <div className="nta-form-group">
                      <label className="nta-form-label" style={{ fontSize: '12px' }}>Start Time</label>
                      <input
                        type="time"
                        className="nta-form-input"
                        value={timeOf(exp.startsAt, '10:00')}
                        onChange={(e) => handleExperienceChange(dayNum, expIdx, 'startsAt', e.target.value)}
                        disabled={disabled}
                      />
                    </div>

                    <div className="nta-form-group">
                      <label className="nta-form-label" style={{ fontSize: '12px' }}>End Time</label>
                      <input
                        type="time"
                        className="nta-form-input"
                        value={timeOf(exp.endsAt, '13:00')}
                        onChange={(e) => handleExperienceChange(dayNum, expIdx, 'endsAt', e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Catalog Selector Dropdown for this Day */}
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!dayDate ? (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Set the hotel check-in date to see the experiences scheduled on this day.
                </div>
              ) : availableCatalog.length > 0 ? (
                <>
                  <select
                    className="nta-form-select"
                    style={{ flex: 1, minWidth: '240px', fontSize: '13px' }}
                    value={activeExpSelectors[dayNum] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleSelectExperience(dayNum, val);
                      }
                    }}
                    disabled={disabled}
                  >
                    <option value="">+ Add Experience from {destination} Catalog...</option>
                    {availableToAdd.map((catExp) => (
                      <option key={catExp.id} value={catExp.id}>
                        {catExp.title} ({catExp.category}) — ₹{Number(catExp.pricePerPerson).toLocaleString('en-IN')}/person
                      </option>
                    ))}
                  </select>
                  {availableToAdd.length === 0 && (
                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                      No other {destination} experience has an open session on {dayDate}.
                    </span>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  No partner experiences are available for {destination || 'this destination'}.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

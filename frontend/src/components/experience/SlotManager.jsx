import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeExperienceSlots, selectExperienceWriting } from '@/store/experience/experiencesSlice.js';
import { compareSlots, formatDate, slotState } from '@/lib/datetime.js';
import ModalFrame, { CloseButton } from './ModalFrame.jsx';
import { EmptyState, ErrorNotice } from './Feedback.jsx';
import SlotModal from './SlotModal.jsx';

const dayLabel = (date) => formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const FILL = { red: 'red', warning: 'warning', green: 'green' };

function pillFor(slot) {
  const state = slotState(slot);
  if (state.key === 'full') return { label: 'Full', className: 'full', fill: FILL.red, percent: state.percent };
  if (state.key === 'closed') return { label: 'Closed', className: '', fill: FILL.green, percent: state.percent };
  if (state.key === 'nearly-full') return { label: 'Nearly Full', className: 'nearly-full', fill: FILL.warning, percent: state.percent };
  return { label: 'Available', className: 'available', fill: FILL.green, percent: state.percent };
}

// The old "Manage Slots" view (#slotsManagerView). Every change is saved through the server, and the
// server's answer (booked counts, availability) replaces what is on screen.
export default function SlotManager({ experience }) {
  const dispatch = useDispatch();
  const busy = useSelector((state) => selectExperienceWriting(state, experience.id));
  const [dateFilter, setDateFilter] = useState('all');
  const [modal, setModal] = useState(null); // { mode: 'add' } | { mode: 'edit', slotId }
  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const editing = experience.slots.find((slot) => slot.id === modal?.slotId);
  const removing = experience.slots.find((slot) => slot.id === removingId);

  const slots = useMemo(() => [...experience.slots].sort(compareSlots), [experience.slots]);
  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))], [slots]);
  const activeFilter = dates.includes(dateFilter) ? dateFilter : 'all';
  const grouped = useMemo(() => {
    const byDate = new Map();
    slots
      .filter((s) => activeFilter === 'all' || s.date === activeFilter)
      .forEach((s) => {
        if (!byDate.has(s.date)) byDate.set(s.date, []);
        byDate.get(s.date).push(s);
      });
    return [...byDate.entries()];
  }, [slots, activeFilter]);

  const persist = (change) => dispatch(changeExperienceSlots(experience.id, change));

  async function inline(change) {
    setActionError(null);
    try {
      await persist(change);
    } catch (err) {
      setActionError(err);
    }
  }

  const change = (slotId, values) => inline({ operation: 'update', slotId, values });

  async function submitSlot(values) {
    if (modal.mode === 'edit') {
      await persist({ operation: 'update', slotId: modal.slotId, values });
    } else {
      await persist({ operation: 'create', values });
      setDateFilter(values.date);
    }
    setModal(null);
  }

  function confirmRemove() {
    setRemovingId(null);
    inline({ operation: 'delete', slotId: removingId });
  }

  return (
    <>
      <section className="slots-manager-view" id="slotsManagerView" aria-busy={busy}>
        <section className="page-header experience-toolbar slots-manager-header">
          <div>
            <p className="experience-eyebrow">Slot Operations</p>
            <h1 id="slotsManagerTitle">{experience.title}</h1>
            <p id="slotsManagerSubtitle">Manage time slots and availability</p>
          </div>

          <div className="slots-manager-toolbar">
            <button className="primary-btn" id="openAddSlotBtn" type="button" disabled={busy} onClick={() => setModal({ mode: 'add' })}>
              + Add Slot
            </button>
            <label className="experience-select-shell" htmlFor="slotsDateFilter">
              <span>Date</span>
              <select id="slotsDateFilter" value={activeFilter} onChange={(event) => setDateFilter(event.target.value)}>
                <option value="all">All Dates</option>
                {dates.map((date) => (
                  <option key={date} value={date}>{dayLabel(date)}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <ErrorNotice error={actionError} />

        <section id="slotsScheduleList" className="slots-schedule-list">
          {grouped.length ? (
            grouped.map(([date, daySlots]) => (
              <section key={date} className="slots-day-group">
                <h2 className="slots-day-heading">{dayLabel(date)}</h2>
                <div className="slots-card-grid">
                  {daySlots.map((slot) => {
                    const pill = pillFor(slot);
                    const minCapacity = Math.max(1, slot.booked);
                    const full = pill.className === 'full';
                    return (
                      <article key={slot.id} className="slot-card" data-slot-id={slot.id}>
                        <div className="slot-card-top">
                          <h3>{slot.time}</h3>
                          <span className={`status-pill ${pill.className}`.trim()}>{pill.label}</span>
                        </div>
                        <div className="slot-duration-row">
                          <span>Duration</span>
                          <strong>{experience.durationHours} hours</strong>
                        </div>
                        <div className="slot-bookings-row">
                          <span>Seats booked</span>
                          <strong>{slot.booked} / {slot.capacity}</strong>
                        </div>
                        <div className="progress-bar slot-progress">
                          <div className={`progress-fill ${pill.fill}`} style={{ width: `${pill.percent}%` }} />
                        </div>
                        <div className="slot-card-actions">
                          <button type="button" disabled={busy} onClick={() => setModal({ mode: 'edit', slotId: slot.id })}>Edit Slot</button>
                          <button
                            type="button"
                            className="danger-ghost-btn"
                            disabled={busy || slot.booked > 0}
                            title={slot.booked > 0 ? 'Sessions with bookings cannot be removed' : undefined}
                            onClick={() => setRemovingId(slot.id)}
                          >
                            Delete
                          </button>
                        </div>
                        <div className="slot-card-divider" />
                        <div className="slot-control-row">
                          <span>Capacity</span>
                          <div className="capacity-stepper" role="group" aria-label={`Capacity for ${slot.time}`}>
                            <button type="button" aria-label="Decrease capacity" disabled={busy || slot.capacity <= minCapacity} onClick={() => change(slot.id, { capacity: slot.capacity - 1 })}>-</button>
                            <strong>{slot.capacity}</strong>
                            <button type="button" aria-label="Increase capacity" disabled={busy} onClick={() => change(slot.id, { capacity: slot.capacity + 1 })}>+</button>
                          </div>
                        </div>
                        <div className="slot-control-row">
                          <span>Availability</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={slot.available}
                            aria-label={`Open for booking, ${slot.time}`}
                            className={`availability-toggle${slot.available ? ' is-on' : ''}`}
                            disabled={busy || full}
                            title={full ? 'Full sessions cannot be reopened' : undefined}
                            onClick={() => change(slot.id, { available: !slot.available })}
                          >
                            <span />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          ) : slots.length === 0 ? (
            <EmptyState title="No slots created yet">Travellers can only book this experience once it has at least one open session.</EmptyState>
          ) : (
            <EmptyState title="No slots for this date">Try another date or add a new slot.</EmptyState>
          )}
        </section>
      </section>

      {modal && (modal.mode === 'add' || editing) ? (
        <SlotModal mode={modal.mode} slot={editing} defaultCapacity={experience.capacity} onClose={() => setModal(null)} onSubmit={submitSlot} />
      ) : null}

      {removing ? (
        <ModalFrame id="removeSlotModal" labelledBy="removeSlotTitle" onClose={() => setRemovingId(null)}>
          <div className="modal-header">
            <h2 id="removeSlotTitle">Delete this slot?</h2>
            <CloseButton label="Close" onClick={() => setRemovingId(null)} />
          </div>
          <p>
            {dayLabel(removing.date)} at {removing.time} will be removed from <strong>{experience.title}</strong>.
          </p>
          <div className="experience-form">
            <div className="modal-actions">
              <button type="button" onClick={() => setRemovingId(null)}>Keep it</button>
              <button type="button" className="primary-btn" onClick={confirmRemove}>Delete Slot</button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </>
  );
}

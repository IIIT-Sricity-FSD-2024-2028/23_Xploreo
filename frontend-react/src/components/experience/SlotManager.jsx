import { useMemo, useState } from 'react';
import { Modal, StatusBadge } from '@/foundation';
import { saveExperienceSlots } from '@/services/schedule.api.js';
import { compareSlots, formatDate, slotState } from '@/lib/datetime.js';
import { EmptyState, ErrorNotice } from './Feedback.jsx';
import SlotModal from './SlotModal.jsx';

const newSlotId = (experienceId) => `${experienceId}-s-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// Manages the sessions (slots) of one experience. Every change is saved through the server,
// and the server's answer (booked counts, availability) replaces what is on screen.
export default function SlotManager({ experience, onUpdated, onBack }) {
  const [dateFilter, setDateFilter] = useState('all');
  const [modal, setModal] = useState(null); // { mode: 'add' } | { mode: 'edit', slot }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  async function persist(next) {
    const updated = await saveExperienceSlots(experience.id, next);
    onUpdated(updated);
  }

  async function inline(next) {
    setBusy(true);
    setActionError(null);
    try {
      await persist(next);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  const change = (slotId, patch) => inline(experience.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)));

  async function submitSlot(values) {
    if (modal.mode === 'edit') {
      await persist(experience.slots.map((s) => (s.id === modal.slot.id ? { ...s, ...values } : s)));
    } else {
      await persist([...experience.slots, { id: newSlotId(experience.id), ...values, booked: 0, available: true }]);
    }
    setModal(null);
  }

  async function confirmRemove() {
    const target = removing;
    setRemoving(null);
    await inline(experience.slots.filter((s) => s.id !== target.id));
  }

  return (
    <div className="exp-page">
      <header className="exp-page-header">
        <div>
          <button type="button" className="exp-link" onClick={onBack}>
            ← Back to catalog
          </button>
          <p className="exp-eyebrow">Slot operations</p>
          <h1>{experience.title}</h1>
          <p className="exp-muted">Manage sessions, capacity and availability.</p>
        </div>
        <div className="exp-toolbar">
          <label className="exp-inline-select">
            <span>Date</span>
            <select value={activeFilter} onChange={(e) => setDateFilter(e.target.value)} disabled={!dates.length}>
              <option value="all">All dates</option>
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
          </label>
          <button type="button" className="exp-btn exp-btn-primary" onClick={() => setModal({ mode: 'add' })}>
            + Add slot
          </button>
        </div>
      </header>

      <ErrorNotice error={actionError} />

      {slots.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          action={<button type="button" className="exp-btn exp-btn-primary" onClick={() => setModal({ mode: 'add' })}>Add your first slot</button>}
        >
          Travellers can only book this experience once it has at least one open session.
        </EmptyState>
      ) : (
        <div className="exp-stack" aria-busy={busy}>
          {grouped.map(([date, daySlots]) => (
            <section key={date} className="exp-card" aria-label={formatDate(date)}>
              <h2>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
              <ul className="exp-list">
                {daySlots.map((slot) => {
                  const state = slotState(slot);
                  const full = state.key === 'full';
                  const minCap = Math.max(1, slot.booked);
                  return (
                    <li key={slot.id} className="exp-slot">
                      <div className="exp-slot-time">{slot.time}</div>
                      <div className="exp-slot-fill">
                        <strong>{slot.booked} / {slot.capacity}</strong> guests
                        <div className="exp-bar" aria-hidden="true">
                          <span className={`exp-bar-fill exp-bar-${state.tone}`} style={{ width: `${state.percent}%` }} />
                        </div>
                      </div>
                      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      <div className="exp-slot-controls">
                        <div className="exp-stepper" role="group" aria-label={`Capacity for ${slot.time}`}>
                          <button type="button" aria-label="Decrease capacity" disabled={busy || slot.capacity <= minCap} onClick={() => change(slot.id, { capacity: slot.capacity - 1 })}>−</button>
                          <span>{slot.capacity}</span>
                          <button type="button" aria-label="Increase capacity" disabled={busy} onClick={() => change(slot.id, { capacity: slot.capacity + 1 })}>+</button>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={slot.available}
                          aria-label={`Open for booking, ${slot.time}`}
                          className={`exp-switch ${slot.available ? 'is-on' : ''}`}
                          disabled={busy || full}
                          title={full ? 'Full sessions cannot be reopened' : undefined}
                          onClick={() => change(slot.id, { available: !slot.available })}
                        />
                        <button type="button" className="exp-btn exp-btn-ghost" disabled={busy} onClick={() => setModal({ mode: 'edit', slot })}>Edit</button>
                        <button
                          type="button"
                          className="exp-btn exp-btn-danger-ghost"
                          disabled={busy || slot.booked > 0}
                          title={slot.booked > 0 ? 'Sessions with bookings cannot be removed' : undefined}
                          onClick={() => setRemoving(slot)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modal ? (
        <SlotModal
          mode={modal.mode}
          slot={modal.slot}
          defaultCapacity={experience.capacity}
          onClose={() => setModal(null)}
          onSubmit={submitSlot}
        />
      ) : null}

      <Modal
        open={Boolean(removing)}
        title="Remove this session?"
        onClose={() => setRemoving(null)}
        footer={
          <>
            <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setRemoving(null)}>Keep it</button>
            <button type="button" className="exp-btn exp-btn-danger" onClick={confirmRemove}>Remove session</button>
          </>
        }
      >
        {removing ? <p>{formatDate(removing.date)} at {removing.time} will be removed from <strong>{experience.title}</strong>.</p> : null}
      </Modal>
    </div>
  );
}

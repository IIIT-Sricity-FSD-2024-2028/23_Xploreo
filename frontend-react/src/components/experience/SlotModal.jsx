import { useState } from 'react';
import { Modal } from '@/foundation';
import { to12Hour, to24Hour, tomorrowIso } from '@/lib/datetime.js';
import { Field, FormMessage } from './Feedback.jsx';

// Add or edit one session. onSubmit({ date, time, capacity }) must throw an ApiError on failure.
export default function SlotModal({ mode, slot, defaultCapacity, onClose, onSubmit }) {
  const editing = mode === 'edit';
  const minCapacity = Math.max(1, slot?.booked ?? 0);
  const [values, setValues] = useState({
    date: slot?.date ?? '',
    time: slot ? to24Hour(slot.time) : '',
    capacity: String(slot?.capacity ?? (defaultCapacity || 10)),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  function validate() {
    const found = {};
    if (!values.date) found.date = 'A slot date is required.';
    else if ((!editing || values.date !== slot.date) && values.date < tomorrowIso()) {
      found.date = 'Slots can only be created for tomorrow or later.';
    }
    if (!values.time) found.time = 'Session time is required.';
    const capacity = Number(values.capacity);
    if (!Number.isInteger(capacity) || capacity < minCapacity) {
      found.capacity = editing && minCapacity > 1
        ? `Capacity cannot be lower than the ${minCapacity} guests already booked.`
        : 'Capacity must be a positive whole number.';
    }
    return found;
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ date: values.date, time: to12Hour(values.time), capacity: Number(values.capacity) });
    } catch (err) {
      if (err.status === 400 && err.fieldErrors?.slots) {
        // e.g. "A session already exists on 2026-10-14 at 09:00 AM."
        setErrors({ time: err.fieldErrors.slots });
        setFormError('Please fix the highlighted fields before saving.');
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? 'Edit session' : 'Add a slot'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="exp-btn exp-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="exp-slot-form" className="exp-btn exp-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save session' : 'Add slot'}
          </button>
        </>
      }
    >
      <form id="exp-slot-form" className="exp-form" onSubmit={submit} noValidate>
        <Field id="slot-date" label="Date" error={errors.date}>
          <input id="slot-date" type="date" min={editing ? undefined : tomorrowIso()} value={values.date} onChange={set('date')} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'slot-date-error' : undefined} />
        </Field>
        <Field id="slot-time" label="Start time" error={errors.time}>
          <input id="slot-time" type="time" value={values.time} onChange={set('time')} aria-invalid={Boolean(errors.time)} aria-describedby={errors.time ? 'slot-time-error' : undefined} />
        </Field>
        <Field id="slot-capacity" label="Capacity (guests)" error={errors.capacity} hint={editing && slot.booked ? `${slot.booked} guests already booked` : undefined} className="exp-span-2">
          <input id="slot-capacity" type="number" min={minCapacity} step="1" value={values.capacity} onChange={set('capacity')} aria-invalid={Boolean(errors.capacity)} aria-describedby={errors.capacity ? 'slot-capacity-error' : undefined} />
        </Field>
        <div className="exp-span-2">
          <FormMessage>{formError}</FormMessage>
        </div>
      </form>
    </Modal>
  );
}

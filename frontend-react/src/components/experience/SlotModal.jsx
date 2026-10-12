import { useState } from 'react';
import { to12Hour, to24Hour, tomorrowIso } from '@/lib/datetime.js';
import ModalFrame, { CloseButton } from './ModalFrame.jsx';
import { FieldError, FormMessage } from './Feedback.jsx';

// Add or edit one session. onSubmit({ date, time, capacity }) must throw an ApiError on failure.
// Built from the old stylesheet's own slot-modal classes (.slots-modal-box ...).
export default function SlotModal({ mode, slot, defaultCapacity, onClose, onSubmit }) {
  const editing = mode === 'edit';
  const minCapacity = Math.max(1, slot?.booked ?? 0);
  const [values, setValues] = useState({
    date: slot?.date ?? '',
    time: slot ? to24Hour(slot.time) : '10:00',
    capacity: String(slot?.capacity ?? (defaultCapacity || 10)),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  const close = saving ? undefined : onClose;

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
        : 'Capacity must be a positive integer.';
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
    <ModalFrame id="slotsModal" boxClass="slots-modal-box" labelledBy="slotsModalTitle" onClose={close}>
      <div className="modal-header">
        <h2 id="slotsModalTitle">{editing ? 'Edit Slot' : 'Add New Slot'}</h2>
        <CloseButton label="Close slot form" onClick={close} />
      </div>

      <form id="slotsForm" className="experience-form" noValidate onSubmit={submit}>
        <div className="section form-grid">
          <label className="field-group" htmlFor="slotDate">
            <span>Session Date</span>
            <input id="slotDate" type="date" min={editing ? undefined : tomorrowIso()} value={values.date} onChange={set('date')} />
            <FieldError>{errors.date}</FieldError>
          </label>

          <label className="field-group" htmlFor="slotTime">
            <span>Session Time</span>
            <input id="slotTime" type="time" value={values.time} onChange={set('time')} />
            <FieldError>{errors.time}</FieldError>
          </label>

          <label className="field-group" htmlFor="slotCapacity">
            <span>Capacity</span>
            <input id="slotCapacity" type="number" min={minCapacity} step="1" value={values.capacity} onChange={set('capacity')} />
            <FieldError>{errors.capacity}</FieldError>
          </label>
        </div>

        <FormMessage>{formError}</FormMessage>

        <div className="modal-actions">
          <button type="button" onClick={close} disabled={saving}>Cancel</button>
          <button type="submit" className="primary-btn" id="slotsSubmitBtn" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Slot'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

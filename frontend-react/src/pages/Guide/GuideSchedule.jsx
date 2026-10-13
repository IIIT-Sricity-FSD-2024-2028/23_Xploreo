import { useCallback, useState } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { createScheduleItem, deleteScheduleItem, listMySchedule, updateScheduleItem } from '@/services/guide.api.js';
import { GUIDE_SCHEDULE_CSS } from '@/legacy/styles.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import { FieldError, LoadingState } from '@/components/guide/Feedback.jsx';
import { ConfirmDialog } from '@/components/guide/Dialog.jsx';

const emptyForm = { title: '', date: '', startTime: '', endTime: '', status: 'available', location: '', capacity: '1', notes: '' };
const byWhen = (a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);

export default function GuideSchedule() {
  const { user } = useAuth();
  const loader = useCallback(() => listMySchedule(user.id), [user.id]);
  const { data, error, loading, reload } = useAsyncData(loader);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null); // { text, ok }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const items = [...(data ?? [])].sort(byWhen);
  const set = (name) => (event) => setForm((f) => ({ ...f, [name]: event.target.value }));

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setMessage(null);
  }

  function edit(item) {
    setEditingId(item.id);
    setFieldErrors({});
    setMessage(null);
    setForm({
      title: item.title || '',
      date: item.date || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      status: item.status || 'available',
      location: item.location || '',
      capacity: String(item.capacity || 1),
      notes: item.notes || '',
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    const values = {
      guideId: user.id,
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
      location: form.location.trim(),
      capacity: Number(form.capacity || 1),
      notes: form.notes.trim(),
    };
    try {
      if (editingId != null) await updateScheduleItem(editingId, values);
      else await createScheduleItem(values);
      reset();
      setMessage({ text: 'Schedule saved successfully.', ok: true });
      reload();
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      setMessage({ text: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = deleting;
    try {
      await deleteScheduleItem(id);
      if (editingId === id) reset();
      setMessage({ text: 'Schedule deleted successfully.', ok: true });
      reload();
    } catch (err) {
      setMessage({ text: err.message, ok: false });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <GuidePage css={GUIDE_SCHEDULE_CSS} title="Schedule Management - Xploreo">
      <div className="crud-page">
        <header className="crud-page-header">
          <div>
            <h1>Schedule</h1>
            <p>Manage guide availability, booked slots, and blocked dates.</p>
          </div>
        </header>

        <section className="crud-panel">
          <h2 id="formTitle">{editingId != null ? `Edit Schedule ${editingId}` : 'Add Schedule Item'}</h2>
          <div id="crudMessage" className={`crud-message${message?.ok ? ' success' : ''}`} hidden={!message} role={message && !message.ok ? 'alert' : 'status'}>
            {message?.text}
          </div>
          <form id="scheduleForm" className="crud-form" onSubmit={submit} noValidate>
            <label>Guide ID<input id="guideId" value={user.id} readOnly /></label>
            <label>Title<input id="title" required value={form.title} onChange={set('title')} /><FieldError>{fieldErrors.title}</FieldError></label>
            <label>Date<input id="date" type="date" required value={form.date} onChange={set('date')} /><FieldError>{fieldErrors.date}</FieldError></label>
            <label>Start time<input id="startTime" type="time" required value={form.startTime} onChange={set('startTime')} /><FieldError>{fieldErrors.startTime}</FieldError></label>
            <label>End time<input id="endTime" type="time" required value={form.endTime} onChange={set('endTime')} /><FieldError>{fieldErrors.endTime}</FieldError></label>
            <label>
              Status
              <select id="status" value={form.status} onChange={set('status')}>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
              </select>
              <FieldError>{fieldErrors.status}</FieldError>
            </label>
            <label>Location<input id="location" required value={form.location} onChange={set('location')} /><FieldError>{fieldErrors.location}</FieldError></label>
            <label>Capacity<input id="capacity" type="number" min="1" value={form.capacity} onChange={set('capacity')} /><FieldError>{fieldErrors.capacity}</FieldError></label>
            <label className="crud-full">Notes<textarea id="notes" value={form.notes} onChange={set('notes')} /></label>
            <div className="crud-actions crud-full">
              <button type="submit" className="crud-btn crud-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Schedule'}</button>
              <button type="button" id="resetBtn" className="crud-btn" onClick={reset}>Clear</button>
            </div>
          </form>
        </section>

        <section className="crud-panel">
          <div className="crud-toolbar"><h2>My Schedule Items</h2></div>
          <div id="scheduleList" className="crud-grid">
            {!data && loading ? <LoadingState label="Loading your schedule…" /> : null}
            {error ? (
              <p className="crud-meta" role="alert">
                Unable to load schedule. {error.message} {error.status !== 403 ? <button type="button" className="crud-btn" onClick={reload}>Try again</button> : null}
              </p>
            ) : null}
            {data && items.length === 0 ? <p className="crud-meta">No schedule items found.</p> : null}
            {items.map((item) => (
              <article className="crud-card" key={item.id}>
                <h3>{item.title || '-'}</h3>
                <div className="crud-meta">
                  <strong>ID:</strong> {item.id}<br />
                  <strong>Date:</strong> {item.date || '-'}<br />
                  <strong>Time:</strong> {item.startTime || '-'} to {item.endTime || '-'}<br />
                  <strong>Status:</strong> {item.status || '-'}<br />
                  <strong>Location:</strong> {item.location || '-'}<br />
                  <strong>Capacity:</strong> {item.capacity ?? '-'}
                </div>
                <p className="crud-meta">{item.notes || ''}</p>
                <div className="crud-card-actions">
                  <button type="button" className="crud-btn" onClick={() => edit(item)}>Edit</button>
                  <button type="button" className="crud-btn crud-danger" onClick={() => setDeleting(item.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      {deleting != null ? (
        <ConfirmDialog title="Delete schedule item" text="This removes the item from your schedule." confirmLabel="Delete" onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      ) : null}
    </GuidePage>
  );
}

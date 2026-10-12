import { useState } from 'react';
import { useAuth } from '@/foundation';
import { createExperience, updateExperience } from '@/services/partners.api.js';
import ModalFrame, { CloseButton } from './ModalFrame.jsx';
import ImageDropzone from './ImageDropzone.jsx';
import { FieldError, FormMessage } from './Feedback.jsx';

// Values of the backend ExperienceCategory enum (value, label); the order follows the old form.
const CATEGORIES = [
  ['adventure', 'Adventure'], ['culture', 'Culture'], ['tours', 'Tours'], ['attraction tickets', 'Attraction Tickets'],
  ['water sports', 'Water Sports'], ['cruises', 'Cruises'], ['family', 'Family'], ['luxury', 'Luxury'],
  ['weekend getaway', 'Weekend Getaway'], ['honeymoon', 'Honeymoon'], ['pilgrimage', 'Pilgrimage'],
  ['culinary', 'Culinary'], ['wellness', 'Wellness'], ['wildlife', 'Wildlife'], ['photography', 'Photography'],
];
const FORM_FIELDS = ['title', 'description', 'category', 'price', 'durationHours', 'capacity', 'status', 'image'];
const LOCKED_LOCATION_STYLE = { backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: '#1e293b' };

function toForm(exp) {
  return {
    title: exp?.title ?? '',
    category: exp?.category ?? '',
    price: exp ? String(exp.price) : '',
    durationHours: exp ? String(exp.durationHours) : '',
    capacity: exp?.capacity ? String(exp.capacity) : '',
    description: exp?.description ?? '',
    status: exp?.status ?? 'active',
    image: exp?.image ?? '',
  };
}

function validate(v, editing) {
  const errors = {};
  if (v.title.trim().length < 3) errors.title = 'Enter a name with at least 3 characters.';
  if (!v.category) errors.category = 'Select a category.';
  if (v.description.trim().length < 10) errors.description = 'Enter a description with at least 10 characters.';
  const price = Number(v.price);
  if (v.price === '' || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a valid price greater than 0.';
  const hours = Number(v.durationHours);
  if (v.durationHours === '' || !Number.isFinite(hours) || hours <= 0) errors.durationHours = 'Enter a valid duration in hours greater than 0.';
  if (!editing) {
    const capacity = Number(v.capacity);
    if (v.capacity === '' || !Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Capacity must be a whole number of 1 or more.';
  }
  return errors;
}

// Add and Edit are two different modals in the old UI (ids addModal / editModal, each with its own CSS),
// so they keep their own markup here. The region is the signed-in partner's own and is never editable.
export default function ExperienceFormModal({ experience, onClose, onSaved }) {
  const { region } = useAuth();
  const editing = Boolean(experience);
  const [values, setValues] = useState(() => toForm(experience));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    const found = validate(values, editing);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      destination: region,
      category: values.category,
      price: Number(values.price),
      durationHours: Number(values.durationHours),
      status: values.status,
    };
    if (values.image) payload.image = values.image;
    if (!editing) payload.capacity = Number(values.capacity);
    setSaving(true);
    try {
      const saved = editing ? await updateExperience(experience.id, payload) : await createExperience(payload);
      onSaved(saved, editing ? 'edit' : 'add');
    } catch (err) {
      if (err.status === 400 && err.fieldErrors) {
        const mapped = {};
        const leftovers = [];
        Object.entries(err.fieldErrors).forEach(([field, text]) => {
          if (FORM_FIELDS.includes(field)) mapped[field] = text;
          else leftovers.push(text);
        });
        setErrors(mapped);
        setFormError(leftovers[0] ?? 'Please fix the highlighted fields before saving.');
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const categorySelect = (id) => (
    <select id={id} name="category" value={values.category} onChange={set('category')} required>
      <option value="" disabled>Select category</option>
      {CATEGORIES.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
  const close = saving ? undefined : onClose;
  const title = editing ? 'Edit Experience' : 'Add New Experience';

  if (editing) {
    return (
      <ModalFrame id="editModal" labelledBy="editModalTitle" onClose={close}>
        <div className="modal-header">
          <h2 id="editModalTitle">{title}</h2>
          <CloseButton label="Close edit experience" onClick={close} />
        </div>

        <form id="editExperienceForm" className="experience-form" noValidate onSubmit={submit}>
          <div id="editTabDetails" className="edit-tab-content active">
            <div className="section form-grid">
              <label className="field-group field-group-full" htmlFor="editName">
                <span>Experience Name</span>
                <input id="editName" name="title" required maxLength={80} value={values.title} onChange={set('title')} />
                <FieldError>{errors.title}</FieldError>
              </label>

              <label className="field-group field-group-full" htmlFor="editLocation">
                <span>Assigned Location (Fixed)</span>
                <input id="editLocation" name="location" readOnly disabled value={region ?? ''} style={LOCKED_LOCATION_STYLE} />
              </label>

              <label className="field-group field-group-full" htmlFor="editCategory">
                <span>Category</span>
                {categorySelect('editCategory')}
                <FieldError>{errors.category}</FieldError>
              </label>

              <label className="field-group field-group-full" htmlFor="editDescription">
                <span>Description</span>
                <textarea id="editDescription" name="description" required rows={3} maxLength={300} value={values.description} onChange={set('description')} />
                <FieldError>{errors.description}</FieldError>
              </label>

              <label className="field-group field-group-full" htmlFor="editPrice">
                <span>Price per Person</span>
                <input id="editPrice" name="price" type="number" min="1" step="1" required value={values.price} onChange={set('price')} />
                <FieldError>{errors.price}</FieldError>
              </label>

              <label className="field-group field-group-full" htmlFor="editDuration">
                <span>Duration (Hours)</span>
                <input id="editDuration" name="duration" type="number" min="0.5" step="0.5" required value={values.durationHours} onChange={set('durationHours')} />
                <FieldError>{errors.durationHours}</FieldError>
              </label>

              <label className="field-group field-group-full" htmlFor="editStatus">
                <span>Listing Status</span>
                <select id="editStatus" name="status" value={values.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Paused (hidden from travellers)</option>
                </select>
                <FieldError>{errors.status}</FieldError>
              </label>

              <ImageDropzone id="editImage" value={values.image} onChange={(image) => setValues((v) => ({ ...v, image }))} />

              <FormMessage>{formError}</FormMessage>
            </div>
          </div>

          <div className="edit-modal-footer">
            <div className="modal-actions">
              <button type="button" onClick={close} disabled={saving}>Cancel</button>
              <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame id="addModal" labelledBy="addModalTitle" onClose={close}>
      <div className="modal-header">
        <h2 id="addModalTitle">{title}</h2>
        <CloseButton label="Close add experience" onClick={close} />
      </div>

      <form id="addExperienceForm" className="experience-form" noValidate onSubmit={submit}>
        <div className="section form-grid">
          <label className="field-group" htmlFor="expName">
            <span>Experience Name</span>
            <input id="expName" name="title" required maxLength={80} value={values.title} onChange={set('title')} />
            <FieldError>{errors.title}</FieldError>
          </label>
          <label className="field-group" htmlFor="expLocation">
            <span>Assigned Location (Fixed)</span>
            <input id="expLocation" name="location" readOnly disabled value={region ?? ''} style={LOCKED_LOCATION_STYLE} />
          </label>

          <label className="field-group" htmlFor="expCategory">
            <span>Category</span>
            {categorySelect('expCategory')}
            <FieldError>{errors.category}</FieldError>
          </label>
        </div>

        <div className="section form-grid">
          <label className="field-group" htmlFor="expPrice">
            <span>Price per Person (&#8377;)</span>
            <input id="expPrice" name="price" type="number" min="0" step="1" required value={values.price} onChange={set('price')} />
            <FieldError>{errors.price}</FieldError>
          </label>

          <label className="field-group" htmlFor="expDuration">
            <span>Duration (hours)</span>
            <input id="expDuration" name="durationHours" type="number" min="0.5" step="0.5" required value={values.durationHours} onChange={set('durationHours')} />
            <FieldError>{errors.durationHours}</FieldError>
          </label>

          <label className="field-group" htmlFor="expCapacity">
            <span>Capacity per Slot</span>
            <input id="expCapacity" name="capacity" type="number" min="1" step="1" required value={values.capacity} onChange={set('capacity')} />
            <FieldError>{errors.capacity}</FieldError>
          </label>
        </div>

        <div className="section form-grid">
          <ImageDropzone id="expImage" value={values.image} onChange={(image) => setValues((v) => ({ ...v, image }))} />

          <label className="field-group field-group-full" htmlFor="expDescription">
            <span>Short Description</span>
            <textarea id="expDescription" name="description" rows={3} required maxLength={300} value={values.description} onChange={set('description')} />
            <FieldError>{errors.description}</FieldError>
          </label>
        </div>

        <FormMessage>{formError}</FormMessage>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={close} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" id="btnSaveExperience" disabled={saving}>{saving ? 'Saving…' : 'Save Experience'}</button>
        </div>
      </form>
    </ModalFrame>
  );
}

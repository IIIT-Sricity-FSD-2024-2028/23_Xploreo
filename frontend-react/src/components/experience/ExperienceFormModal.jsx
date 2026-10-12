import { useState } from 'react';
import { Modal, useAuth } from '@/foundation';
import { createExperience, updateExperience } from '@/services/partners.api.js';
import { Field, FormMessage, ImagePlaceholder } from './Feedback.jsx';

// Values of the backend ExperienceCategory enum (value, label).
const CATEGORIES = [
  ['adventure', 'Adventure'], ['culture', 'Culture'], ['culinary', 'Culinary'], ['wellness', 'Wellness'],
  ['wildlife', 'Wildlife'], ['photography', 'Photography'], ['tours', 'Tours'], ['attraction tickets', 'Attraction tickets'],
  ['water sports', 'Water sports'], ['cruises', 'Cruises'], ['family', 'Family'], ['luxury', 'Luxury'],
  ['weekend getaway', 'Weekend getaway'], ['honeymoon', 'Honeymoon'], ['pilgrimage', 'Pilgrimage'],
];
const FORM_FIELDS = ['title', 'description', 'category', 'price', 'durationHours', 'capacity', 'status'];

function toForm(exp) {
  return {
    title: exp?.title ?? '',
    category: exp?.category ?? 'culture',
    price: exp ? String(exp.price) : '',
    durationHours: exp ? String(exp.durationHours) : '',
    capacity: exp?.capacity ? String(exp.capacity) : '',
    description: exp?.description ?? '',
    status: exp?.status ?? 'active',
  };
}

function validate(v) {
  const errors = {};
  if (v.title.trim().length < 3) errors.title = 'Enter a name with at least 3 characters.';
  if (v.description.trim().length < 10) errors.description = 'Enter a description with at least 10 characters.';
  const price = Number(v.price);
  if (v.price === '' || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price greater than 0.';
  const hours = Number(v.durationHours);
  if (v.durationHours === '' || !Number.isFinite(hours) || hours < 1) errors.durationHours = 'Duration must be at least 1 hour.';
  const capacity = Number(v.capacity);
  if (v.capacity === '' || !Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Capacity must be a whole number of 1 or more.';
  return errors;
}

// The region is locked to the signed-in partner's own region (it comes from useAuth, never from the form).
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
    const found = validate(values);
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
      capacity: Number(values.capacity),
      status: values.status,
    };
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

  return (
    <Modal
      open
      title={editing ? 'Edit experience' : 'Add new experience'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <button type="button" className="exp-btn exp-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="exp-experience-form" className="exp-btn exp-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save experience'}
          </button>
        </>
      }
    >
      <form id="exp-experience-form" className="exp-form" onSubmit={submit} noValidate>
        <Field id="exp-title" label="Experience name" error={errors.title} className="exp-span-2">
          <input id="exp-title" value={values.title} onChange={set('title')} maxLength={80} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'exp-title-error' : undefined} />
        </Field>
        <Field id="exp-region" label="Region" hint="Assigned to you by Xploreo">
          <input id="exp-region" value={region ?? ''} readOnly disabled />
        </Field>
        <Field id="exp-category" label="Category" error={errors.category}>
          <select id="exp-category" value={values.category} onChange={set('category')}>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field id="exp-price" label="Price per guest (₹)" error={errors.price}>
          <input id="exp-price" type="number" min="1" step="1" inputMode="numeric" value={values.price} onChange={set('price')} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'exp-price-error' : undefined} />
        </Field>
        <Field id="exp-duration" label="Duration (hours)" error={errors.durationHours}>
          <input id="exp-duration" type="number" min="1" step="0.5" value={values.durationHours} onChange={set('durationHours')} aria-invalid={Boolean(errors.durationHours)} aria-describedby={errors.durationHours ? 'exp-duration-error' : undefined} />
        </Field>
        <Field id="exp-capacity" label="Default capacity per session" error={errors.capacity} hint="Used as the starting capacity for new slots">
          <input id="exp-capacity" type="number" min="1" step="1" value={values.capacity} onChange={set('capacity')} aria-invalid={Boolean(errors.capacity)} aria-describedby={errors.capacity ? 'exp-capacity-error' : undefined} />
        </Field>
        {editing ? (
          <Field id="exp-status" label="Listing status" error={errors.status}>
            <select id="exp-status" value={values.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Paused (hidden from travellers)</option>
            </select>
          </Field>
        ) : null}
        <Field id="exp-description" label="Description" error={errors.description} className="exp-span-2">
          <textarea id="exp-description" rows={3} maxLength={300} value={values.description} onChange={set('description')} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'exp-description-error' : undefined} />
        </Field>
        <div className="exp-span-2">
          <span className="exp-label">Photo</span>
          <ImagePlaceholder />
        </div>
        <div className="exp-span-2">
          <FormMessage>{formError}</FormMessage>
        </div>
      </form>
    </Modal>
  );
}

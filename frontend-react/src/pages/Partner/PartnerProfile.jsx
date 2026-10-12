import { useState } from 'react';
import { StatusBadge, useAuth } from '@/foundation';
import { updatePartnerProfile } from '@/services/partners.api.js';
import { Field, FormMessage } from '@/components/experience/Feedback.jsx';
import { fallbackVariant, partnerProfileVariants } from './variants.js';
import '@/styles/partner-profile.css';

const TYPE_LABEL = { experience: 'Experience partner', guide: 'Guide', hotel: 'Hotel partner' };

function validate(values, variant) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Enter a name with at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a phone number with at least 7 digits.';
  if (variant.businessLabel && values.businessName.trim().length < 2) errors.businessName = `Enter your ${variant.businessLabel.toLowerCase()}.`;
  return errors;
}

export default function PartnerProfile() {
  // Role, partner type and region are read from useAuth() on every render, never copied into state.
  const { user } = useAuth();
  const variant = partnerProfileVariants[user.partnerType] ?? fallbackVariant;
  const [values, setValues] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    businessName: user.businessName ?? '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ tone: 'danger', text: '' });
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setMessage({ tone: 'danger', text: '' });
  };

  async function submit(event) {
    event.preventDefault();
    const found = validate(values, variant);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage({ tone: 'danger', text: 'Please fix the highlighted fields before saving.' });
      return;
    }
    setSaving(true);
    try {
      const body = { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() };
      if (variant.businessLabel) body.businessName = values.businessName.trim();
      const saved = await updatePartnerProfile(user.id, body);
      setValues({ name: saved.name, email: saved.email, phone: saved.phone, businessName: saved.businessName ?? '' });
      setMessage({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      if (err.status === 400 && err.fieldErrors) {
        setErrors(err.fieldErrors);
        setMessage({ tone: 'danger', text: 'Please fix the highlighted fields before saving.' });
      } else {
        setMessage({ tone: 'danger', text: err.message });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="partner-profile">
      <header className="partner-profile-header">
        <p className="partner-profile-eyebrow">{TYPE_LABEL[user.partnerType] ?? 'Partner'}</p>
        <h1>{variant.title}</h1>
        <p className="partner-profile-muted">{variant.intro}</p>
      </header>

      <section className="partner-profile-card" aria-label="Account">
        <dl className="partner-profile-facts">
          <div><dt>Account type</dt><dd>{TYPE_LABEL[user.partnerType] ?? 'Partner'}</dd></div>
          <div><dt>Region</dt><dd><StatusBadge tone="info">{user.region}</StatusBadge></dd></div>
        </dl>
        <p className="partner-profile-muted">Your account type and region are assigned by Xploreo and cannot be changed here.</p>
      </section>

      <form className="partner-profile-card partner-profile-form" onSubmit={submit} noValidate>
        <h2>Contact details</h2>
        <Field id="pp-name" label={variant.nameLabel} error={errors.name}>
          <input id="pp-name" value={values.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'pp-name-error' : undefined} />
        </Field>
        {variant.businessLabel ? (
          <Field id="pp-business" label={variant.businessLabel} error={errors.businessName}>
            <input id="pp-business" value={values.businessName} onChange={set('businessName')} aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? 'pp-business-error' : undefined} />
          </Field>
        ) : null}
        <Field id="pp-email" label="Email" error={errors.email}>
          <input id="pp-email" type="email" value={values.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'pp-email-error' : undefined} />
        </Field>
        <Field id="pp-phone" label="Phone" error={errors.phone}>
          <input id="pp-phone" type="tel" value={values.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'pp-phone-error' : undefined} />
        </Field>
        <FormMessage tone={message.tone}>{message.text}</FormMessage>
        <div className="partner-profile-actions">
          <button type="submit" className="exp-btn exp-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

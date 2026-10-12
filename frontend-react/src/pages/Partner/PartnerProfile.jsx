import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { getGuideProfile, updateGuideProfile, updatePartnerProfile } from '@/services/partners.api.js';
import { PROFILE_CSS } from '@/legacy/styles.js';
import { usePageStyles } from '@/lib/usePageStyles.js';
import { ui } from '@/lib/assets.js';
import { fallbackVariant, partnerProfileVariants } from './variants.js';

// Layout, classes and copy come from the old profile.html / profile.js (styled by shared.css + profile.css).

const FIELD_ERROR_STYLE = { color: '#dc2626', fontSize: '0.8rem' };
const MESSAGE_STYLE = { margin: '0 0 1rem', fontWeight: 600, textAlign: 'right' };

const splitName = (name = '') => {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.join(' ') };
};
const phoneDigits = (phone = '') => String(phone).replace(/^\+91\s*/, '').replace(/\D/g, '');

function validate(values, variant) {
  const errors = {};
  if (values.firstName.trim().length < 2) errors.firstName = 'Enter at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(values.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6-9.';
  if (variant.businessLabel && values.businessName.trim().length < 2) errors.businessName = `Enter your ${variant.businessLabel.toLowerCase()}.`;
  if (variant.professional) {
    if (values.yearsExp === '' || !Number.isInteger(Number(values.yearsExp)) || Number(values.yearsExp) < 0) errors.yearsExp = 'Enter a whole number of years.';
    if (!values.languages.split(',').some((l) => l.trim())) errors.languages = 'Enter at least one language, separated by commas.';
    if (values.bio.trim().length < 10) errors.bio = 'Bio must be at least 10 characters long.';
  }
  return errors;
}

function Field({ label, error, full, children }) {
  return (
    <div className={`input-group${full ? ' full' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {error ? <small style={FIELD_ERROR_STYLE}>{error}</small> : null}
    </div>
  );
}

function ProfileForm({ user, guide, variant }) {
  const navigate = useNavigate();
  const initial = () => {
    const { first, last } = splitName(user.name);
    return {
      firstName: first,
      lastName: last,
      email: user.email ?? '',
      phone: phoneDigits(user.phone),
      businessName: user.businessName ?? '',
      yearsExp: guide ? String(guide.years_exp ?? '') : '',
      languages: guide ? (guide.lang_spoken ?? []).join(', ') : '',
      bio: guide?.bio ?? '',
    };
  };
  const [values, setValues] = useState(initial);
  const [editing, setEditing] = useState({ personal: false, professional: false });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ tone: 'error', text: '' });
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    const value = field === 'phone' || field === 'yearsExp' ? event.target.value.replace(/\D/g, '') : event.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    setMessage({ tone: 'error', text: '' });
  };

  async function save() {
    const found = validate(values, variant);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage({ tone: 'error', text: 'Please fix the highlighted fields before saving.' });
      return;
    }
    setSaving(true);
    try {
      const body = { name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(), email: values.email.trim(), phone: `+91 ${values.phone}` };
      if (variant.businessLabel) body.businessName = values.businessName.trim();
      await updatePartnerProfile(user.id, body);
      if (variant.professional) {
        await updateGuideProfile(user.id, {
          years_exp: Number(values.yearsExp),
          lang_spoken: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
          bio: values.bio.trim(),
        });
      }
      setEditing({ personal: false, professional: false });
      setMessage({ tone: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      if (err.status === 400 && err.fieldErrors) {
        const map = { name: 'firstName', email: 'email', phone: 'phone', businessName: 'businessName', years_exp: 'yearsExp', lang_spoken: 'languages', bio: 'bio' };
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([field, text]) => [map[field] ?? field, text])));
        setMessage({ tone: 'error', text: 'Please fix the highlighted fields before saving.' });
      } else {
        setMessage({ tone: 'error', text: `Failed to update profile. ${err.message}` });
      }
    } finally {
      setSaving(false);
    }
  }

  const toggle = (section) => () => {
    if (editing[section]) {
      save();
    } else {
      setEditing((e) => ({ ...e, [section]: true }));
      setMessage({ tone: 'error', text: '' });
    }
  };
  const personalLocked = !editing.personal || saving;
  const professionalLocked = !editing.professional || saving;
  const yearsLabel = guide ? `${guide.years_exp} Years` : null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">Profile</h1>
        <p className="profile-subtitle">Manage your account information and professional profile.</p>
      </div>

      <div className="profile-hero-card">
        <div className="profile-avatar-wrapper">
          {/* TODO(M3): avatar upload arrives with the shared <ImageUploader />. */}
          <img src={ui('profile.png')} className="profile-avatar" id="profilePic" alt="" />
        </div>
        <div className="hero-info">
          <h2 className="hero-name">{user.name || 'User'}</h2>
          <div className="hero-meta">
            <div className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              <span>{user.region}</span>
            </div>
            {yearsLabel || user.businessName ? (
              <div className="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <span>{yearsLabel ?? user.businessName}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="badges" />
      </div>

      <form id="profileForm" noValidate onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="profile-section">
          <div className="section-header">
            <h3 className="section-title">Personal Information</h3>
            <button type="button" className="edit-btn" id="editPersonal" onClick={toggle('personal')} disabled={saving}>
              {editing.personal ? 'Save' : 'Edit'}
            </button>
          </div>
          <div className="form-grid">
            <Field label="First Name" error={errors.firstName}>
              <input type="text" className="input-field" name="firstName" aria-label="First Name" value={values.firstName} onChange={set('firstName')} disabled={personalLocked} />
            </Field>
            <Field label="Last Name">
              <input type="text" className="input-field" name="lastName" aria-label="Last Name" value={values.lastName} onChange={set('lastName')} disabled={personalLocked} />
            </Field>
            <Field label="Email Address" error={errors.email}>
              <input type="email" className="input-field" name="email" aria-label="Email Address" value={values.email} onChange={set('email')} disabled={personalLocked} />
            </Field>
            <Field label="Phone Number" error={errors.phone}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#4B5563' }}>+91</span>
                <input type="tel" className="input-field" style={{ flex: 1 }} name="phone" aria-label="Phone Number" maxLength={10} placeholder="10-digit mobile number" value={values.phone} onChange={set('phone')} disabled={personalLocked} />
              </div>
            </Field>
            <Field label="Location" full>
              {/* The region is assigned by Xploreo (it comes from the session), so it is shown but never editable. */}
              <input type="text" className="input-field" name="location" aria-label="Location" value={user.region ?? ''} readOnly disabled />
            </Field>
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header">
            <h3 className="section-title">{variant.professional ? 'Professional Details' : 'Business Details'}</h3>
            <button type="button" className="edit-btn" id="editProfessional" onClick={toggle('professional')} disabled={saving}>
              {editing.professional ? 'Save' : 'Edit'}
            </button>
          </div>
          <div className="form-grid">
            {variant.professional ? (
              <>
                <Field label="Years of Experience" error={errors.yearsExp}>
                  <input type="text" inputMode="numeric" className="input-field" name="experience" aria-label="Years of Experience" value={values.yearsExp} onChange={set('yearsExp')} disabled={professionalLocked} />
                </Field>
                <Field label="Languages" error={errors.languages}>
                  <input type="text" className="input-field" name="languages" aria-label="Languages" value={values.languages} onChange={set('languages')} disabled={professionalLocked} />
                </Field>
                <Field label="Bio" error={errors.bio} full>
                  <textarea className="input-field" name="bio" aria-label="Bio" value={values.bio} onChange={set('bio')} disabled={professionalLocked} />
                </Field>
              </>
            ) : (
              <Field label={variant.businessLabel ?? 'Business Name'} error={errors.businessName} full>
                <input type="text" className="input-field" name="businessName" aria-label={variant.businessLabel ?? 'Business Name'} value={values.businessName} onChange={set('businessName')} disabled={professionalLocked} />
              </Field>
            )}
          </div>
        </div>

        {message.text ? (
          <p role={message.tone === 'error' ? 'alert' : 'status'} style={{ ...MESSAGE_STYLE, color: message.tone === 'error' ? '#dc2626' : '#16a34a' }}>
            {message.text}
          </p>
        ) : null}

        <div className="save-all-container">
          <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
}

export default function PartnerProfile() {
  // Role, partner type and region are read from useAuth() on every render, never copied into state.
  const { user } = useAuth();
  usePageStyles(PROFILE_CSS, '', 'Profile');
  const variant = partnerProfileVariants[user.partnerType] ?? fallbackVariant;
  const loadGuide = useCallback(() => (variant.professional ? getGuideProfile(user.id) : Promise.resolve(null)), [variant.professional, user.id]);
  const { data: guide, loading, error } = useAsyncData(loadGuide);

  return (
    <div id="main">
      {loading && guide === null && !error ? (
        <div className="profile-page"><p className="profile-subtitle" role="status">Loading your profile…</p></div>
      ) : (
        <>
          {error ? (
            <p role="alert" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem', color: '#dc2626', fontWeight: 600 }}>
              Could not load your professional details: {error.message}
            </p>
          ) : null}
          <ProfileForm key={`${user.id}-${guide ? 'loaded' : 'plain'}`} user={user} guide={guide} variant={variant} />
        </>
      )}
    </div>
  );
}

// Port of front_end/pages/hotels/hotelprofile.html + js/modules/hotelprofile.js: block-by-block
// edit with the original validation rules, now persisted through /hotels/partner/profile.
import { Link } from 'react-router-dom';
import { savePartnerProfile } from '@/store/hotel/partnerProfileSlice.js';
import { useHotelAction, usePartnerHotels, usePartnerProfile } from '@/store/hotel/hooks.js';
import { useHotelState } from '@/store/hotel/useHotelState.js';
import HotelPage, { LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { useToast } from '@/components/hotel/hotelKit.jsx';

const TIME = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const RULES = {
  hotelName: (v) => (!v.trim() ? 'Hotel Name is required' : v.trim().length < 3 ? 'Minimum 3 characters required' : !/^[a-zA-Z0-9\s]+$/.test(v) ? 'Only letters, numbers, spaces allowed' : ''),
  location: (v) => (!v.trim() ? 'Location is required' : v.trim().length < 3 ? 'Minimum 3 characters required' : ''),
  description: (v) => (v.length > 300 ? 'Maximum 300 characters allowed' : ''),
  contactNumber: (v) => (!v.trim() ? 'Contact number is required' : !/^[0-9]{10,15}$/.test(v) ? 'Contact number must be 10–15 digits' : /^0+$/.test(v) ? 'Contact number cannot be all zeroes' : ''),
  email: (v) => (!v.trim() ? 'Email is required' : !/^\S+@\S+\.\S+$/.test(v) ? 'Please enter a valid email address' : ''),
  gst: (v) => (!v.trim() || /^[A-Za-z0-9]{8,15}$/.test(v) ? '' : 'Must be alphanumeric, 8-15 characters'),
  payoutMethod: () => '',
  checkInTime: (v) => (!v ? 'Check-in time is required' : !TIME.test(v) ? 'Format must be HH:MM' : ''),
  checkOutTime: (v, all) => {
    if (!v) return 'Check-out time is required';
    if (!TIME.test(v)) return 'Format must be HH:MM';
    return all.checkInTime && v <= all.checkInTime ? 'Check-out must be after check-in' : '';
  },
  cancellationPolicy: () => '',
  logo: (v) => (!v || /^https?:\/\//i.test(v) ? '' : 'Enter a full image URL (https://…)'),
};

const BLOCKS = [
  { id: 'basicInfo', title: 'Basic Information', fields: [
    { name: 'hotelName', label: 'Hotel Name' },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
  ] },
  { id: 'contact', title: 'Contact Details', fields: [
    { name: 'contactNumber', label: 'Contact Number', type: 'tel' },
    { name: 'email', label: 'Email', type: 'email' },
  ] },
  { id: 'location', title: 'Location', fields: [{ name: 'location', label: 'Location', wide: true }] },
  { id: 'business', title: 'Business Information', fields: [
    { name: 'gst', label: 'GST / Tax ID' },
    { name: 'bankAccount', label: 'Bank Account', readOnly: true },
    { name: 'payoutMethod', label: 'Payout Method' },
  ] },
  { id: 'policies', title: 'Policies', fields: [
    { name: 'checkInTime', label: 'Check-in Time', type: 'time' },
    { name: 'checkOutTime', label: 'Check-out Time', type: 'time' },
    { name: 'cancellationPolicy', label: 'Cancellation Policy', wide: true },
  ] },
  { id: 'media', title: 'Media Uploads', fields: [{ name: 'logo', label: 'Logo image URL', wide: true, placeholder: 'https://… (square, 400×400px or larger)' }] },
];

const EMPTY_FIELDS = {};

export default function HotelProfile() {
  const [toast, notify] = useToast();
  const hotels = usePartnerHotels();
  const { accountId, data: profile, loading, error, reload } = usePartnerProfile();
  const saveProfile = useHotelAction(savePartnerProfile);
  const properties = hotels.data ?? [];
  const pageLoading = loading || hotels.loading;
  const retry = () => { reload(); hotels.reload(); };

  const [editing, setEditing] = useHotelState(null);
  const [draft, setDraft] = useHotelState(EMPTY_FIELDS);
  const [errors, setErrors] = useHotelState(EMPTY_FIELDS);
  const [busy, setBusy] = useHotelState(false);

  const startEdit = (block) => {
    setEditing(block.id);
    setDraft(Object.fromEntries(block.fields.map((f) => [f.name, profile[f.name] ?? ''])));
    setErrors({});
  };
  const cancel = () => { setEditing(null); setErrors({}); };

  const validate = (block, values) => {
    const next = {};
    block.fields.forEach((f) => {
      if (f.readOnly) return;
      const message = RULES[f.name](values[f.name] ?? '', { ...profile, ...values });
      if (message) next[f.name] = message;
    });
    return next;
  };

  const onChange = (block, name, value) => {
    const values = { ...draft, [name]: value };
    setDraft(values);
    setErrors(validate(block, values));
  };

  const save = async (block) => {
    const found = validate(block, draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = Object.fromEntries(block.fields.filter((f) => !f.readOnly).map((f) => [f.name, String(draft[f.name] ?? '').trim()]));
      await saveProfile({ accountId, values: body }).unwrap();
      setEditing(null);
      notify('Profile saved');
    } catch (err) {
      notify(err.message || 'Could not save profile', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <HotelPage title="Profile">
      <PageHeader title="Profile" subtitle="Manage your hotel and account details" />
      <LoadState loading={pageLoading} error={error} onRetry={retry}>
        {profile ? (
          <form id="profileForm" className="profile-layout" onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="hotel-content-card profile-card-top fade-in">
              <div className="profile-card-left">
                <div className="profile-hotel-icon">
                  {profile.logo ? <img src={profile.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <i className="hotel-building-icon" />}
                </div>
                <div className="profile-hotel-info">
                  <h2>{profile.hotelName || 'Your hotel'}</h2>
                  <p className="location-text"><span className="loc-pin" /> {profile.location || '—'}</p>
                </div>
              </div>
            </div>

            <div className="hotel-content-card section-card">
              <div className="section-header-flex">
                <h3>My Properties ({properties.length})</h3>
                <Link to="/hotel/properties" className="edit-block-btn">Manage</Link>
              </div>
              {properties.length ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {properties.map((h) => (
                    <li key={h.id}>{h.name} <span className="hotel-sub-text">— {h.location || h.city}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="hotel-sub-text">No properties yet.</p>
              )}
            </div>

            {BLOCKS.map((block, index) => {
              const isEditing = editing === block.id;
              const values = isEditing ? draft : profile;
              return (
                <div key={block.id} id={`block-${block.id}`}
                  className={`hotel-content-card section-card slide-up delay-${Math.min(index, 5)}${isEditing ? '' : ' block-view-mode'}`}>
                  <div className="section-header-flex">
                    <h3>{block.title}</h3>
                    <button type="button" className="edit-block-btn" disabled={editing !== null && !isEditing} onClick={() => startEdit(block)}>✎ Edit</button>
                  </div>
                  <div className="hotel-form-grid">
                    {block.fields.map((f) => (
                      <div key={f.name} className="hotel-form-group" style={f.wide ? { gridColumn: 'span 2' } : undefined}>
                        <label htmlFor={`f-${f.name}`}>{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea id={`f-${f.name}`} name={f.name} value={values[f.name] ?? ''} readOnly={!isEditing}
                            className={errors[f.name] ? 'is-invalid' : ''} onChange={(e) => onChange(block, f.name, e.target.value)} />
                        ) : (
                          <input id={`f-${f.name}`} name={f.name} type={f.type || 'text'} value={values[f.name] ?? ''}
                            placeholder={f.placeholder} readOnly={!isEditing || f.readOnly}
                            className={errors[f.name] ? 'is-invalid' : ''} onChange={(e) => onChange(block, f.name, e.target.value)} />
                        )}
                        {isEditing && errors[f.name] ? <span className="error-text">{errors[f.name]}</span> : null}
                      </div>
                    ))}
                  </div>
                  {isEditing ? (
                    <div className="block-actions">
                      <button type="button" className="cancel-block-btn" onClick={cancel} disabled={busy}>Cancel</button>
                      <button type="button" className="save-block-btn" onClick={() => save(block)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </form>
        ) : null}
      </LoadState>
      {toast}
    </HotelPage>
  );
}

// Properties: the hotel partner's own hotels. Add, edit or delete a property and see, add to and
// remove the room types (services) inside each one. Everything saved here is what travellers browse.
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { addProperty, changeProperty, removeProperty } from '@/store/hotel/hotelsSlice.js';
import { removeRoom } from '@/store/hotel/roomTypesSlice.js';
import { useHotelAction, usePartnerCatalog } from '@/store/hotel/hooks.js';
import { useHotelState } from '@/store/hotel/useHotelState.js';
import { uploadPartnerImage } from '@/store/hotel/uploads.js';
import ImageUploader from '@/components/common/ImageUploader.jsx';
import HotelPage, { EmptyState, HotelModal, LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { inr, useToast } from '@/components/hotel/hotelKit.jsx';

const EMPTY_FORM = { name: '', location: '', description: '', stars: '3', pricePerNight: '', image: '' };

export default function HotelProperties() {
  const { user } = useAuth();
  const [toast, notify] = useToast();
  const [form, setForm] = useHotelState(null);
  const [formError, setFormError] = useHotelState('');
  const [removingHotelId, setRemovingHotel] = useHotelState(null);
  const [removingRoomIds, setRemovingRoom] = useHotelState(null);
  const [busy, setBusy] = useHotelState(false);

  const { accountId, properties: data, loading, error, reload } = usePartnerCatalog();
  const add = useHotelAction(addProperty);
  const change = useHotelAction(changeProperty);
  const remove = useHotelAction(removeProperty);
  const removeService = useHotelAction(removeRoom);
  const uploadImage = useHotelAction(uploadPartnerImage);
  const removingHotel = data?.find((hotel) => hotel.id === removingHotelId);
  const roomHotel = data?.find((hotel) => hotel.id === removingRoomIds?.hotelId);
  const removingRoom = roomHotel?.rooms.find((room) => room.id === removingRoomIds?.roomId);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      notify(success);
      return true;
    } catch (err) {
      notify(err.message || 'Something went wrong', true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProperty = async () => {
    const price = Number(form.pricePerNight);
    if (form.name.trim().length < 3) return setFormError('Property name must be at least 3 characters.');
    if (!form.location.trim()) return setFormError('Location is required.');
    if (!form.description.trim()) return setFormError('Add a short description.');
    if (form.pricePerNight === '' || !(price >= 0)) return setFormError('Enter a valid starting price per night.');
    setFormError('');
    const values = {
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      stars: Number(form.stars),
      pricePerNight: price,
    };
    const image = form.image.trim();
    if (!form.id || image !== form.originalImage) {
      values.image = image;
      values.images = image ? [image] : [];
    }
    if (!form.id) {
      values.status = 'active';
      if (user?.region) values.city = user.region;
    }
    const ok = await run(
      () => form.id ? change({ accountId, hotelId: form.id, values }).unwrap() : add({ accountId, values }).unwrap(),
      form.id ? 'Property updated' : 'Property added',
    );
    if (ok) setForm(null);
  };

  const editProperty = (hotel) => {
    const image = hotel.image || hotel.images?.[0] || '';
    setFormError('');
    setForm({
      id: hotel.id, name: hotel.name ?? '', location: hotel.location || hotel.city || '',
      description: hotel.description ?? '', stars: hotel.stars ?? '3', pricePerNight: hotel.pricePerNight ?? '',
      image, originalImage: image,
    });
  };

  const confirmDeleteHotel = async () => {
    const ok = await run(() => remove({ accountId, hotelId: removingHotel.id }).unwrap(), 'Property deleted');
    if (ok) setRemovingHotel(null);
  };

  const confirmDeleteRoom = async () => {
    const ok = await run(() => removeService({ accountId, ...removingRoomIds }).unwrap(), 'Service deleted');
    if (ok) setRemovingRoom(null);
  };

  return (
    <HotelPage title="Properties">
      <PageHeader title="Properties" subtitle="Your hotels and the room types offered in each">
        <button type="button" className="btn-blue" onClick={() => { setFormError(''); setForm({ ...EMPTY_FORM }); }}>
          + Add Property
        </button>
      </PageHeader>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {data && data.length === 0 ? (
          <EmptyState title="No properties yet" text="Add your first property, then add room types to it so travellers can book." />
        ) : data ? (
          <div id="service-grid">
            {data.map((hotel) => (
              <article key={hotel.id} className="hotel-service-card">
                <div className="hotel-service-header">
                  {hotel.image ? <img src={hotel.image} className="hotel-service-img" alt={hotel.name} /> : null}
                  <div style={{ flex: 1 }}>
                    <h2>{hotel.name}</h2>
                    <p className="hotel-sub-text">{hotel.location || hotel.city} · {hotel.stars}★</p>
                  </div>
                  <span className={`hotel-status${hotel.status === 'active' ? '' : ' inactive'}`}>{hotel.status}</span>
                </div>

                <div className="hotel-service-info">
                  <strong>Room types ({hotel.rooms.length})</strong>
                  {hotel.rooms.length === 0 ? (
                    <span>No room types yet — add one so travellers can book this property.</span>
                  ) : (
                    hotel.rooms.map((room) => (
                      <span key={room.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <span>
                          {room.type} · {inr(room.pricePerNight)} / night · {room.availableRooms}/{room.totalRooms} available
                          {room.status === 'inactive' ? ' · inactive' : ''}
                        </span>
                        <button type="button" className="btn-cancel" disabled={busy} onClick={() => setRemovingRoom({ hotelId: hotel.id, roomId: room.id })}>
                          Delete
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="hotel-service-actions">
                  <Link to={`/hotel/rooms?hotel=${encodeURIComponent(hotel.id)}`} className="btn-light">Manage / Add Services</Link>
                  <button type="button" className="btn-light" disabled={busy} onClick={() => editProperty(hotel)}>Edit Property</button>
                  <button type="button" className="btn-cancel" onClick={() => setRemovingHotel(hotel.id)}>Delete Property</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </LoadState>

      {form ? (
        <HotelModal
          title={form.id ? 'Edit Property' : 'Add Property'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setForm(null)}>Cancel</button>
              <button type="button" className="btn-gradient" disabled={busy} onClick={saveProperty}>
                {busy ? 'Saving…' : 'Save Property'}
              </button>
            </>
          }
        >
          <h3>Basic Details</h3>
          <label htmlFor="propName">Property Name</label>
          <input id="propName" type="text" placeholder="e.g. Xploreo Heritage Inn" value={form.name} onChange={set('name')} />
          <label htmlFor="propLocation">Location</label>
          <input id="propLocation" type="text" placeholder="e.g. Amer Road, Jaipur" value={form.location} onChange={set('location')} />
          <label htmlFor="propDesc">Description</label>
          <textarea id="propDesc" rows={3} value={form.description} onChange={set('description')} />
          <div className="hotel-form-grid">
            <div>
              <label htmlFor="propStars">Star Rating</label>
              <select id="propStars" value={form.stars} onChange={set('stars')}>
                {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} Star</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="propPrice">Starting Price per Night (₹)</label>
              <input id="propPrice" type="number" min="0" placeholder="4500" value={form.pricePerNight} onChange={set('pricePerNight')} />
            </div>
          </div>
          <h3>Image</h3>
          <ImageUploader hotelPartner id="propImage" value={form.image} uploadImage={uploadImage} onChange={(url) => setForm((f) => f && { ...f, image: url })} />
          {formError ? <p role="alert" style={{ color: '#dc2626', marginTop: 10 }}>{formError}</p> : null}
        </HotelModal>
      ) : null}

      {removingHotel ? (
        <HotelModal
          title="Delete property?"
          onClose={() => setRemovingHotel(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setRemovingHotel(null)}>Keep</button>
              <button type="button" className="btn-cancel" disabled={busy} onClick={confirmDeleteHotel}>Delete</button>
            </>
          }
        >
          <p>“{removingHotel.name}” and its room types will be removed from travellers' search. Properties with active bookings cannot be deleted.</p>
        </HotelModal>
      ) : null}

      {removingRoom ? (
        <HotelModal
          title="Delete service?"
          onClose={() => setRemovingRoom(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setRemovingRoom(null)}>Keep</button>
              <button type="button" className="btn-cancel" disabled={busy} onClick={confirmDeleteRoom}>Delete</button>
            </>
          }
        >
          <p>“{removingRoom.type}” at {roomHotel.name} will be removed. Services with active bookings cannot be deleted.</p>
        </HotelModal>
      ) : null}
      {toast}
    </HotelPage>
  );
}

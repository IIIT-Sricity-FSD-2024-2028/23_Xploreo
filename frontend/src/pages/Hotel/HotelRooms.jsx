// Port of front_end/pages/hotels/hotelRooms.html ("Services"): room types with availability,
// add / edit / delete. All data comes from /hotels/:id/rooms on the backend.
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addRoom, changeRoom, removeRoom } from '@/store/hotel/roomTypesSlice.js';
import { useHotelAction, usePartnerCatalog } from '@/store/hotel/hooks.js';
import { useHotelState } from '@/store/hotel/useHotelState.js';
import { uploadPartnerImage } from '@/store/hotel/uploads.js';
import ImageUploader from '@/components/common/ImageUploader.jsx';
import HotelPage, { EmptyState, HotelModal, LoadState, PageHeader } from '@/components/hotel/HotelPage.jsx';
import { inr, useToast } from '@/components/hotel/hotelKit.jsx';

const EMPTY_FORM = { hotelId: '', type: '', pricePerNight: '', maxOccupancy: '', totalRooms: '', status: 'active', image: '' };

export default function HotelRooms() {
  const [toast, notify] = useToast();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useHotelState(searchParams.get('hotel') || 'all');
  const [form, setForm] = useHotelState(null);
  const [availabilityDraft, setAvailability] = useHotelState(null);
  const [removingId, setRemoving] = useHotelState(null);
  const [formError, setFormError] = useHotelState('');
  const [busy, setBusy] = useHotelState(false);

  const { accountId, hotels, rooms: allRooms, loading, error, reload } = usePartnerCatalog();
  const data = useMemo(() => hotels && allRooms ? { hotels, rooms: allRooms } : null, [hotels, allRooms]);
  const add = useHotelAction(addRoom);
  const change = useHotelAction(changeRoom);
  const remove = useHotelAction(removeRoom);
  const uploadImage = useHotelAction(uploadPartnerImage);
  const removing = allRooms?.find((room) => room.id === removingId);
  const availabilityRoom = allRooms?.find((room) => room.id === availabilityDraft?.roomId);
  const availability = availabilityRoom && { room: availabilityRoom, value: availabilityDraft.value };

  const rooms = useMemo(
    () => (data?.rooms ?? []).filter((r) => filter === 'all' || r.hotelId === filter),
    [data, filter],
  );

  const openAdd = () => {
    setFormError('');
    setForm({ ...EMPTY_FORM, hotelId: filter !== 'all' ? filter : data?.hotels[0]?.id ?? '' });
  };
  const openEdit = (room) => {
    setFormError('');
    setForm({
      id: room.id, hotelId: room.hotelId, type: room.type, pricePerNight: room.pricePerNight, maxOccupancy: room.maxOccupancy,
      totalRooms: room.totalRooms, status: room.status || 'active', image: room.images?.[0] || '',
    });
  };
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

  const saveService = async () => {
    const price = Number(form.pricePerNight);
    const capacity = Number(form.maxOccupancy);
    const total = Number(form.totalRooms);
    if (!form.hotelId) return setFormError('Select a property.');
    if (!form.type.trim()) return setFormError('Service type is required.');
    if (!(price >= 0) || form.pricePerNight === '') return setFormError('Enter a valid price per night.');
    if (!Number.isInteger(capacity) || capacity < 1) return setFormError('Capacity must be at least 1.');
    if (!Number.isInteger(total) || total < 0) return setFormError('Total rooms must be 0 or more.');
    setFormError('');
    const values = {
      type: form.type.trim(), pricePerNight: price, maxOccupancy: capacity, totalRooms: total,
      status: form.status, images: form.image.trim() ? [form.image.trim()] : [],
    };
    const ok = await run(
      () => (form.id
        ? change({ accountId, hotelId: form.hotelId, roomId: form.id, values }).unwrap()
        : add({ accountId, hotelId: form.hotelId, values }).unwrap()),
      form.id ? 'Service updated' : 'Service added',
    );
    if (ok) setForm(null);
  };

  const saveAvailability = async () => {
    const value = Number(availability.value);
    const { room } = availability;
    if (!Number.isInteger(value) || value < 0 || value > room.totalRooms) {
      return notify(`Available rooms must be between 0 and ${room.totalRooms}`, true);
    }
    const ok = await run(() => change({ accountId, hotelId: room.hotelId, roomId: room.id, values: { availableRooms: value } }).unwrap(), 'Availability updated');
    if (ok) setAvailability(null);
  };

  const confirmDelete = async () => {
    const room = removing;
    const ok = await run(() => remove({ accountId, hotelId: room.hotelId, roomId: room.id }).unwrap(), 'Service deleted');
    if (ok) setRemoving(null);
  };

  const toggleStatus = (room) =>
    run(
      () => change({ accountId, hotelId: room.hotelId, roomId: room.id, values: { status: room.status === 'inactive' ? 'active' : 'inactive' } }).unwrap(),
      room.status === 'inactive' ? 'Service activated' : 'Service deactivated',
    );

  return (
    <HotelPage title="Services">
      <PageHeader title="Services" subtitle="Manage your hotel offerings">
        <button type="button" className="btn-blue" onClick={openAdd} disabled={!data?.hotels.length}>+ Add Service</button>
      </PageHeader>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {data && data.hotels.length === 0 ? (
          <EmptyState title="No properties yet" text="You have no hotels on your account yet, so there is nothing to add services to." />
        ) : data ? (
          <>
            <div className="hotel-filters">
              <select aria-label="Filter by property" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Properties ({data.hotels.length})</option>
                {data.hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            {rooms.length === 0 ? (
              <EmptyState title="No services found" text="Add a room type to start taking bookings." />
            ) : (
              <div id="service-grid">
                {rooms.map((room) => {
                  const inactive = room.status === 'inactive';
                  return (
                    <article key={room.id} className="hotel-service-card">
                      <div className="hotel-service-header">
                        {room.images?.[0] ? <img src={room.images[0]} className="hotel-service-img" alt={room.type} /> : null}
                        <div style={{ flex: 1 }}>
                          <h2>{room.type}</h2>
                          <p className="hotel-sub-text">{room.hotelName}</p>
                        </div>
                        <span className={`hotel-status${inactive ? ' inactive' : ''}`}>{inactive ? 'inactive' : 'active'}</span>
                      </div>
                      <div className="hotel-service-info">
                        <span>{inr(room.pricePerNight)} / night · up to {room.maxOccupancy} guests</span>
                        <span>
                          Total {room.totalRooms} · Available {room.availableRooms} · Occupied {room.totalRooms - room.availableRooms}
                        </span>
                      </div>
                      <div className="hotel-service-actions">
                        <button type="button" className="btn-light" onClick={() => setAvailability({ roomId: room.id, value: room.availableRooms })}>Manage Availability</button>
                        <button type="button" className="btn-light" onClick={() => openEdit(room)}>Edit</button>
                        <button type="button" className="btn-light" disabled={busy} onClick={() => toggleStatus(room)}>
                          {inactive ? 'Activate' : 'Deactivate'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => setRemoving(room.id)}>Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </LoadState>

      {form ? (
        <HotelModal
          title={form.id ? 'Edit Service' : 'Add Service'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setForm(null)}>Cancel</button>
              <button type="button" className="btn-gradient" disabled={busy} onClick={saveService}>
                {busy ? 'Saving…' : 'Save Service'}
              </button>
            </>
          }
        >
          <h3>Basic Details</h3>
          <label htmlFor="serviceHotel">Property</label>
          <select id="serviceHotel" value={form.hotelId} onChange={set('hotelId')} disabled={Boolean(form.id)}>
            {(hotels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <label htmlFor="serviceName">Service Type</label>
          <input id="serviceName" type="text" placeholder="Enter room type (e.g. Deluxe Room)" value={form.type} onChange={set('type')} />
          <div className="hotel-form-grid">
            <div>
              <label htmlFor="servicePrice">Price per Night (₹)</label>
              <input id="servicePrice" type="number" min="0" placeholder="4800" value={form.pricePerNight} onChange={set('pricePerNight')} />
            </div>
            <div>
              <label htmlFor="serviceCapacity">Capacity (guests)</label>
              <input id="serviceCapacity" type="number" min="1" placeholder="2" value={form.maxOccupancy} onChange={set('maxOccupancy')} />
            </div>
          </div>
          <label htmlFor="serviceTotal">Total Rooms</label>
          <input id="serviceTotal" type="number" min="0" placeholder="30" value={form.totalRooms} onChange={set('totalRooms')} />

          <h3>Service Status</h3>
          <div className="hotel-status-toggle">
            <button type="button" className={form.status === 'active' ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, status: 'active' }))}>Active</button>
            <button type="button" className={form.status === 'inactive' ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, status: 'inactive' }))}>Inactive</button>
          </div>

          <h3>Image</h3>
          <ImageUploader
            hotelPartner
            id="serviceImage"
            value={form.image}
            uploadImage={uploadImage}
            onChange={(url) => setForm((f) => f && { ...f, image: url })}
          />
          {formError ? <p className="hotel-form-error" role="alert" style={{ color: '#dc2626', marginTop: 10 }}>{formError}</p> : null}
        </HotelModal>
      ) : null}

      {availability ? (
        <HotelModal
          title="Manage Availability"
          onClose={() => setAvailability(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setAvailability(null)}>Cancel</button>
              <button type="button" className="btn-blue" disabled={busy} onClick={saveAvailability}>Save</button>
            </>
          }
        >
          <div className="form-group">
            <label>Total Rooms</label>
            <input type="number" value={availability.room.totalRooms} disabled readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="availableRoomsInput">Available Rooms</label>
            <input
              id="availableRoomsInput" type="number" min="0" max={availability.room.totalRooms} value={availability.value}
              onChange={(e) => setAvailability((a) => ({ ...a, value: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Occupied Rooms</label>
            <input type="number" disabled readOnly value={Math.max(0, availability.room.totalRooms - (Number(availability.value) || 0))} />
          </div>
        </HotelModal>
      ) : null}

      {removing ? (
        <HotelModal
          title="Delete service?"
          onClose={() => setRemoving(null)}
          footer={
            <>
              <button type="button" className="btn-light" onClick={() => setRemoving(null)}>Keep</button>
              <button type="button" className="btn-cancel" disabled={busy} onClick={confirmDelete}>Delete</button>
            </>
          }
        >
          <p>
            “{removing.type}” at {removing.hotelName} will be removed. Services with active bookings cannot be deleted.
          </p>
        </HotelModal>
      ) : null}
      {toast}
    </HotelPage>
  );
}

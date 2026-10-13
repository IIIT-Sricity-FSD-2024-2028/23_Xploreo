import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { deleteExperience, listMyExperiences } from '@/services/partners.api.js';
import { compareSlots, formatCurrency, todayIso } from '@/lib/datetime.js';
import { fontPx, px } from '@/lib/density.js';
import ExperiencePage from '@/components/experience/ExperiencePage.jsx';
import ModalFrame, { CloseButton } from '@/components/experience/ModalFrame.jsx';
import { ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';
import ExperienceFormModal from '@/components/experience/ExperienceFormModal.jsx';
import SlotManager from '@/components/experience/SlotManager.jsx';

function nextSession(exp, today) {
  const sorted = [...exp.slots].sort(compareSlots);
  const next = sorted.find((s) => s.available && s.date >= today) ?? sorted.find((s) => s.date >= today);
  if (next) return { slot: next, text: `Next session: ${next.date} at ${next.time} • ${next.booked}/${next.capacity} seats booked` };
  return { slot: null, text: sorted.length === 0 ? 'No slots created yet' : 'No upcoming sessions' };
}

export default function ExperienceCatalog() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { region } = useAuth();
  const { data, error, loading, reload, mutate } = useAsyncData(listMyExperiences);
  const [form, setForm] = useState(null); // { experience? }
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const experiences = data ?? [];
  const manageId = params.get('manage');
  const today = todayIso();
  const managed = manageId ? experiences.find((e) => e.id === manageId) : null;

  const replace = (updated) => mutate((list) => list.map((e) => (e.id === updated.id ? updated : e)));

  function saved(experience, mode) {
    mutate((list) => (mode === 'add' ? [...list, experience] : list.map((e) => (e.id === experience.id ? experience : e))));
    setForm(null);
  }

  async function confirmRemove() {
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await deleteExperience(removing.id);
      mutate((list) => list.filter((e) => e.id !== removing.id));
      setRemoving(null);
    } catch (err) {
      setRemoveError(err);
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <ExperiencePage pageClass="experience-catalog-page" title="Experiences">
      {managed ? (
        <SlotManager key={managed.id} experience={managed} onUpdated={replace} />
      ) : (
        <>
          <section className="page-header experience-toolbar" id="catalogHeader">
            <div>
              <p className="experience-eyebrow">Catalog Management</p>
              <h1>Experiences</h1>
              <p>
                Assigned Region:{' '}
                <span style={{ display: 'inline-block', padding: `${px(2)}px ${px(10)}px`, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, fontWeight: 600, fontSize: fontPx(12) }}>
                  {region}
                </span>{' '}
                · Manage your experience offerings
              </p>
            </div>

            <button className="primary-btn" id="openAddExperienceBtn" type="button" onClick={() => setForm({})}>
              + Add Experience
            </button>
          </section>

          {!data && loading ? <LoadingBlock label="Loading your catalog…" /> : null}
          {!data && error ? <ErrorNotice error={error} onRetry={reload} /> : null}
          {data ? <ErrorNotice error={error} onRetry={reload} /> : null}
          {manageId && data && !managed ? (
            <ErrorNotice error={{ status: 404, message: 'That experience is not in your catalog.' }} />
          ) : null}

          {data && experiences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: `${px(60)}px ${px(20)}px`, color: '#617084', background: '#ffffff', borderRadius: px(12), border: '1px dashed #d9e0ea' }}>
              <h3 style={{ margin: `0 0 ${px(8)}px`, fontSize: px(18), color: '#273248' }}>No experiences right now</h3>
              <p style={{ margin: 0, fontSize: px(14) }}>You haven&apos;t added any experiences yet.</p>
            </div>
          ) : null}

          <section id="experienceList" className="experience-cards-stack">
            {experiences.map((exp) => {
              const next = nextSession(exp, today);
              return (
                <article key={exp.id} className="card experience-catalog-card" aria-label={exp.title}>
                  <div className="experience-card-row">
                    {exp.image ? (
                      <img src={exp.image} className="exp-img" alt={exp.title} />
                    ) : (
                      <div className="exp-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#999', borderRadius: 8, fontSize: 12 }}>
                        No Image
                      </div>
                    )}
                    <div className="exp-content">
                      <div className="experience-card-header-line catalog-card-header">
                        <div className="catalog-title-block">
                          <h2>{exp.title}</h2>
                          <span className={`status ${exp.status === 'active' ? 'confirmed' : 'cancelled'}`}>{exp.status}</span>
                        </div>
                      </div>
                      <div className="exp-details">
                        <div className="exp-detail-item">
                          <p>Price per person</p>
                          <h3>{formatCurrency(exp.price)}</h3>
                        </div>
                        <div className="exp-detail-item">
                          <p>Duration</p>
                          <h3><span className="detail-icon">◷</span>{exp.durationHours} hours</h3>
                        </div>
                        <div className="exp-detail-item">
                          <p>Capacity per session</p>
                          <h3>
                            <span className="detail-icon">◌</span>
                            {next.slot ? `${next.slot.capacity} guests` : exp.capacity ? `${exp.capacity} guests` : 'Set in slots'}
                          </h3>
                        </div>
                      </div>
                      <div className="slot-bar">
                        <span>{next.text}</span>
                      </div>
                      <div className="actions catalog-actions">
                        <button className="primary-btn" type="button" onClick={() => navigate(`/experience/catalog?manage=${encodeURIComponent(exp.id)}`)}>Manage Slots</button>
                        <button type="button" onClick={() => setForm({ experience: exp })}>Edit</button>
                        <button type="button" className="danger-ghost-btn" onClick={() => { setRemoveError(null); setRemoving(exp); }}>Delete</button>
                        <button type="button" onClick={() => navigate(`/experience/bookings?experience=${encodeURIComponent(exp.id)}`)}>View Bookings</button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {form ? (
        <ExperienceFormModal key={form.experience?.id ?? 'new'} experience={form.experience} onClose={() => setForm(null)} onSaved={saved} />
      ) : null}

      {removing ? (
        <ModalFrame id="deleteExperienceModal" labelledBy="deleteExperienceTitle" onClose={removeBusy ? undefined : () => setRemoving(null)}>
          <div className="modal-header">
            <h2 id="deleteExperienceTitle">Delete this experience?</h2>
            <CloseButton label="Close" onClick={removeBusy ? undefined : () => setRemoving(null)} />
          </div>
          <p>
            <strong>{removing.title}</strong> and all of its sessions will be removed. Guests with upcoming bookings will no longer see it. This cannot be undone.
          </p>
          <ErrorNotice error={removeError} />
          <div className="experience-form">
            <div className="modal-actions">
              <button type="button" onClick={() => setRemoving(null)} disabled={removeBusy}>Cancel</button>
              <button type="button" className="primary-btn" onClick={confirmRemove} disabled={removeBusy}>
                {removeBusy ? 'Deleting…' : 'Delete Experience'}
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </ExperiencePage>
  );
}

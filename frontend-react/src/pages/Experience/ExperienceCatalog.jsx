import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, StatusBadge, useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { deleteExperience, listMyExperiences } from '@/services/partners.api.js';
import { formatCurrency, formatDate, todayIso } from '@/lib/datetime.js';
import { EmptyState, ErrorNotice, LoadingBlock } from '@/components/experience/Feedback.jsx';
import ExperienceFormModal from '@/components/experience/ExperienceFormModal.jsx';
import SlotManager from '@/components/experience/SlotManager.jsx';

export default function ExperienceCatalog() {
  const [params, setParams] = useSearchParams();
  const { region } = useAuth();
  const { data, error, loading, reload, mutate } = useAsyncData(listMyExperiences);
  const [form, setForm] = useState(null); // { experience? }
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const experiences = data ?? [];
  const manageId = params.get('manage');
  const today = todayIso();

  const replace = (updated) => mutate((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  const backToCatalog = () => setParams({});

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

  if (!data && loading) return <LoadingBlock label="Loading your catalog…" />;
  if (!data && error) return <ErrorNotice error={error} onRetry={reload} />;

  if (manageId) {
    const managed = experiences.find((e) => e.id === manageId);
    if (!managed) {
      return (
        <div className="exp-page">
          <EmptyState
            title="Experience not found"
            action={<button type="button" className="exp-btn exp-btn-primary" onClick={backToCatalog}>Back to catalog</button>}
          >
            That experience is not in your catalog.
          </EmptyState>
        </div>
      );
    }
    return <SlotManager experience={managed} onUpdated={replace} onBack={backToCatalog} />;
  }

  return (
    <div className="exp-page">
      <header className="exp-page-header">
        <div>
          <p className="exp-eyebrow">Catalog management</p>
          <h1>Experiences</h1>
          <p className="exp-muted">
            Assigned region: <StatusBadge tone="info">{region}</StatusBadge> · Manage your experience offerings
          </p>
        </div>
        <button type="button" className="exp-btn exp-btn-primary" onClick={() => setForm({})}>
          + Add experience
        </button>
      </header>

      <ErrorNotice error={error} onRetry={reload} />

      {experiences.length === 0 ? (
        <EmptyState
          title="No experiences yet"
          action={<button type="button" className="exp-btn exp-btn-primary" onClick={() => setForm({})}>Add your first experience</button>}
        >
          Create an experience, then add sessions so travellers can book it.
        </EmptyState>
      ) : (
        <div className="exp-stack">
          {experiences.map((exp) => {
            const upcoming = exp.slots.filter((s) => s.date >= today).length;
            const [nextDate, ...nextTime] = String(exp.nextSlot || '').split(' ');
            return (
              <article key={exp.id} className="exp-card exp-experience" aria-label={exp.title}>
                <div className="exp-experience-main">
                  <div className="exp-card-head">
                    <div>
                      <h2>{exp.title}</h2>
                      <p className="exp-muted">{exp.category} · {exp.durationHours}h · {formatCurrency(exp.price)} per guest · up to {exp.capacity} guests</p>
                    </div>
                    <div className="exp-row-actions">
                      {exp.status === 'inactive' ? <StatusBadge tone="neutral">Paused</StatusBadge> : null}
                      <StatusBadge tone={exp.availability === 'available' ? 'success' : 'warning'}>
                        {exp.availability === 'available' ? 'Open for booking' : 'No open sessions'}
                      </StatusBadge>
                    </div>
                  </div>
                  <p>{exp.description}</p>
                  <p className="exp-muted">
                    {upcoming} upcoming session{upcoming === 1 ? '' : 's'}
                    {exp.nextSlot ? ` · Next open: ${formatDate(nextDate)} at ${nextTime.join(' ')}` : ''}
                  </p>
                </div>
                <div className="exp-row-actions">
                  <button type="button" className="exp-btn exp-btn-primary" onClick={() => setParams({ manage: exp.id })}>Manage slots</button>
                  <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setForm({ experience: exp })}>Edit</button>
                  <button type="button" className="exp-btn exp-btn-danger-ghost" onClick={() => { setRemoveError(null); setRemoving(exp); }}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {form ? (
        <ExperienceFormModal key={form.experience?.id ?? 'new'} experience={form.experience} onClose={() => setForm(null)} onSaved={saved} />
      ) : null}

      <Modal
        open={Boolean(removing)}
        title="Delete this experience?"
        onClose={removeBusy ? undefined : () => setRemoving(null)}
        footer={
          <>
            <button type="button" className="exp-btn exp-btn-ghost" onClick={() => setRemoving(null)} disabled={removeBusy}>Cancel</button>
            <button type="button" className="exp-btn exp-btn-danger" onClick={confirmRemove} disabled={removeBusy}>
              {removeBusy ? 'Deleting…' : 'Delete experience'}
            </button>
          </>
        }
      >
        {removing ? (
          <>
            <p><strong>{removing.title}</strong> and all of its sessions will be removed. Guests with upcoming bookings will no longer see it. This cannot be undone.</p>
            <ErrorNotice error={removeError} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

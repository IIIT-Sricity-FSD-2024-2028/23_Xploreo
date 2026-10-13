import { useState } from 'react';
import { useAuth } from '@/foundation';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { createTicket, listMyTickets } from '@/services/guide.api.js';
import { GUIDE_SUPPORT_CSS } from '@/legacy/styles.js';
import { px } from '@/lib/density.js';
import GuidePage from '@/components/guide/GuidePage.jsx';
import { ErrorNotice, FieldError } from '@/components/guide/Feedback.jsx';

const FAQS = [
  ['How do I report a technical bug or system error?', "Fill out the support ticket form above selecting 'Technical Issue' as the category. Describe the steps to reproduce the error and our Technical Admin team will investigate and resolve it."],
  ['How long does it take for support tickets to be resolved?', 'Our Technical Admin team reviews urgent/high-priority tickets within 2 hours and standard requests within 24 hours. You can track real-time resolution notes directly on this page.'],
  ['How can I update my booking or tour schedule?', "You can manage bookings directly from your Dashboard or Schedule tabs. If you encounter an error with date modifications or sync issues, submit a ticket under 'Tours & Bookings'."],
  ['How do partner payouts and billing settlements work?', "Payouts are automatically calculated and processed through the earnings ledger. For discrepancies or payout delays, submit a ticket under 'Payment Issue'."],
];
const CATEGORIES = ['Technical Issue', 'Booking & Reservations', 'Payment & Payouts', 'Account Settings', 'Tours & Experiences', 'General Inquiry'];

const when = (value) => {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
};

const Chevron = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
);

export default function GuideSupport() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsyncData(listMyTickets);
  const [form, setForm] = useState({ subject: '', category: CATEGORIES[0], message: '' });
  const [alert, setAlert] = useState(null); // { text, type }
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);

  // Tickets are scoped to the signed-in user by the server; newest first.
  const tickets = [...(data ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const set = (name) => (event) => setForm((f) => ({ ...f, [name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setAlert(null);
    setFieldErrors({});
    const body = { subject: form.subject.trim(), category: form.category, message: form.message.trim() };
    if (!body.subject || !body.message) {
      setAlert({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const ticket = await createTicket(body);
      setForm({ subject: '', category: CATEGORIES[0], message: '' });
      setAlert({ text: `Ticket ${ticket.id || ''} submitted successfully! Technical admin has been notified.`, type: 'success' });
      reload();
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      setAlert({ text: err.message || 'Failed to submit ticket. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <GuidePage css={GUIDE_SUPPORT_CSS} title="Support & Help - Xploreo">
      <div className="support-page">
        <div className="support-main">
          <div className="support-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="support-title">Support &amp; Help Center</h1>
              <p className="support-subtitle">Submit support requests, report bugs, and track technical issue resolutions.</p>
            </div>
            <div className="user-role-badge">
              <span style={{ display: 'inline-block', width: px(8), height: px(8), borderRadius: '50%', background: '#2563EB', marginRight: px(6) }} />
              {user.name} • GUIDE
            </div>
          </div>

          <div className="support-section">
            <h3 className="section-title">Create Support Ticket</h3>
            <span className="section-desc">Describe your issue or inquiry and the Technical Admin team will review and resolve it.</span>
            <div id="support-alert-container">
              {alert ? <div className={`support-alert ${alert.type}`} role={alert.type === 'error' ? 'alert' : 'status'}><span>{alert.text}</span></div> : null}
            </div>
            <form id="ticketForm" onSubmit={submit} noValidate>
              <div className="form-group">
                <label className="label" htmlFor="ticket-subject">Subject</label>
                <input id="ticket-subject" type="text" className="input-field" name="subject" maxLength={140} required value={form.subject} onChange={set('subject')} placeholder="Brief summary of the issue (e.g., Booking sync failure, Payout query)" />
                <FieldError>{fieldErrors.subject}</FieldError>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label" htmlFor="ticket-category">Category</label>
                  <select id="ticket-category" className="input-field" name="category" value={form.category} onChange={set('category')}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="ticket-message">Detailed Message</label>
                <textarea id="ticket-message" className="input-field" name="message" minLength={10} maxLength={1200} required value={form.message} onChange={set('message')} placeholder="Please provide exact details, error messages, or relevant booking/tour IDs..." />
                <FieldError>{fieldErrors.message}</FieldError>
              </div>
              <button type="submit" id="submitTicketBtn" className="submit-btn" style={{ background: '#2563EB', color: 'white' }} disabled={saving}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                {saving ? 'Submitting Ticket...' : 'Submit Ticket to Technical Admin'}
              </button>
            </form>
          </div>

          <div className="support-section">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Your Support Tickets</h3>
                <p style={{ color: '#6B7280', fontSize: '0.8125rem', margin: 0 }}>Track status and view resolutions provided by Technical Admin</p>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4B5563', background: '#F3F4F6', padding: '4px 12px', borderRadius: 9999 }}>
                {tickets.length} Ticket{tickets.length === 1 ? '' : 's'}
              </span>
            </div>
            <ErrorNotice error={error} onRetry={reload} />
            <div className="history-list" id="ticketList">
              {!data && loading ? <p className="section-desc">Loading your tickets…</p> : null}
              {data && tickets.length === 0 ? (
                <div className="empty-tickets-state">
                  <svg className="empty-tickets-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 style={{ margin: '0 0 6px', fontWeight: 600, color: '#374151' }}>No support tickets raised yet</h4>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.8125rem' }}>Have a question or running into a technical issue? Submit a ticket using the form above.</p>
                </div>
              ) : null}
              {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
            </div>
          </div>

          <div className="support-section">
            <h3 className="section-title">Frequently Asked Questions</h3>
            <span className="section-desc">Quick solutions to common questions across the platform</span>
            <div className="faq-list">
              {FAQS.map(([question, answer], i) => (
                <div className={`faq-item${openFaq === i ? ' active' : ''}`} key={question}>
                  <button type="button" className="faq-question" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                    <span>{question}</span>
                    <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <div className="faq-answer">{answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="support-sidebar">
          <div className="sidebar-card response-time">
            <div className="time-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <span className="time-val">&lt; 24 Hours</span>
              <span className="time-desc">Average Technical Support resolution turnaround</span>
            </div>
          </div>

          <div className="sidebar-card">
            <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Direct Support Channels</h3>
            <div className="contact-item email">
              <div className="icon-box" style={{ background: 'white' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </div>
              <div className="contact-info">
                <span className="contact-label">Technical Desk Email</span>
                <span className="contact-value">support@xploreo.com</span>
                <span className="contact-meta">Direct dispatch to Tech Admin</span>
              </div>
            </div>
            <div className="contact-item phone">
              <div className="icon-box" style={{ background: 'white' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </div>
              <div className="contact-info">
                <span className="contact-label">Urgent Partner Helpline</span>
                <span className="contact-value">+91 1800 123 9756</span>
                <span className="contact-meta">Mon-Sat, 9AM - 8PM IST</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3 className="section-title" style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Quick Resources</h3>
            <div className="quick-links">
              {['Platform Guidelines & SLA', 'System Health & Status', 'Security & Privacy Policies'].map((label) => (
                <a href="#" className="quick-link" key={label} onClick={(e) => e.preventDefault()}><span>{label}</span> <Chevron /></a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GuidePage>
  );
}

function TicketCard({ ticket: t }) {
  const resolved = String(t.status).toUpperCase() === 'RESOLVED';
  const priority = String(t.priority || 'MEDIUM');
  return (
    <div className="ticket-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div className="ticket-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <span style={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8125rem' }}>{t.id || '#ticket'}</span>
            <span className={`priority-tag ${priority.toLowerCase()}`}>{priority.toUpperCase()}</span>
          </div>
          <span className="ticket-title" style={{ marginTop: 2 }}>{t.subject}</span>
          <div className="ticket-meta">
            <span>{t.category || 'General'}</span>
            <span>•</span>
            <span>Created {when(t.createdAt)}</span>
          </div>
        </div>
        <div>
          <span className={`status-pill ${resolved ? 'resolved' : 'open'}`}>{resolved ? '✓ Resolved' : '● Open'}</span>
        </div>
      </div>
      <div style={{ color: '#4B5563', fontSize: '0.8125rem', lineHeight: 1.5, background: '#F9FAFB', padding: '10px 14px', borderRadius: 8, border: '1px solid #F3F4F6' }}>
        {t.message || t.description || ''}
      </div>
      {resolved ? (
        <div className="ticket-resolution-box">
          <div className="ticket-resolution-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span>Resolution from Technical Support Admin:</span>
          </div>
          <p className="ticket-resolution-text">{t.resolution || 'Issue resolved by technical admin.'}</p>
          <div className="ticket-resolution-meta">
            Resolved on {when(t.resolvedAt || t.createdAt)} {t.resolvedBy ? `by ${t.resolvedBy}` : ''}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { createTicket, fetchTickets } from "./api/services.js";

const DEFAULT_FAQS = [
  {
    question: "How do I report a technical bug or system error?",
    answer: "Fill out the support ticket form above selecting 'Technical Issue' as the category. Describe the steps to reproduce the error and our Technical Admin team will investigate and resolve it.",
  },
  {
    question: "How long does it take for support tickets to be resolved?",
    answer: "Our Technical Admin team reviews urgent/high-priority tickets within 2 hours and standard requests within 24 hours. You can track real-time resolution notes directly on this page.",
  },
  {
    question: "How can I update my booking or tour schedule?",
    answer: "You can manage bookings directly from your Dashboard or Schedule tabs. If you encounter an error with date modifications or sync issues, submit a ticket under 'Tours & Bookings'.",
  },
  {
    question: "How do partner payouts and billing settlements work?",
    answer: "Payouts are automatically calculated and processed through the earnings ledger. For discrepancies or payout delays, submit a ticket under 'Payment Issue'.",
  },
];

export async function renderSupportPage(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentUserId = user?.id || user?.userId || user?.username || "";
  const currentUserName = user?.name || user?.username || "User";
  const currentUserRole = (user?.role || "user").toUpperCase();

  // Load live tickets from backend API
  let userTickets = [];
  try {
    const allTickets = await fetchTickets();
    const normalizedUserId = String(currentUserId).toLowerCase();
    userTickets = allTickets.filter((t) => {
      const ticketUserId = String(t.userId || t.travellerId || "").toLowerCase();
      const ticketUserName = String(t.userName || t.travellerName || "").toLowerCase();
      return (
        ticketUserId === normalizedUserId ||
        ticketUserName === normalizedUserId ||
        ticketUserId === String(user?.username || "").toLowerCase()
      );
    });
  } catch (err) {
    console.warn("Could not fetch tickets from backend API, using local fallback:", err);
  }

  container.innerHTML = `
    <div class="support-page">
      <div class="support-main">
        <div class="support-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="support-title">Support & Help Center</h1>
            <p class="support-subtitle">Submit support requests, report bugs, and track technical issue resolutions.</p>
          </div>
          <div class="user-role-badge">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2563EB; margin-right: 6px;"></span>
            ${escapeHtml(currentUserName)} • ${escapeHtml(currentUserRole)}
          </div>
        </div>

        <!-- Create Ticket Card -->
        <div class="support-section">
          <h3 class="section-title">Create Support Ticket</h3>
          <span class="section-desc">Describe your issue or inquiry and the Technical Admin team will review and resolve it.</span>
          
          <div id="support-alert-container"></div>

          <form id="ticketForm">
            <div class="form-group">
              <span class="label">Subject</span>
              <input type="text" class="input-field" name="subject" maxlength="140" placeholder="Brief summary of the issue (e.g., Booking sync failure, Payout query)" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <span class="label">Category</span>
                <select class="input-field" name="category">
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Booking & Reservations">Booking & Reservations</option>
                  <option value="Payment & Payouts">Payment & Payouts</option>
                  <option value="Account Settings">Account Settings</option>
                  <option value="Tours & Experiences">Tours & Experiences</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>
              <div class="form-group">
                <span class="label">Priority</span>
                <select class="input-field" name="priority">
                  <option value="LOW">Low - General Question</option>
                  <option value="MEDIUM" selected>Medium - Minor Issue</option>
                  <option value="HIGH">High - Urgent / Blocking</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <span class="label">Detailed Message</span>
              <textarea class="input-field" name="message" minlength="10" maxlength="1200" placeholder="Please provide exact details, error messages, or relevant booking/tour IDs..." required></textarea>
            </div>

            <button type="submit" id="submitTicketBtn" class="submit-btn" style="background: #2563EB; color: white;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              Submit Ticket to Technical Admin
            </button>
          </form>
        </div>

        <!-- Tickets History -->
        <div class="support-section">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <h3 class="section-title" style="margin-bottom: 4px;">Your Support Tickets</h3>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">Track status and view resolutions provided by Technical Admin</p>
            </div>
            <span style="font-size: 13px; font-weight: 600; color: #4B5563; background: #F3F4F6; padding: 4px 12px; border-radius: 9999px;">
              ${userTickets.length} Ticket${userTickets.length === 1 ? "" : "s"}
            </span>
          </div>

          <div class="history-list" id="ticketList">
            ${
              userTickets.length === 0
                ? `
              <div class="empty-tickets-state">
                <svg class="empty-tickets-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 style="margin: 0 0 6px; font-weight: 600; color: #374151;">No support tickets raised yet</h4>
                <p style="margin: 0; color: #6B7280; font-size: 13px;">Have a question or running into a technical issue? Submit a ticket using the form above.</p>
              </div>
            `
                : userTickets
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((t) => renderTicketCard(t))
                    .join("")
            }
          </div>
        </div>

        <!-- FAQs -->
        <div class="support-section">
          <h3 class="section-title">Frequently Asked Questions</h3>
          <span class="section-desc">Quick solutions to common questions across the platform</span>
          <div class="faq-list">
            ${DEFAULT_FAQS.map(
              (faq) => `
              <div class="faq-item">
                <button class="faq-question">
                  <span>${escapeHtml(faq.question)}</span>
                  <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div class="faq-answer">${escapeHtml(faq.answer)}</div>
              </div>
            `,
            ).join("")}
          </div>
        </div>
      </div>

      <!-- Support Sidebar -->
      <div class="support-sidebar">
        <!-- Response Time Card -->
        <div class="sidebar-card response-time">
          <div class="time-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <span class="time-val">&lt; 24 Hours</span>
            <span class="time-desc">Average Technical Support resolution turnaround</span>
          </div>
        </div>

        <!-- Contact Channels -->
        <div class="sidebar-card">
          <h3 class="section-title" style="margin-bottom: 1rem; font-size: 1.1rem;">Direct Support Channels</h3>
          
          <div class="contact-item email">
            <div class="icon-box" style="background: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div class="contact-info">
              <span class="contact-label">Technical Desk Email</span>
              <span class="contact-value">support@xploreo.com</span>
              <span class="contact-meta">Direct dispatch to Tech Admin</span>
            </div>
          </div>

          <div class="contact-item phone">
            <div class="icon-box" style="background: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div class="contact-info">
              <span class="contact-label">Urgent Partner Helpline</span>
              <span class="contact-value">+91 1800 123 9756</span>
              <span class="contact-meta">Mon-Sat, 9AM - 8PM IST</span>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="sidebar-card">
          <h3 class="section-title" style="margin-bottom: 0.5rem; font-size: 1.1rem;">Quick Resources</h3>
          <div class="quick-links">
            <a href="#" class="quick-link"><span>Platform Guidelines & SLA</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a>
            <a href="#" class="quick-link"><span>System Health & Status</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a>
            <a href="#" class="quick-link"><span>Security & Privacy Policies</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></a>
          </div>
        </div>
      </div>
    </div>
  `;

  setupSupportListeners(container, user);
}

function renderTicketCard(t) {
  const isResolved = t.status === "RESOLVED" || t.status === "resolved";
  const priority = String(t.priority || "MEDIUM").toLowerCase();
  const statusKey = isResolved ? "resolved" : "open";

  return `
    <div class="ticket-card" style="flex-direction: column; align-items: stretch; gap: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div class="ticket-main">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; color: #2563EB; font-size: 13px;">${escapeHtml(t.id || "#ticket")}</span>
            <span class="priority-tag ${priority}">${escapeHtml((t.priority || "MEDIUM").toUpperCase())}</span>
          </div>
          <span class="ticket-title" style="margin-top: 2px;">${escapeHtml(t.subject)}</span>
          <div class="ticket-meta">
            <span>${escapeHtml(t.category || "General")}</span>
            <span>•</span>
            <span>Created ${formatDateTime(t.createdAt)}</span>
          </div>
        </div>
        <div>
          <span class="status-pill ${statusKey}">
            ${isResolved ? "✓ Resolved" : "● Open"}
          </span>
        </div>
      </div>

      <div style="color: #4B5563; font-size: 13px; line-height: 1.5; background: #F9FAFB; padding: 10px 14px; border-radius: 8px; border: 1px solid #F3F4F6;">
        ${escapeHtml(t.message || t.description || "")}
      </div>

      ${
        isResolved
          ? `
        <div class="ticket-resolution-box">
          <div class="ticket-resolution-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Resolution from Technical Support Admin:</span>
          </div>
          <p class="ticket-resolution-text">${escapeHtml(t.resolution || "Issue resolved by technical admin.")}</p>
          <div class="ticket-resolution-meta">
            Resolved on ${formatDateTime(t.resolvedAt || t.createdAt)} ${t.resolvedBy ? `by ${escapeHtml(t.resolvedBy)}` : ""}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function setupSupportListeners(container, user) {
  // FAQ Accordion
  container.querySelectorAll(".faq-question").forEach((q) => {
    q.onclick = (e) => {
      const item = e.target.closest(".faq-item");
      const wasActive = item.classList.contains("active");
      container
        .querySelectorAll(".faq-item")
        .forEach((i) => i.classList.remove("active"));
      if (!wasActive) item.classList.add("active");
    };
  });

  // Ticket Form Submit
  const form = container.querySelector("#ticketForm");
  const alertContainer = container.querySelector("#support-alert-container");
  const submitBtn = container.querySelector("#submitTicketBtn");

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      const payload = {
        subject: String(formData.get("subject") || "").trim(),
        category: String(formData.get("category") || "General"),
        priority: String(formData.get("priority") || "MEDIUM"),
        message: String(formData.get("message") || "").trim(),
      };

      if (!payload.subject || !payload.message) {
        showAlert(alertContainer, "Please fill in all required fields.", "error");
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting Ticket...";
        }

        const newTicket = await createTicket(payload);

        form.reset();
        showAlert(
          alertContainer,
          `Ticket ${newTicket.id || ""} submitted successfully! Technical admin has been notified.`,
          "success",
        );

        // Re-render after brief delay to show new ticket in list
        setTimeout(() => {
          renderSupportPage("main", user);
        }, 1200);
      } catch (err) {
        console.error("Ticket submission error:", err);
        showAlert(
          alertContainer,
          err.message || "Failed to submit ticket. Please try again.",
          "error",
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Submit Ticket to Technical Admin
          `;
        }
      }
    };
  }
}

function showAlert(container, message, type) {
  if (!container) return;
  container.innerHTML = `
    <div class="support-alert ${type}">
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return "Just now";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (_e) {
    return String(value);
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}



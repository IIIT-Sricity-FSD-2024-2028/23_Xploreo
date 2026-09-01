import { createTicket, fetchTickets } from "../api/services.js";

const CATEGORY_OPTIONS = [
  "Booking",
  "Payment",
  "Experience",
  "Hotel",
  "Account",
  "General",
];


export async function renderTravelerSupportPage(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentUserId = user?.id || user?.userId || user?.username || "";
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
  } catch (error) {
    console.warn("Failed to fetch traveler tickets:", error);
  }

  container.innerHTML = buildSupportShell(user, userTickets);

  const form = container.querySelector("#traveler-ticket-form");
  const message = container.querySelector("#ticket-form-message");
  const submit = form?.querySelector("button[type='submit']");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormMessage(message, "", "");

    const formData = new FormData(form);
    const payload = {
      subject: String(formData.get("subject") || "").trim(),
      category: String(formData.get("category") || "General"),
      priority: String(formData.get("priority") || "MEDIUM"),
      message: String(formData.get("message") || "").trim(),
    };

    if (!payload.subject || !payload.message) {
      setFormMessage(
        message,
        "Please add a subject and describe the issue.",
        "error",
      );
      return;
    }

    try {
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Submitting...";
      }
      const ticket = await createTicket(payload);
      form.reset();
      setFormMessage(
        message,
        `Ticket ${shortId(ticket.id)} created successfully. Technical admin has been notified.`,
        "success",
      );

      setTimeout(() => {
        renderTravelerSupportPage(containerId, user);
      }, 1200);
    } catch (error) {
      console.error("Ticket creation failed:", error);
      setFormMessage(
        message,
        error.message || "Unable to create ticket.",
        "error",
      );
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Create Ticket";
      }
    }
  });
}

function buildSupportShell(user, userTickets = []) {
  return `
    <main class="traveler-support-page">
      <section class="traveler-support-main">
        <header class="traveler-support-header">
          <h1>Support & Help</h1>
          <p>Create a ticket and the technical admin team will pick it up from the backend queue.</p>
        </header>

        <section class="traveler-support-card">
          <h2>Create support ticket</h2>
          <p>Use this for booking, payment, hotel, or experience issues.</p>
          <form id="traveler-ticket-form" class="traveler-support-form">
            <label class="traveler-support-field">
              <span>Subject</span>
              <input class="traveler-support-input" name="subject" maxlength="140" required placeholder="What happened?" />
            </label>

            <label class="traveler-support-field">
              <span>Category</span>
              <select class="traveler-support-select" name="category">
                ${CATEGORY_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}
              </select>
            </label>


            <label class="traveler-support-field">
              <span>Message</span>
              <textarea class="traveler-support-textarea" name="message" minlength="10" maxlength="1200" required placeholder="Share the details the team needs to resolve this."></textarea>
            </label>

            <div id="ticket-form-message" class="traveler-ticket-message" aria-live="polite"></div>
            <button class="traveler-support-submit" type="submit">Create Ticket</button>
          </form>
        </section>

        <section class="traveler-support-card">
          <h2>Your support tickets (${userTickets.length})</h2>
          <div id="latest-ticket" class="traveler-support-ticket-list" style="display: flex; flex-direction: column; gap: 1rem;">
            ${
              userTickets.length === 0
                ? `
              <div class="traveler-support-ticket">
                <div>
                  <p class="traveler-support-ticket-title">No support tickets created yet</p>
                  <div class="traveler-support-ticket-meta">Your submitted tickets and resolutions will appear here.</div>
                </div>
              </div>
            `
                : userTickets
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((t) => renderTicketCard(t))
                    .join("")
            }
          </div>
        </section>
      </section>

      <aside class="traveler-support-sidebar">
        <section class="traveler-support-card">
          <h2>Signed in as</h2>
          <div class="traveler-support-contact">
            <div class="traveler-support-contact-icon">${escapeHtml(initials(user?.name || user?.username || "T"))}</div>
            <div>
              <span class="traveler-support-contact-label">${escapeHtml(user?.role || "traveller")}</span>
              <span class="traveler-support-contact-value">${escapeHtml(user?.name || user?.username || "Traveller")}</span>
              <span class="traveler-support-contact-meta">${escapeHtml(user?.email || "support@xploreo.com")}</span>
            </div>
          </div>
        </section>

        <section class="traveler-support-card" style="margin-top: 1rem;">
          <h2>Direct Help Desk</h2>
          <div style="font-size: 13px; color: #4B5563; line-height: 1.6;">
            <p style="margin: 0 0 6px;"><strong>Email:</strong> support@xploreo.com</p>
            <p style="margin: 0 0 6px;"><strong>Helpline:</strong> +91 1800 123 9756</p>
            <p style="margin: 0; color: #10B981; font-weight: 600;">Technical Admin SLA: &lt; 24 hrs</p>
          </div>
        </section>
      </aside>
    </main>
  `;
}

function renderTicketCard(ticket) {
  const isResolved = ticket.status === "RESOLVED" || ticket.status === "resolved";
  return `
    <article class="traveler-support-ticket" style="display: flex; flex-direction: column; align-items: stretch; gap: 0.5rem; padding: 1rem; border: 1px solid #E5E7EB; border-radius: 12px; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div>
          <p class="traveler-support-ticket-title" style="font-weight: 700; color: #111827; margin: 0 0 4px;">${escapeHtml(ticket.subject)}</p>
          <div class="traveler-support-ticket-meta" style="font-size: 12px; color: #6B7280; display: flex; gap: 8px;">
            <span>${shortId(ticket.id)}</span>
            <span>•</span>
            <span>${escapeHtml(ticket.category || "General")}</span>
            <span>•</span>
            <span>${formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <div class="traveler-support-ticket-trailing">
          <span class="traveler-support-status ${isResolved ? "resolved" : "open"}" style="padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${isResolved ? "background: #DCFCE7; color: #166534;" : "background: #FEF9C3; color: #854D0E;"}">
            ${isResolved ? "✓ Resolved" : "● Open"}
          </span>
        </div>
      </div>
      <div style="font-size: 13px; color: #4B5563; background: #F9FAFB; padding: 8px 12px; border-radius: 6px;">
        ${escapeHtml(ticket.message || ticket.description || "")}
      </div>
      ${
        isResolved
          ? `
        <div style="margin-top: 4px; padding: 8px 12px; background: #F0FDF4; border-left: 3px solid #10B981; border-radius: 6px; font-size: 12px; color: #166534;">
          <strong>Resolution:</strong> ${escapeHtml(ticket.resolution || "Resolved by technical admin.")}
          <div style="font-size: 11px; color: #4ADE80; margin-top: 2px;">Resolved on ${formatDate(ticket.resolvedAt || ticket.createdAt)}</div>
        </div>
      `
          : ""
      }
    </article>
  `;
}

function setFormMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.className = `traveler-ticket-message ${type || ""}`.trim();
}

function shortId(id = "") {
  return id ? `#${String(id).slice(0, 8)}` : "#ticket";
}

function titleCase(value = "") {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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


const CATEGORY_OPTIONS = [
  "Booking",
  "Payment",
  "Experience",
  "Hotel",
  "Account",
  "General",
];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];

function saveTicket(payload) {
  try {
    const list = JSON.parse(localStorage.getItem("tickets") || "[]");
    const newTicket = { id: "TICK-" + Date.now(), status: "OPEN", createdAt: new Date().toISOString(), ...payload };
    list.push(newTicket);
    localStorage.setItem("tickets", JSON.stringify(list));
    return newTicket;
  } catch {
    return { id: "TICK-" + Date.now(), status: "OPEN", createdAt: new Date().toISOString(), ...payload };
  }
}

export async function renderTravelerSupportPage(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = buildSupportShell(user);

  const form = container.querySelector("#traveler-ticket-form");
  const message = container.querySelector("#ticket-form-message");
  const latestTicket = container.querySelector("#latest-ticket");
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
      if (submit) submit.disabled = true;
      const ticket = saveTicket(payload);
      form.reset();
      setFormMessage(
        message,
        `Ticket ${shortId(ticket.id)} created successfully.`,
        "success",
      );
      if (latestTicket) latestTicket.innerHTML = renderTicketCard(ticket);
    } catch (error) {
      console.error("Ticket creation failed:", error);
      setFormMessage(
        message,
        error.message || "Unable to create ticket.",
        "error",
      );
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

function buildSupportShell(user) {
  return `
    <main class="traveler-support-page">
      <section class="traveler-support-main">
        <header class="traveler-support-header">
          <h1>Support</h1>
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
              <span>Priority</span>
              <select class="traveler-support-select" name="priority">
                ${PRIORITY_OPTIONS.map((item) => `<option value="${item}" ${item === "MEDIUM" ? "selected" : ""}>${titleCase(item)}</option>`).join("")}
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
          <h2>Latest ticket</h2>
          <div id="latest-ticket" class="traveler-support-ticket-list">
            <div class="traveler-support-ticket">
              <div>
                <p class="traveler-support-ticket-title">No ticket created in this session</p>
                <div class="traveler-support-ticket-meta">Your submitted ticket response will appear here.</div>
              </div>
            </div>
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
              <span class="traveler-support-contact-meta">${escapeHtml(user?.email || "No email on profile")}</span>
            </div>
          </div>
        </section>
      </aside>
    </main>
  `;
}

function renderTicketCard(ticket) {
  return `
    <article class="traveler-support-ticket">
      <div>
        <p class="traveler-support-ticket-title">${escapeHtml(ticket.subject)}</p>
        <div class="traveler-support-ticket-meta">
          <span>${shortId(ticket.id)}</span>
          <span>${escapeHtml(ticket.category || "General")}</span>
          <span>${formatDate(ticket.createdAt)}</span>
        </div>
      </div>
      <div class="traveler-support-ticket-trailing">
        <span class="traveler-support-status ${(ticket.status || "OPEN").toLowerCase()}">${escapeHtml(ticket.status || "OPEN")}</span>
      </div>
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

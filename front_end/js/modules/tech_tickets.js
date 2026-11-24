/* ================================================================
   tech_tickets.js — 100% Client-side (localStorage)
================================================================ */
let tickets = [];
let activeStatus = "all";
let searchTerm = "";

export async function initTicketManagement() {
  ensureTicketShell();
  bindTicketEvents();
  await loadTickets();
}

async function loadTickets() {
  const tbody = document.getElementById("ticket-tbody");
  if (tbody) {
    tbody.innerHTML = tableMessage("Loading support tickets...");
  }

  try {
    tickets = fetchTickets();
    renderTickets();
  } catch (error) {
    console.error("Ticket fetch failed:", error);
    if (tbody) {
      tbody.innerHTML = tableMessage(
        error.message || "Unable to load tickets.",
      );
    }
  }
}

function fetchTickets() {
  try {
    return JSON.parse(localStorage.getItem("tickets") || "[]");
  } catch {
    return [];
  }
}

function resolveTicket(id, payload = {}) {
  const list = fetchTickets();
  const idx = list.findIndex((t) => String(t.id) === String(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], status: "RESOLVED", ...payload };
    localStorage.setItem("tickets", JSON.stringify(list));
    return list[idx];
  }
  return null;
}

function bindTicketEvents() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeStatus = button.dataset.status || "all";
      renderTickets();
    });
  });

  const search = document.getElementById("ticket-search");
  search?.addEventListener("input", () => {
    searchTerm = search.value.trim().toLowerCase();
    renderTickets();
  });

  const tbody = document.getElementById("ticket-tbody");
  tbody?.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const id = target.dataset.id;
    const ticket = tickets.find((item) => String(item.id) === String(id));
    if (!ticket) return;

    if (target.dataset.action === "view") {
      openTicketModal(ticket);
      return;
    }

    if (target.dataset.action === "resolve") {
      await resolveTicketFromUi(id);
    }
  });

  window.closeModal = closeTicketModal;
}

function renderTickets() {
  const tbody = document.getElementById("ticket-tbody");
  if (!tbody) return;

  const visible = tickets.filter((ticket) => {
    const statusMatch =
      activeStatus === "all" ||
      (activeStatus === "pending" && ticket.status === "OPEN") ||
      (activeStatus === "resolved" && ticket.status === "RESOLVED");

    const haystack = [
      ticket.id,
      ticket.travellerId,
      ticket.travellerName,
      ticket.subject,
      ticket.category,
      ticket.priority,
      ticket.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return statusMatch && (!searchTerm || haystack.includes(searchTerm));
  });

  if (!visible.length) {
    tbody.innerHTML = tableMessage("No tickets found for the selected filter.");
    return;
  }

  tbody.innerHTML = visible.map(renderTicketRow).join("");
}

function renderTicketRow(ticket) {
  const isResolved = ticket.status === "RESOLVED";
  return `
    <tr>
      <td><strong>${shortId(ticket.id)}</strong></td>
      <td>
        <div style="font-weight: 700;">${escapeHtml(ticket.travellerName || ticket.travellerId || "Traveller")}</div>
        <div style="font-size: 12px; color: #6b7280;">TRAVELLER</div>
      </td>
      <td>${escapeHtml(ticket.subject)}</td>
      <td><span class="status-badge ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority || "MEDIUM")}</span></td>
      <td><span class="status-badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td>
      <td>${escapeHtml(ticket.category || "General")}</td>
      <td style="text-align: right;">
        <button class="btn-outline-purple btn-small" data-action="view" data-id="${escapeHtml(ticket.id)}">View</button>
        ${
          isResolved
            ? ""
            : `<button class="btn-primary btn-small" data-action="resolve" data-id="${escapeHtml(ticket.id)}" style="margin-left: 8px;">Resolve</button>`
        }
      </td>
    </tr>
  `;
}

function openTicketModal(ticket) {
  const modal = document.getElementById("ticket-modal");
  const title = document.getElementById("modal-ticket-id");
  const body = document.getElementById("modal-body");
  const footer = document.getElementById("modal-footer");
  if (!modal || !title || !body || !footer) return;

  title.textContent = `Ticket ${shortId(ticket.id)}`;
  body.innerHTML = `
    <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
    <p><strong>Traveller:</strong> ${escapeHtml(ticket.travellerName || ticket.travellerId || "Traveller")}</p>
    <p><strong>Category:</strong> ${escapeHtml(ticket.category || "General")}</p>
    <p><strong>Priority:</strong> ${escapeHtml(ticket.priority || "MEDIUM")}</p>
    <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
    <p><strong>Created:</strong> ${formatDateTime(ticket.createdAt)}</p>
    <hr />
    <p>${escapeHtml(ticket.message)}</p>
    ${
      ticket.resolution
        ? `<p><strong>Resolution:</strong> ${escapeHtml(ticket.resolution)}</p>`
        : ""
    }
  `;
  footer.innerHTML =
    ticket.status === "RESOLVED"
      ? `<button class="btn-outline-purple" onclick="window.closeModal()">Close</button>`
      : `<button class="btn-primary" data-modal-resolve="${escapeHtml(ticket.id)}">Resolve Ticket</button>`;
  footer
    .querySelector("[data-modal-resolve]")
    ?.addEventListener("click", async () => {
      await resolveTicketFromUi(ticket.id);
      closeTicketModal();
    });
  modal.classList.add("active");
}

async function resolveTicketFromUi(id) {
  try {
    resolveTicket(id, {
      resolution: "Resolved by technical admin",
    });
    await loadTickets();
  } catch (error) {
    console.error("Ticket resolve failed:", error);
    alert(error.message || "Unable to resolve ticket.");
  }
}

function closeTicketModal() {
  document.getElementById("ticket-modal")?.classList.remove("active");
}

function ensureTicketShell() {
  if (document.getElementById("ticket-tbody")) return;

  const container = document.getElementById("main") || document.body;
  container.innerHTML = `
    <div class="page-wrapper">
      <div class="welcome">
        <h1 class="page-title">Ticket Management</h1>
        <p class="page-subtitle">Track and resolve system-wide support tickets and technical issues.</p>
      </div>
      <div class="internal-navbar">
        <button class="tab-btn active filter-btn" data-status="all">All Tickets</button>
        <button class="tab-btn filter-btn" data-status="pending">Pending</button>
        <button class="tab-btn filter-btn" data-status="resolved">Resolved</button>
      </div>
      <div class="card-header" style="margin-bottom: 20px;">
        <input id="ticket-search" placeholder="Search by ID, User, or Subject..." style="width: 100%; max-width: 420px; padding: 12px 16px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px;" />
      </div>
      <div class="content-card" style="padding: 0; overflow: hidden;">
        <table class="tour-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>User & Role</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Category</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="ticket-tbody"></tbody>
        </table>
      </div>
    </div>
    <div id="ticket-modal" class="modal-overlay">
      <div class="modal-content" style="width: 600px; height: auto;">
        <div class="modal-header">
          <h2 id="modal-ticket-id">Ticket Details</h2>
          <span class="close-btn" onclick="window.closeModal()">&times;</span>
        </div>
        <div id="modal-body" class="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    </div>
  `;
}

function tableMessage(message) {
  return `
    <tr>
      <td colspan="7" style="text-align: center; padding: 40px; color: #667085;">
        ${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function shortId(id = "") {
  return id ? `#${String(id).slice(0, 8)}` : "#ticket";
}

function statusClass(status = "") {
  return status === "RESOLVED" ? "status-completed" : "status-ongoing";
}

function priorityClass(priority = "") {
  if (priority === "HIGH") return "status-cancelled";
  if (priority === "LOW") return "status-completed";
  return "status-confirmed";
}

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

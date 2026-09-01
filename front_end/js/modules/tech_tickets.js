import { fetchTickets, resolveTicket } from "../api/services.js";

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
    tickets = await fetchTickets();
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
    const ticket = tickets.find((item) => item.id === id);
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
      (activeStatus === "resolved" && ticket.status === "RESOLVED") ||
      (activeStatus === "in-progress" && false);

    const haystack = [
      ticket.id,
      ticket.travellerId,
      ticket.travellerName,
      ticket.subject,
      ticket.category,
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
  const isResolved = ticket.status === "RESOLVED" || ticket.status === "resolved";
  const userRole = String(ticket.userRole || "TRAVELLER").toUpperCase();
  const userName = ticket.userName || ticket.travellerName || ticket.userId || "User";

  return `
    <tr>
      <td><strong>${shortId(ticket.id)}</strong></td>
      <td>
        <div style="font-weight: 700; color: #111827;">${escapeHtml(userName)}</div>
        <div style="font-size: 12px; color: #6b7280; font-weight: 600;">${escapeHtml(userRole)}</div>
      </td>
      <td>${escapeHtml(ticket.subject)}</td>
      <td><span class="status-badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status || "OPEN")}</span></td>
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

  const isResolved = ticket.status === "RESOLVED" || ticket.status === "resolved";
  const userRole = String(ticket.userRole || "TRAVELLER").toUpperCase();
  const userName = ticket.userName || ticket.travellerName || ticket.userId || "User";

  title.textContent = `Ticket Details - ${shortId(ticket.id)}`;
  body.innerHTML = `
    <div style="margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6;">
      <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 6px;">${escapeHtml(ticket.subject)}</h3>
      <div style="display: flex; gap: 15px; font-size: 13px; color: #6B7280; flex-wrap: wrap;">
        <span><strong>Author:</strong> ${escapeHtml(userName)} (${escapeHtml(userRole)})</span>
        <span><strong>User ID:</strong> ${escapeHtml(ticket.userId || ticket.travellerId || "N/A")}</span>
        <span><strong>Category:</strong> ${escapeHtml(ticket.category || "General")}</span>
        <span><strong>Status:</strong> ${escapeHtml(ticket.status || "OPEN")}</span>
      </div>
      <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Created on ${formatDateTime(ticket.createdAt)}</div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <label style="font-size: 13px; font-weight: 700; color: #374151; display: block; margin-bottom: 6px;">Reported Issue Description</label>
      <div style="background: #F9FAFB; padding: 14px; border-radius: 8px; color: #374151; font-size: 14px; line-height: 1.5; border: 1px solid #F3F4F6;">
        ${escapeHtml(ticket.message || ticket.description || "No message provided")}
      </div>
    </div>

    ${
      isResolved
        ? `
      <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 8px; color: #166534; font-size: 13px;">
        <strong style="display: block; margin-bottom: 4px;">✓ Technical Admin Resolution</strong>
        <p style="margin: 0; line-height: 1.4;">${escapeHtml(ticket.resolution || "Resolved by technical admin.")}</p>
        <div style="font-size: 11px; color: #4ADE80; margin-top: 6px;">Resolved on ${formatDateTime(ticket.resolvedAt || ticket.createdAt)} ${ticket.resolvedBy ? `by ${escapeHtml(ticket.resolvedBy)}` : ""}</div>
      </div>
    `
        : ""
    }
  `;

  footer.innerHTML = isResolved
    ? `<button class="btn-outline-purple" onclick="window.closeModal()">Close</button>`
    : `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 4px;">Resolution Notes for User</label>
          <textarea id="modal-resolution-input" placeholder="Provide details on the resolution, fix applied, or steps taken..." style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 13px; min-height: 70px; resize: vertical;">Issue investigated and resolved by technical admin.</textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn-outline-purple" onclick="window.closeModal()">Cancel</button>
          <button class="btn-primary" data-modal-resolve="${escapeHtml(ticket.id)}" style="background: #10B981; border-color: #10B981;">Mark as Resolved</button>
        </div>
      </div>
    `;

  footer
    .querySelector("[data-modal-resolve]")
    ?.addEventListener("click", async () => {
      const resInput = document.getElementById("modal-resolution-input");
      const resolution = resInput?.value?.trim() || "Issue resolved by technical admin.";
      await resolveTicketFromUi(ticket.id, resolution);
      closeTicketModal();
    });

  modal.classList.add("active");
}

async function resolveTicketFromUi(id, customResolution) {
  try {
    await resolveTicket(id, {
      resolution: customResolution || "Resolved by technical admin",
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
      <td colspan="6" style="text-align: center; padding: 40px; color: #667085;">
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

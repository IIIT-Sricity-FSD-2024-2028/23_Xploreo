/**
 * adminManagement.js
 * Xploreo — Super Admin: Admin Management Page
 *
 * Manages Technical and Non-Technical admins.
 * Uses the existing Auth store as the source of truth (role: techadmin | nontechadmin).
 * Reuses existing shared.css design tokens: .stat-card, .tour-table, .content-card,
 * .modal-overlay, .crud-btn, .crud-primary, .crud-danger, .status-badge, etc.
 *
 * Actions dropdown:
 *  - Single body-level fixed dropdown (immune to table/card overflow clipping and z-index issues)
 *  - Viewport-relative positioning with auto-flip (opens upwards if near bottom of screen)
 *  - Explicit event listeners with stopPropagation to prevent immediate auto-close
 *  - Single global document click listener to close dropdown on outside clicks
 *  - Clicking trigger button again closes/toggles dropdown
 *  - Selecting any action closes dropdown before opening the appropriate modal
 *  - View Details modal
 *  - Edit Admin modal
 *  - Activate / Deactivate status confirmation modal (no window.confirm/alerts)
 *  - Reset Password modal (calls PATCH /auth/users/:id)
 *  - Delete confirmation modal (calls DELETE /auth/users/:id)
 */

import { fetchAdmins, registerWithApi, updateUser, deleteUser, toggleHighLevelAdmin } from "../api/services.js";
import { getCurrentUser } from "../api/session.js";

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────

const ALLOWED_LOCATIONS = ["Jaipur", "Goa", "Delhi", "Mumbai", "Kerala"];

const ADMIN_TYPES = {
  superadmin: { label: "Super Admin", badgeClass: "badge-super" },
  techadmin: { label: "Technical", badgeClass: "badge-tech" },
  nontechadmin: { label: "Non-Technical", badgeClass: "badge-nontech" },
};

// ─────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────

let allAdmins = [];
let filteredAdmins = [];

let isSuperAdmin = false;
let isHighLevelTechAdmin = false;

let editingAdminId = null;

let deletingAdminId = null;
let deletingAdminName = "";

let statusTargetAdminId = null;
let statusTargetNewStatus = "";
let statusTargetAdminName = "";

let resetPasswordAdminId = null;

let filterType = "all";
let filterStatus = "all";
let searchQuery = "";

// Single shared dropdown element appended to document.body
let dropdownEl = null;
let globalClickListenerAdded = false;
let currentTriggerBtn = null;

// ─────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────

export async function initAdminManagement(passedUser) {
  // Frontend role guard: Super Admin OR High-Level Tech Admin
  const currentUser = passedUser || getCurrentUser();
  const normalizedRole = (currentUser?.role || "").toLowerCase().replace(/_/g, "");
  isSuperAdmin = normalizedRole === "superadmin";
  isHighLevelTechAdmin =
    (normalizedRole === "techadmin" || normalizedRole === "tech_admin") &&
    Boolean(currentUser?.isHighLevelAdmin);

  if (!isSuperAdmin && !isHighLevelTechAdmin) {
    const main = document.getElementById("main");
    if (main) {
      main.innerHTML = `
        <div class="content-card" style="text-align:center; padding: 60px 40px; margin-top: 40px;">
          <h2 style="color:#dc2626; margin-bottom: 12px;">Access Denied</h2>
          <p style="color:#6b7280;">Only Super Admins and authorized High-Level Technical Admins can access Admin Management.</p>
        </div>`;
      main.style.display = "block";
    }
    return;
  }

  createBodyDropdown();
  renderPageShell();
  wireModals();
  registerGlobalClickListener();
  await loadAdmins();
}

// ─────────────────────────────────────────────────────
// Body-level dropdown (immune to table overflow/stacking)
// ─────────────────────────────────────────────────────

function createBodyDropdown() {
  const existing = document.getElementById("am-global-dropdown");
  if (existing) existing.remove();

  dropdownEl = document.createElement("div");
  dropdownEl.id = "am-global-dropdown";
  dropdownEl.style.cssText = `
    position: fixed;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.14);
    min-width: 185px;
    z-index: 9999;
    display: none;
    overflow: hidden;
  `;
  document.body.appendChild(dropdownEl);
}

function showDropdown(triggerBtn, adminId, adminStatus, adminRole, isTargetHighLevel) {
  if (!dropdownEl) return;

  const isOpen = dropdownEl.style.display === "block" && currentTriggerBtn === triggerBtn;

  // Toggle: if same button clicked while open, close it
  if (isOpen) {
    hideDropdown();
    return;
  }

  currentTriggerBtn = triggerBtn;
  const isActive = adminStatus === "active";
  const canToggleHl = isSuperAdmin && adminRole === "techadmin";

  let itemsHtml = `
    <button class="am-dropdown-item" data-action="view" data-id="${adminId}">
      <span>👁</span> View Details
    </button>
    <button class="am-dropdown-item" data-action="edit" data-id="${adminId}">
      <span>✏️</span> Edit
    </button>
  `;

  if (canToggleHl) {
    itemsHtml += `
      <div class="am-dropdown-divider"></div>
      <button class="am-dropdown-item" data-action="toggle-high-level" data-id="${adminId}" data-target-hl="${isTargetHighLevel ? "false" : "true"}">
        <span>⭐</span> ${isTargetHighLevel ? "Revoke High-Level" : "Grant High-Level"}
      </button>
    `;
  }

  itemsHtml += `
    <div class="am-dropdown-divider"></div>
    <button class="am-dropdown-item" data-action="toggle-status" data-id="${adminId}" data-status="${adminStatus}">
      <span>${isActive ? "🔴" : "🟢"}</span> ${isActive ? "Deactivate" : "Activate"}
    </button>
    <button class="am-dropdown-item" data-action="reset-password" data-id="${adminId}">
      <span>🔑</span> Reset Password
    </button>
    <div class="am-dropdown-divider"></div>
    <button class="am-dropdown-item danger" data-action="delete" data-id="${adminId}">
      <span>🗑</span> Delete
    </button>
  `;

  dropdownEl.innerHTML = itemsHtml;

  // Attach click listeners to menu items
  dropdownEl.querySelectorAll(".am-dropdown-item[data-action]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const id = item.dataset.id;
      const targetHl = item.dataset.targetHl;
      hideDropdown();
      handleDropdownAction(action, id, targetHl);
    });
  });

  // Calculate position relative to viewport (fixed positioning)
  const rect = triggerBtn.getBoundingClientRect();
  const dropdownWidth = 195;
  const dropdownHeight = canToggleHl ? 260 : 220;

  // Horizontal placement: align right edge with button right edge, fallback to left
  const spaceRight = window.innerWidth - rect.right;
  let left = spaceRight >= dropdownWidth ? rect.left : rect.right - dropdownWidth;
  if (left < 8) left = 8;

  // Vertical placement: flip upwards if tight below
  const spaceBelow = window.innerHeight - rect.bottom;
  let top = rect.bottom + 4;
  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
    top = rect.top - dropdownHeight - 4;
  }

  dropdownEl.style.top = `${top}px`;
  dropdownEl.style.left = `${left}px`;
  dropdownEl.style.display = "block";
}

function hideDropdown() {
  if (dropdownEl) {
    dropdownEl.style.display = "none";
  }
  currentTriggerBtn = null;
}

function registerGlobalClickListener() {
  if (globalClickListenerAdded) return;
  globalClickListenerAdded = true;

  document.addEventListener("click", (e) => {
    if (!dropdownEl || dropdownEl.style.display !== "block") return;
    if (!dropdownEl.contains(e.target) && e.target !== currentTriggerBtn) {
      hideDropdown();
    }
  });

  window.addEventListener("scroll", () => hideDropdown(), { passive: true });
}

// ─────────────────────────────────────────────────────
// Dropdown Action Handler
// ─────────────────────────────────────────────────────

function handleDropdownAction(action, adminId, targetHl) {
  const admin = allAdmins.find((a) => a.userId === adminId);
  if (!admin && action !== "delete") {
    showToast("Admin not found. Please refresh the page.", "error");
    return;
  }

  switch (action) {
    case "view":
      openViewModal(admin);
      break;
    case "edit":
      openEditModal(admin);
      break;
    case "toggle-high-level":
      handleToggleHighLevel(admin.userId, targetHl === "true", admin.name || admin.username);
      break;
    case "toggle-status":
      openStatusModal(admin);
      break;
    case "reset-password":
      openResetPasswordModal(admin);
      break;
    case "delete": {
      const name = admin?.name || admin?.username || adminId;
      openDeleteConfirm(adminId, name);
      break;
    }
  }
}

// ─────────────────────────────────────────────────────
// High-Level Tech Admin Privilege Toggle
// ─────────────────────────────────────────────────────

async function handleToggleHighLevel(adminId, newStatus, adminName) {
  if (!isSuperAdmin) {
    showToast("Only Super Admins can alter High-Level Admin privileges.", "error");
    return;
  }

  try {
    await toggleHighLevelAdmin(adminId, newStatus);
    const idx = allAdmins.findIndex((a) => a.userId === adminId);
    if (idx !== -1) {
      allAdmins[idx] = { ...allAdmins[idx], isHighLevelAdmin: newStatus };
    }
    applyFiltersAndRender();
    renderStatCards();
    showToast(
      newStatus
        ? `⭐ "${adminName}" has been granted High-Level Tech Admin privileges!`
        : `"${adminName}" is now a Standard Technical Admin.`,
      "success"
    );
  } catch (err) {
    console.error("Failed to toggle High-Level Admin status:", err);
    showToast(`Failed to update privileges: ${err.message || "Unknown error"}`, "error");
  }
}

// ─────────────────────────────────────────────────────
// Page Shell
// ─────────────────────────────────────────────────────

function renderPageShell() {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = `
    <!-- PAGE HEADER -->
    <div class="admin-mgmt-header">
      <div>
        <h1 class="page-title" style="margin-bottom: 4px;">Admin Management</h1>
        <p class="page-subtitle">${
          isSuperAdmin
            ? "Manage technical and non-technical administrators, grant or revoke high-level privileges."
            : "High-Level Technical Admin Console: Manage administrators and platform operations (Super Admins are protected)."
        }</p>
      </div>
      <button class="crud-btn crud-primary" id="am-add-btn" style="height: 42px; padding: 0 20px; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
        <span style="font-size: 18px; line-height: 1;">+</span> Add Admin
      </button>
    </div>

    <!-- STAT CARDS -->
    <div class="stats-grid" id="am-stats" style="grid-template-columns: repeat(4, 1fr);">
      ${renderStatCardSkeletons()}
    </div>

    <!-- FILTERS ROW -->
    <div class="content-card" style="padding: 16px 20px;">
      <div class="am-toolbar">
        <div class="am-search-wrap">
          <input
            type="text"
            id="am-search"
            placeholder="Search by name or email..."
            style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s;"
            onfocus="this.style.borderColor='#2563eb'"
            onblur="this.style.borderColor='#e5e7eb'"
          />
        </div>
        <div class="am-filter-group">
          <label class="am-filter-label">Type</label>
          <div class="internal-navbar" style="border-bottom: none; gap: 0; margin: 0; padding: 0;">
            <button class="tab-btn am-type-btn active" data-type="all" style="padding: 8px 14px;">All</button>
            <button class="tab-btn am-type-btn" data-type="techadmin" style="padding: 8px 14px;">Technical</button>
            <button class="tab-btn am-type-btn" data-type="highlevel" style="padding: 8px 14px;">⭐ High-Level</button>
            <button class="tab-btn am-type-btn" data-type="nontechadmin" style="padding: 8px 14px;">Non-Technical</button>
          </div>
        </div>
        <div class="am-filter-group">
          <label class="am-filter-label">Status</label>
          <div class="internal-navbar" style="border-bottom: none; gap: 0; margin: 0; padding: 0;">
            <button class="tab-btn am-status-btn active" data-status="all" style="padding: 8px 14px;">All</button>
            <button class="tab-btn am-status-btn" data-status="active" style="padding: 8px 14px;">Active</button>
            <button class="tab-btn am-status-btn" data-status="inactive" style="padding: 8px 14px;">Inactive</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADMIN TABLE CONTAINER -->
    <div class="content-card" style="padding: 0;">
      <div id="am-table-wrap">
        ${renderTableLoading()}
      </div>
    </div>

    <!-- INLINE STYLES -->
    <style>
      .admin-mgmt-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .am-toolbar {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      .am-search-wrap {
        flex: 1;
        min-width: 220px;
        max-width: 340px;
      }
      .am-filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .am-filter-label {
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
        white-space: nowrap;
      }
      .am-admin-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .am-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
      }
      .am-avatar-super { background: #e0e7ff; color: #3730a3; }
      .am-avatar-tech { background: #ede9fe; color: #6d28d9; }
      .am-avatar-nontech { background: #fff7ed; color: #c2410c; }
      .am-name { font-weight: 600; font-size: 14px; color: #111827; }
      .am-email { font-size: 12px; color: #6b7280; }
      .badge-super {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #e0e7ff;
        color: #3730a3;
      }
      .badge-super-crown {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .badge-protected {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }
      .badge-hl-active {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .badge-hl-inactive {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        background: #f3f4f6;
        color: #6b7280;
      }
      .am-hl-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
        font-family: inherit;
      }
      .am-hl-toggle-btn.hl-active {
        background: #ecfdf5;
        color: #065f46;
        border-color: #a7f3d0;
      }
      .am-hl-toggle-btn.hl-active:hover {
        background: #fef2f2;
        color: #991b1b;
        border-color: #fecaca;
      }
      .am-hl-toggle-btn.hl-inactive {
        background: #f8fafc;
        color: #475569;
        border-color: #cbd5e1;
      }
      .am-hl-toggle-btn.hl-inactive:hover {
        background: #eff6ff;
        color: #1d4ed8;
        border-color: #93c5fd;
      }
      .badge-tech {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #ede9fe;
        color: #5b21b6;
      }
      .badge-nontech {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #fff7ed;
        color: #c2410c;
      }
      .badge-active {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #dcfce7;
        color: #15803d;
      }
      .badge-inactive {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #f1f5f9;
        color: #64748b;
      }
      /* Actions button */
      .am-action-trigger {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 6px 14px;
        cursor: pointer;
        font-size: 13px;
        color: #374151;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s;
        white-space: nowrap;
      }
      .am-action-trigger:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }
      /* Dropdown item styles */
      .am-dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        font-size: 14px;
        cursor: pointer;
        color: #374151;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        transition: background 0.15s;
        font-family: inherit;
      }
      .am-dropdown-item:hover { background: #f9fafb; }
      .am-dropdown-item.danger { color: #dc2626; }
      .am-dropdown-item.danger:hover { background: #fef2f2; }
      .am-dropdown-divider { height: 1px; background: #f3f4f6; margin: 4px 0; }
      /* Empty / loading / error */
      .am-empty-state {
        text-align: center;
        padding: 60px 24px;
        color: #6b7280;
      }
      .am-empty-state h3 { margin: 0 0 8px; font-size: 18px; color: #374151; }
      .am-loading { text-align: center; padding: 60px 24px; color: #9ca3af; font-size: 14px; }
      .am-error { text-align: center; padding: 60px 24px; }
      .am-error p { color: #dc2626; margin: 0 0 12px; }
      /* Form grid */
      .am-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .am-form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .am-form-field label {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }
      .am-form-field input,
      .am-form-field select {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        color: #111827;
        outline: none;
        transition: border-color 0.2s;
      }
      .am-form-field input:focus,
      .am-form-field select:focus { border-color: #2563eb; }
      .am-form-full { grid-column: 1 / -1; }
      .am-form-error {
        color: #dc2626;
        font-size: 13px;
        margin: 0 0 12px;
        padding: 10px 14px;
        background: #fef2f2;
        border-radius: 8px;
        display: none;
      }
      .am-form-error.visible { display: block; }
      .am-form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
        padding-top: 16px;
        border-top: 1px solid #f3f4f6;
      }
      /* View modal details grid */
      .am-view-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .am-view-item label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #9ca3af;
        margin-bottom: 4px;
      }
      .am-view-item span {
        font-size: 15px;
        color: #111827;
        font-weight: 500;
      }
      @media (max-width: 768px) {
        .am-toolbar { flex-direction: column; align-items: stretch; }
        .am-search-wrap { max-width: 100%; }
        .am-form-grid { grid-template-columns: 1fr; }
        .am-view-grid { grid-template-columns: 1fr; }
        .admin-mgmt-header { flex-direction: column; }
      }
      @media (max-width: 480px) {
        .am-filter-group { flex-direction: column; align-items: flex-start; gap: 4px; }
      }
    </style>
  `;

  // Wire filter buttons
  document.querySelectorAll(".am-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".am-type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterType = btn.dataset.type;
      applyFiltersAndRender();
    });
  });

  document.querySelectorAll(".am-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".am-status-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterStatus = btn.dataset.status;
      applyFiltersAndRender();
    });
  });

  const searchInput = document.getElementById("am-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFiltersAndRender();
    });
  }

  const addBtn = document.getElementById("am-add-btn");
  if (addBtn) addBtn.addEventListener("click", openAddModal);
}

// ─────────────────────────────────────────────────────
// Data Loading
// ─────────────────────────────────────────────────────

async function loadAdmins() {
  try {
    allAdmins = await fetchAdmins();
    applyFiltersAndRender();
    renderStatCards();
  } catch (err) {
    console.error("Admin Management: failed to load admins", err);
    const tableWrap = document.getElementById("am-table-wrap");
    if (tableWrap) {
      tableWrap.innerHTML = `
        <div class="am-error">
          <p>Failed to load admins: ${err.message || "Unknown error"}</p>
          <button class="crud-btn crud-primary" onclick="location.reload()">Retry</button>
        </div>`;
    }
    renderStatCards(true);
  }
}

// ─────────────────────────────────────────────────────
// Stat Cards
// ─────────────────────────────────────────────────────

function renderStatCardSkeletons() {
  const cards = [
    { label: "TOTAL ADMINS", color: "blue" },
    { label: "TECHNICAL ADMINS", color: "violet" },
    { label: "NON-TECHNICAL ADMINS", color: "orange" },
    { label: "ACTIVE ADMINS", color: "dark-green" },
  ];
  return cards.map((c) => `
    <div class="stat-card ${c.color}">
      <p class="stat-label">${c.label}</p>
      <h2 class="stat-value" style="color:#d1d5db;">—</h2>
    </div>
  `).join("");
}

function renderStatCards(error = false) {
  const container = document.getElementById("am-stats");
  if (!container) return;

  const techAdmins = allAdmins.filter((a) => a.role === "techadmin");
  const hlTechAdmins = allAdmins.filter((a) => a.role === "techadmin" && Boolean(a.isHighLevelAdmin));
  const nonTechAdmins = allAdmins.filter((a) => a.role === "nontechadmin");
  const activeAdmins = allAdmins.filter((a) => a.status === "active");

  const cards = [
    { label: "TOTAL ADMINS", value: error ? "—" : allAdmins.length, color: "blue", icon: "../components/ui/users.png" },
    {
      label: "TECHNICAL ADMINS",
      value: error ? "—" : `${techAdmins.length}`,
      subtext: `${hlTechAdmins.length} High-Level`,
      color: "violet",
      icon: "../components/ui/system.png",
    },
    { label: "NON-TECHNICAL ADMINS", value: error ? "—" : nonTechAdmins.length, color: "orange", icon: "../components/ui/operations.png" },
    { label: "ACTIVE ADMINS", value: error ? "—" : activeAdmins.length, color: "dark-green", icon: "../components/ui/users.png" },
  ];

  container.innerHTML = cards.map((c) => `
    <div class="stat-card ${c.color}">
      <div class="card-icon">
        <img src="${c.icon}" alt="" style="width:24px;height:24px;object-fit:contain;opacity:0.75;">
      </div>
      <p class="stat-label">${c.label}</p>
      <h2 class="stat-value">${c.value} ${c.subtext ? `<span style="font-size:12px; font-weight:600; color:#7c3aed; background:#ede9fe; padding:2px 8px; border-radius:12px; vertical-align:middle; margin-left:6px;">${c.subtext}</span>` : ""}</h2>
    </div>
  `).join("");
}

// ─────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────

function applyFiltersAndRender() {
  filteredAdmins = allAdmins.filter((admin) => {
    let matchType = false;
    if (filterType === "all") {
      matchType = true;
    } else if (filterType === "highlevel") {
      matchType = admin.role === "techadmin" && Boolean(admin.isHighLevelAdmin);
    } else {
      matchType = admin.role === filterType;
    }

    const matchStatus = filterStatus === "all" || admin.status === filterStatus;
    const matchSearch = !searchQuery
      || (admin.name     || "").toLowerCase().includes(searchQuery)
      || (admin.email    || "").toLowerCase().includes(searchQuery)
      || (admin.username || "").toLowerCase().includes(searchQuery);
    return matchType && matchStatus && matchSearch;
  });
  renderTable();
}

// ─────────────────────────────────────────────────────
// Table Rendering & Event Wiring
// ─────────────────────────────────────────────────────

function renderTableLoading() {
  return `<div class="am-loading">Loading admins…</div>`;
}

function renderTable() {
  const wrap = document.getElementById("am-table-wrap");
  if (!wrap) return;

  hideDropdown();

  if (filteredAdmins.length === 0) {
    wrap.innerHTML = `
      <div class="am-empty-state">
        <div style="font-size:40px; margin-bottom:12px;">👤</div>
        <h3>${searchQuery || filterType !== "all" || filterStatus !== "all"
          ? "No admins match your filters"
          : "No admins yet"}</h3>
        <p style="margin: 0;">${searchQuery || filterType !== "all" || filterStatus !== "all"
          ? "Try adjusting your search or filters."
          : 'Click "+ Add Admin" to create your first admin.'}</p>
      </div>`;
    return;
  }

  const rows = filteredAdmins.map((admin) => {
    const initials  = getInitials(admin.name);
    const typeInfo  = ADMIN_TYPES[admin.role] || { label: admin.role, badgeClass: "badge-nontech" };
    const isActive  = admin.status === "active";
    const avatarCls = admin.role === "techadmin"
      ? "am-avatar-tech"
      : admin.role === "superadmin"
      ? "am-avatar-super"
      : "am-avatar-nontech";

    const isTargetSuper = admin.role === "superadmin";
    const isTargetTech = admin.role === "techadmin";
    const isTargetHighLevel = Boolean(admin.isHighLevelAdmin);

    let hlCellHtml = `<span style="color:#9ca3af; font-size:13px;">—</span>`;
    if (isTargetSuper) {
      hlCellHtml = `<span class="badge-super-crown">👑 Super Admin</span>`;
    } else if (isTargetTech) {
      if (isSuperAdmin) {
        // Super Admin gets an interactive toggle button
        hlCellHtml = `
          <button
            class="am-hl-toggle-btn ${isTargetHighLevel ? "hl-active" : "hl-inactive"}"
            data-admin-id="${escHtml(admin.userId)}"
            data-admin-name="${escHtml(admin.name || admin.username)}"
            data-new-hl="${isTargetHighLevel ? "false" : "true"}"
            title="${isTargetHighLevel ? "Click to revoke High-Level Admin privileges" : "Click to grant High-Level Admin privileges"}"
          >
            ${isTargetHighLevel ? "⭐ High-Level (Enabled)" : "⚪ Standard (Disabled)"}
          </button>
        `;
      } else {
        // High-Level Tech Admin gets a clear read-only badge
        hlCellHtml = isTargetHighLevel
          ? `<span class="badge-hl-active">⭐ High-Level</span>`
          : `<span class="badge-hl-inactive">Standard</span>`;
      }
    }

    let actionsCellHtml = "";
    if (isTargetSuper && !isSuperAdmin) {
      // High-Level Tech Admin cannot manage Super Admin
      actionsCellHtml = `<span class="badge-protected" title="Super Admin is protected and cannot be modified by technical admins">🔒 Protected</span>`;
    } else {
      actionsCellHtml = `
        <button
          class="am-action-trigger"
          data-admin-id="${escHtml(admin.userId)}"
          data-admin-status="${escHtml(admin.status)}"
          data-admin-role="${escHtml(admin.role)}"
          data-admin-hl="${isTargetHighLevel ? "true" : "false"}"
        >
          Actions ▾
        </button>
      `;
    }

    return `
      <tr>
        <td>
          <div class="am-admin-cell">
            <div class="am-avatar ${avatarCls}">${initials}</div>
            <div>
              <div class="am-name">${escHtml(admin.name || admin.username || "—")}</div>
              <div class="am-email">${escHtml(admin.email || "—")}</div>
            </div>
          </div>
        </td>
        <td><span class="${typeInfo.badgeClass}">${typeInfo.label}</span></td>
        <td>${hlCellHtml}</td>
        <td>
          <span class="${isActive ? "badge-active" : "badge-inactive"}">
            ${isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td style="color:#4b5563; font-size:14px;">${escHtml(admin.location || "—")}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${actionsCellHtml}
        </td>
      </tr>
    `;
  }).join("");

  wrap.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="tour-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Type</th>
            <th>High-Level Privileges</th>
            <th>Status</th>
            <th>Location</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  // Wire click listener to each Actions trigger button
  wrap.querySelectorAll(".am-action-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const adminId          = btn.dataset.adminId;
      const adminStatus      = btn.dataset.adminStatus;
      const adminRole        = btn.dataset.adminRole;
      const isTargetHighLevel = btn.dataset.adminHl === "true";
      showDropdown(btn, adminId, adminStatus, adminRole, isTargetHighLevel);
    });
  });

  // Wire click listener to High-Level toggle buttons (for Super Admin)
  wrap.querySelectorAll(".am-hl-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const adminId   = btn.dataset.adminId;
      const adminName = btn.dataset.adminName;
      const newHl     = btn.dataset.newHl === "true";
      btn.disabled = true;
      btn.textContent = "Updating…";
      await handleToggleHighLevel(adminId, newHl, adminName);
    });
  });
}

// ─────────────────────────────────────────────────────
// Action: Activate / Deactivate (Modal Confirmation)
// ─────────────────────────────────────────────────────

function openStatusModal(admin) {
  if (admin.role === "superadmin" && !isSuperAdmin) {
    showToast("Super Admin status cannot be altered.", "error");
    return;
  }

  statusTargetAdminId = admin.userId;
  statusTargetNewStatus = admin.status === "active" ? "inactive" : "active";
  statusTargetAdminName = admin.name || admin.username || admin.userId;

  const isDeactivating = statusTargetNewStatus === "inactive";
  const titleEl = document.getElementById("admin-status-modal-title");
  const msgEl = document.getElementById("admin-status-msg");
  const confirmBtn = document.getElementById("admin-status-confirm");

  if (titleEl) {
    titleEl.textContent = isDeactivating ? "Deactivate Admin" : "Activate Admin";
  }
  if (msgEl) {
    msgEl.textContent = `Are you sure you want to ${isDeactivating ? "deactivate" : "activate"} "${statusTargetAdminName}"?`;
  }
  if (confirmBtn) {
    confirmBtn.textContent = isDeactivating ? "Deactivate Admin" : "Activate Admin";
    confirmBtn.style.background = isDeactivating ? "#dc2626" : "#2563eb";
    confirmBtn.style.color = "#ffffff";
    confirmBtn.disabled = false;
  }

  openModal("admin-status-modal");
}

async function handleStatusConfirm() {
  if (!statusTargetAdminId) return;

  const confirmBtn = document.getElementById("admin-status-confirm");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Updating…";
  }

  try {
    await updateUser(statusTargetAdminId, { status: statusTargetNewStatus });
    const idx = allAdmins.findIndex((a) => a.userId === statusTargetAdminId);
    if (idx !== -1) {
      allAdmins[idx] = { ...allAdmins[idx], status: statusTargetNewStatus };
    }
    closeModal("admin-status-modal");
    applyFiltersAndRender();
    renderStatCards();
    showToast(
      `${statusTargetAdminName} has been ${statusTargetNewStatus === "active" ? "activated" : "deactivated"}.`,
      "success"
    );
    statusTargetAdminId = null;
    statusTargetNewStatus = "";
    statusTargetAdminName = "";
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, "error");
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm";
    }
  }
}

// ─────────────────────────────────────────────────────
// Action: Delete (Modal Confirmation)
// ─────────────────────────────────────────────────────

function openDeleteConfirm(adminId, adminName) {
  const target = allAdmins.find((a) => a.userId === adminId);
  if (target?.role === "superadmin" && !isSuperAdmin) {
    showToast("Super Admin accounts cannot be deleted by technical admins.", "error");
    return;
  }

  deletingAdminId   = adminId;
  deletingAdminName = adminName;
  const msgEl = document.getElementById("admin-delete-msg");
  if (msgEl) {
    msgEl.textContent = `Are you sure you want to delete "${adminName}"? This action cannot be undone.`;
  }
  const confirmBtn = document.getElementById("admin-delete-confirm");
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Delete Admin";
  }
  openModal("admin-delete-modal");
}

async function handleDeleteConfirm() {
  if (!deletingAdminId) return;

  const confirmBtn = document.getElementById("admin-delete-confirm");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";
  }

  try {
    await deleteUser(deletingAdminId);
    allAdmins = allAdmins.filter((a) => a.userId !== deletingAdminId);
    closeModal("admin-delete-modal");
    applyFiltersAndRender();
    renderStatCards();
    showToast(`${deletingAdminName} has been deleted.`, "success");
    deletingAdminId   = null;
    deletingAdminName = "";
  } catch (err) {
    showToast(`Failed to delete: ${err.message}`, "error");
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Delete Admin";
    }
  }
}

// ─────────────────────────────────────────────────────
// Action: Reset Password
// Calls PATCH /auth/users/:id with { password: newPassword }
// ─────────────────────────────────────────────────────

function openResetPasswordModal(admin) {
  if (admin.role === "superadmin" && !isSuperAdmin) {
    showToast("Super Admin passwords cannot be reset by technical admins.", "error");
    return;
  }

  resetPasswordAdminId = admin.userId;

  const descEl = document.getElementById("admin-reset-desc");
  if (descEl) {
    descEl.textContent = `Set a new password for "${admin.name || admin.username}".`;
  }

  const pwInput = document.getElementById("am-reset-password");
  if (pwInput) pwInput.value = "";

  const errEl = document.getElementById("am-reset-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }

  const confirmBtn = document.getElementById("admin-reset-confirm");
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Reset Password";
  }

  openModal("admin-reset-modal");
}

async function handleResetPasswordConfirm() {
  if (!resetPasswordAdminId) return;

  const pwInput   = document.getElementById("am-reset-password");
  const errEl     = document.getElementById("am-reset-error");
  const confirmBtn = document.getElementById("admin-reset-confirm");
  const newPassword = (pwInput?.value || "").trim();

  if (!newPassword || newPassword.length < 6) {
    if (errEl) {
      errEl.textContent = "Password must be at least 6 characters.";
      errEl.classList.add("visible");
    }
    return;
  }
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Resetting…";
  }

  try {
    await updateUser(resetPasswordAdminId, { password: newPassword });
    closeModal("admin-reset-modal");
    showToast("Password has been reset successfully.", "success");
    resetPasswordAdminId = null;
  } catch (err) {
    if (errEl) {
      errEl.textContent = `Failed: ${err.message}`;
      errEl.classList.add("visible");
    }
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Reset Password";
    }
  }
}

// ─────────────────────────────────────────────────────
// Modals Wiring
// ─────────────────────────────────────────────────────

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function wireModals() {
  // Add / Edit form modal
  safeOn("admin-modal-close", "click", () => closeModal("admin-form-modal"));

  // View modal
  safeOn("admin-view-close", "click", () => closeModal("admin-view-modal"));

  // Delete modal
  safeOn("admin-delete-close", "click", () => closeModal("admin-delete-modal"));
  safeOn("admin-delete-cancel", "click", () => closeModal("admin-delete-modal"));
  safeOn("admin-delete-confirm", "click", handleDeleteConfirm);

  // Status modal
  safeOn("admin-status-close", "click", () => closeModal("admin-status-modal"));
  safeOn("admin-status-cancel", "click", () => closeModal("admin-status-modal"));
  safeOn("admin-status-confirm", "click", handleStatusConfirm);

  // Reset Password modal
  safeOn("admin-reset-close", "click", () => closeModal("admin-reset-modal"));
  safeOn("admin-reset-cancel", "click", () => closeModal("admin-reset-modal"));
  safeOn("admin-reset-confirm", "click", handleResetPasswordConfirm);

  // Close any modal by clicking its backdrop
  [
    "admin-form-modal",
    "admin-delete-modal",
    "admin-view-modal",
    "admin-status-modal",
    "admin-reset-modal",
  ].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(id);
      });
    }
  });
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// ─────────────────────────────────────────────────────
// View Admin Modal
// ─────────────────────────────────────────────────────

function openViewModal(admin) {
  const body = document.getElementById("admin-view-body");
  if (!body) return;

  const typeInfo = ADMIN_TYPES[admin.role] || { label: admin.role, badgeClass: "badge-nontech" };
  const isActive = admin.status === "active";
  const isTargetSuper = admin.role === "superadmin";
  const isTargetTech = admin.role === "techadmin";
  const canEdit = isSuperAdmin || !isTargetSuper;

  body.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
      <div class="am-avatar ${isTargetTech ? "am-avatar-tech" : (isTargetSuper ? "am-avatar-super" : "am-avatar-nontech")}" style="width: 56px; height: 56px; font-size: 20px;">
        ${getInitials(admin.name)}
      </div>
      <div>
        <div style="font-size: 20px; font-weight: 700; color: #111827;">${escHtml(admin.name || admin.username)}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 2px;">${escHtml(admin.email || "—")}</div>
        <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
          <span class="${typeInfo.badgeClass}">${typeInfo.label}</span>
          <span class="${isActive ? "badge-active" : "badge-inactive"}">${isActive ? "Active" : "Inactive"}</span>
          ${isTargetSuper ? `<span class="badge-super-crown">👑 Super Admin</span>` : ""}
          ${isTargetTech && admin.isHighLevelAdmin ? `<span class="badge-hl-active">⭐ High-Level Admin</span>` : ""}
        </div>
      </div>
    </div>
    <div class="am-view-grid">
      <div class="am-view-item">
        <label>User ID</label>
        <span>${escHtml(admin.userId || "—")}</span>
      </div>
      <div class="am-view-item">
        <label>Username</label>
        <span>${escHtml(admin.username || "—")}</span>
      </div>
      <div class="am-view-item">
        <label>Phone</label>
        <span>${escHtml(admin.phone || "—")}</span>
      </div>
      <div class="am-view-item">
        <label>Location</label>
        <span>${escHtml(admin.location || "—")}</span>
      </div>
      ${isTargetTech ? `
      <div class="am-view-item" style="grid-column: 1 / -1;">
        <label>High-Level Technical Privileges</label>
        <span>${admin.isHighLevelAdmin ? "⭐ Enabled — Has admin management powers (except Super Admin)." : "⚪ Disabled — Standard technical administrator (flag = 0)."}</span>
      </div>
      ` : ""}
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #f3f4f6;">
      <button class="crud-btn" id="am-view-close-btn">Close</button>
      ${canEdit ? `<button class="crud-btn crud-primary" id="am-view-edit-btn">Edit Admin</button>` : `<span class="badge-protected" style="align-self:center;">🔒 Protected Super Admin</span>`}
    </div>
  `;

  safeOn("am-view-close-btn", "click", () => closeModal("admin-view-modal"));
  if (canEdit) {
    safeOn("am-view-edit-btn", "click", () => {
      closeModal("admin-view-modal");
      openEditModal(admin);
    });
  }

  openModal("admin-view-modal");
}

// ─────────────────────────────────────────────────────
// Add Admin Modal
// ─────────────────────────────────────────────────────

function openAddModal() {
  editingAdminId = null;
  const titleEl = document.getElementById("admin-modal-title");
  if (titleEl) titleEl.textContent = "Add Admin";
  renderAdminForm(null);
  openModal("admin-form-modal");
}

// ─────────────────────────────────────────────────────
// Edit Admin Modal
// ─────────────────────────────────────────────────────

function openEditModal(admin) {
  if (admin.role === "superadmin" && !isSuperAdmin) {
    showToast("Super Admin accounts cannot be modified by technical admins.", "error");
    return;
  }

  editingAdminId = admin.userId;
  const titleEl = document.getElementById("admin-modal-title");
  if (titleEl) titleEl.textContent = "Edit Admin";
  renderAdminForm(admin);
  openModal("admin-form-modal");
}

// ─────────────────────────────────────────────────────
// Shared Form Renderer (Add / Edit)
// ─────────────────────────────────────────────────────

function renderAdminForm(admin) {
  const isEdit = !!admin;
  const body = document.getElementById("admin-modal-body");
  if (!body) return;

  const locationOptions = ALLOWED_LOCATIONS.map(
    (loc) => `<option value="${loc}" ${(admin?.location || "") === loc ? "selected" : ""}>${loc}</option>`
  ).join("");

  body.innerHTML = `
    <div class="am-form-error" id="am-form-error"></div>
    <form id="am-admin-form" autocomplete="off">
      <div class="am-form-grid">

        <div class="am-form-field">
          <label for="am-f-name">Full Name <span style="color:#dc2626">*</span></label>
          <input id="am-f-name" type="text" placeholder="e.g. Priya Nair" value="${escHtml(admin?.name || "")}" required />
        </div>

        <div class="am-form-field">
          <label for="am-f-username">Username${isEdit ? "" : ' <span style="color:#dc2626">*</span>'}</label>
          <input id="am-f-username" type="text" placeholder="e.g. priya_admin"
            value="${escHtml(admin?.username || "")}"
            ${isEdit ? 'disabled style="background:#f9fafb; color:#9ca3af;"' : "required"} />
          ${isEdit ? '<small style="color:#9ca3af; font-size:11px;">Username cannot be changed after creation.</small>' : ""}
        </div>

        <div class="am-form-field">
          <label for="am-f-email">Email <span style="color:#dc2626">*</span></label>
          <input id="am-f-email" type="email" placeholder="admin@xploreo.com" value="${escHtml(admin?.email || "")}" required />
        </div>

        <div class="am-form-field">
          <label for="am-f-phone">Phone <span style="color:#dc2626">*</span></label>
          <input id="am-f-phone" type="tel" placeholder="9876543210" value="${escHtml(admin?.phone || "")}" required />
        </div>

        <div class="am-form-field">
          <label for="am-f-type">Admin Type${isEdit ? "" : ' <span style="color:#dc2626">*</span>'}</label>
          <select id="am-f-type" ${isEdit ? 'disabled style="background:#f9fafb; color:#9ca3af;"' : "required"}>
            <option value="" ${!admin ? "selected" : ""} disabled>Select type…</option>
            <option value="techadmin"    ${admin?.role === "techadmin"    ? "selected" : ""}>Technical Admin</option>
            <option value="nontechadmin" ${admin?.role === "nontechadmin" ? "selected" : ""}>Non-Technical Admin</option>
          </select>
          ${isEdit ? '<small style="color:#9ca3af; font-size:11px;">Admin type cannot be changed after creation.</small>' : ""}
        </div>

        <div class="am-form-field">
          <label for="am-f-location">Location <span style="color:#dc2626">*</span></label>
          <select id="am-f-location" required>
            <option value="" ${!admin?.location ? "selected" : ""} disabled>Select location…</option>
            ${locationOptions}
          </select>
        </div>

        <div class="am-form-field">
          <label for="am-f-password">Password${isEdit ? " (leave blank to keep current)" : ' <span style="color:#dc2626">*</span>'}</label>
          <input id="am-f-password" type="password"
            placeholder="${isEdit ? "Leave blank to keep current" : "Min. 6 characters"}"
            ${isEdit ? "" : "required minlength='6'"}
            autocomplete="new-password" />
        </div>

        ${isEdit ? `
        <div class="am-form-field">
          <label for="am-f-status">Status</label>
          <select id="am-f-status">
            <option value="active"   ${admin?.status === "active"   ? "selected" : ""}>Active</option>
            <option value="inactive" ${admin?.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
        ` : ""}

        ${isEdit && isSuperAdmin && admin?.role === "techadmin" ? `
        <div class="am-form-field am-form-full">
          <label for="am-f-highlevel">High-Level Technical Admin Privileges</label>
          <select id="am-f-highlevel">
            <option value="false" ${!admin?.isHighLevelAdmin ? "selected" : ""}>⚪ Disabled — Standard Technical Admin (Cannot manage admins)</option>
            <option value="true"  ${admin?.isHighLevelAdmin  ? "selected" : ""}>⭐ Enabled — High-Level Tech Admin (Can manage all admins except Super Admin)</option>
          </select>
        </div>
        ` : ""}

      </div>
      <div class="am-form-actions">
        <button type="button" class="crud-btn" id="am-form-cancel">Cancel</button>
        <button type="submit" class="crud-btn crud-primary" id="am-form-submit">
          ${isEdit ? "Save Changes" : "Create Admin"}
        </button>
      </div>
    </form>
  `;

  safeOn("am-form-cancel", "click", () => closeModal("admin-form-modal"));
  document.getElementById("am-admin-form")?.addEventListener("submit", handleFormSubmit);
}

// ─────────────────────────────────────────────────────
// Form Submit (Add / Edit)
// ─────────────────────────────────────────────────────

async function handleFormSubmit(e) {
  e.preventDefault();

  const errorEl   = document.getElementById("am-form-error");
  const submitBtn = document.getElementById("am-form-submit");
  const isEdit    = !!editingAdminId;
  const currentTargetAdmin = isEdit ? allAdmins.find((a) => a.userId === editingAdminId) : null;

  const name     = document.getElementById("am-f-name")?.value.trim();
  const username = document.getElementById("am-f-username")?.value.trim();
  const email    = document.getElementById("am-f-email")?.value.trim();
  const phone    = document.getElementById("am-f-phone")?.value.trim();
  const roleVal  = document.getElementById("am-f-type")?.value;
  const location = document.getElementById("am-f-location")?.value;
  const password = document.getElementById("am-f-password")?.value;
  const status   = document.getElementById("am-f-status")?.value;
  const highLevelEl = document.getElementById("am-f-highlevel");
  const isHighLevel = highLevelEl ? highLevelEl.value === "true" : undefined;

  if (!name)                          return showFormError(errorEl, "Full Name is required.");
  if (!isEdit && !username)           return showFormError(errorEl, "Username is required.");
  if (!email || !email.includes("@")) return showFormError(errorEl, "A valid email is required.");
  if (!phone || phone.length < 10)    return showFormError(errorEl, "A valid 10-digit phone number is required.");
  if (!isEdit && !roleVal)            return showFormError(errorEl, "Admin Type is required.");
  if (!location)                      return showFormError(errorEl, "Location is required.");
  if (!isEdit && (!password || password.length < 6))
    return showFormError(errorEl, "Password must be at least 6 characters.");

  hideFormError(errorEl);
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Saving…" : "Creating…";
  }

  try {
    if (isEdit) {
      const payload = { name, email, phone, location };
      if (status)   payload.status   = status;
      if (password) payload.password = password;
      if (isSuperAdmin && currentTargetAdmin?.role === "techadmin" && isHighLevel !== undefined) {
        payload.isHighLevelAdmin = isHighLevel;
      }

      await updateUser(editingAdminId, payload);

      const idx = allAdmins.findIndex((a) => a.userId === editingAdminId);
      if (idx !== -1) {
        allAdmins[idx] = {
          ...allAdmins[idx],
          name,
          email,
          phone,
          location,
          ...(status ? { status } : {}),
          ...(payload.isHighLevelAdmin !== undefined ? { isHighLevelAdmin: payload.isHighLevelAdmin } : {}),
        };
      }
      showToast(`${name} has been updated.`, "success");
    } else {
      const result = await registerWithApi({ username, password, name, email, phone, role: roleVal, location });
      if (result?.user) {
        allAdmins.push({ ...result.user });
      } else {
        allAdmins = await fetchAdmins();
      }
      showToast(`${name} added as ${roleVal === "techadmin" ? "Technical" : "Non-Technical"} Admin.`, "success");
    }

    closeModal("admin-form-modal");
    applyFiltersAndRender();
    renderStatCards();
  } catch (err) {
    showFormError(errorEl, err.message || "An error occurred. Please try again.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? "Save Changes" : "Create Admin";
    }
  }
}

// ─────────────────────────────────────────────────────
// Toast Notification
// ─────────────────────────────────────────────────────

function showToast(message, type = "success") {
  const existing = document.getElementById("am-toast");
  if (existing) existing.remove();

  const bg     = type === "success" ? "#064e3b" : "#7f1d1d";
  const border = type === "success" ? "#10b981" : "#dc2626";

  const toast = document.createElement("div");
  toast.id = "am-toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 28px; right: 28px; z-index: 99999;
    background: ${bg}; color: #fff; border-left: 4px solid ${border};
    padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18); max-width: 360px;
    animation: amToastIn 0.25s ease;
  `;

  if (!document.getElementById("am-toast-style")) {
    const style = document.createElement("style");
    style.id = "am-toast-style";
    style.textContent = `
      @keyframes amToastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showFormError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
}

function hideFormError(el) {
  if (!el) return;
  el.textContent = "";
  el.classList.remove("visible");
}

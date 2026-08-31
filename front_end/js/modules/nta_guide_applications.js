/**
 * NTA Guide Applications Panel — nta_guide_applications.js
 * Non-Tech Admin view: all guide applications across all plans, with filters and manual override.
 */
import {
  fetchAllGuideApplications,
  updateGuideApplication,
  fetchPlans,
} from "../api/services.js";

let allApplications = [];
let allPlans = [];
let currentFilter = { status: "all", planId: "" };

export async function initNtaGuideApplications(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="nga-wrapper">
      <div class="nga-header">
        <div>
          <h1 class="nga-title">Guide Applications</h1>
          <p class="nga-subtitle">Review and manage guide applications for travel plans</p>
        </div>
      </div>

      <div class="nga-controls">
        <div class="nga-filter-row">
          <button class="nga-filter-btn active" data-status="all">All</button>
          <button class="nga-filter-btn" data-status="pending">⏳ Pending</button>
          <button class="nga-filter-btn" data-status="accepted">✅ Accepted</button>
          <button class="nga-filter-btn" data-status="rejected">❌ Rejected</button>
        </div>
        <div class="nga-search-group">
          <select id="nga-plan-filter" class="nga-select">
            <option value="">All Plans</option>
          </select>
          <input id="nga-guide-search" class="nga-search" placeholder="Search by guide name…" />
        </div>
      </div>

      <div class="nga-stats" id="nga-stats"></div>

      <div class="nga-table-wrap">
        <table class="nga-table">
          <thead>
            <tr>
              <th>Guide</th>
              <th>Plan</th>
              <th>Price/Person</th>
              <th>Status</th>
              <th>Decision Reason</th>
              <th>Applied On</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody id="nga-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  injectNgaStyles();
  await loadNgaData();
  renderNgaStats();
  populatePlanFilter();
  renderNgaTable();
  setupNgaEvents();
}

async function loadNgaData() {
  try {
    allApplications = await fetchAllGuideApplications();
    if (!Array.isArray(allApplications)) allApplications = allApplications.data || [];
  } catch (e) {
    allApplications = [];
    console.warn("Failed to load guide applications", e);
  }
  try {
    const res = await fetchPlans();
    allPlans = res.items || res || [];
  } catch (e) {
    allPlans = [];
  }
}

function renderNgaStats() {
  const el = document.getElementById("nga-stats");
  if (!el) return;
  const total = allApplications.length;
  const accepted = allApplications.filter((a) => a.status === "accepted").length;
  const pending = allApplications.filter((a) => a.status === "pending").length;
  const rejected = allApplications.filter((a) => a.status === "rejected").length;

  el.innerHTML = `
    <div class="nga-stat"><span class="nga-stat-n">${total}</span><span>Total</span></div>
    <div class="nga-stat nga-stat-green"><span class="nga-stat-n">${accepted}</span><span>Accepted</span></div>
    <div class="nga-stat nga-stat-yellow"><span class="nga-stat-n">${pending}</span><span>Pending</span></div>
    <div class="nga-stat nga-stat-red"><span class="nga-stat-n">${rejected}</span><span>Rejected</span></div>
  `;
}

function populatePlanFilter() {
  const sel = document.getElementById("nga-plan-filter");
  if (!sel) return;
  allPlans.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.title;
    sel.appendChild(opt);
  });
}

function renderNgaTable() {
  const tbody = document.getElementById("nga-tbody");
  if (!tbody) return;

  let filtered = [...allApplications];

  if (currentFilter.status !== "all") {
    filtered = filtered.filter((a) => a.status === currentFilter.status);
  }
  if (currentFilter.planId) {
    filtered = filtered.filter((a) => a.planId === currentFilter.planId);
  }

  const searchVal = (document.getElementById("nga-guide-search")?.value || "").toLowerCase();
  if (searchVal) {
    filtered = filtered.filter((a) =>
      (a.guideName || "").toLowerCase().includes(searchVal),
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="nga-empty-cell">No applications match the current filters.</td></tr>`;
    return;
  }

  const plan = (planId) => allPlans.find((p) => p.id === planId);

  tbody.innerHTML = filtered
    .map((app) => {
      const p = plan(app.planId);
      const canOverride = app.status === "accepted" || app.status === "rejected" || app.status === "pending";

      return `
        <tr>
          <td>
            <strong>${escHtml(app.guideName || app.guideId)}</strong><br>
            <small class="nga-muted">${escHtml(app.guideTitle || "")}</small>
          </td>
          <td>
            <strong>${escHtml(p?.title || app.planId)}</strong><br>
            <small class="nga-muted">📍 ${escHtml(p?.destination || "")}</small>
          </td>
          <td>₹${app.guidePricePerPerson}</td>
          <td>${ngaStatusChip(app.status)}</td>
          <td class="nga-reason">${escHtml(app.autoDecisionReason || "—")}</td>
          <td>${new Date(app.createdAt).toLocaleDateString()}</td>
          <td style="text-align:right">
            <div class="nga-action-row">
              ${app.status !== "accepted" ? `<button class="nga-btn nga-btn-accept" onclick="window.__ngaOverride('${app.id}', 'accepted')">Accept</button>` : ""}
              ${app.status !== "rejected" ? `<button class="nga-btn nga-btn-reject" onclick="window.__ngaOverride('${app.id}', 'rejected')">Reject</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  window.__ngaOverride = async (id, newStatus) => {
    const label = newStatus === "accepted" ? "accept" : "reject";
    if (!confirm(`Are you sure you want to manually ${label} this application?`)) return;
    try {
      await updateGuideApplication(id, { status: newStatus });
      await loadNgaData();
      renderNgaStats();
      renderNgaTable();
      ngaToast(`Application ${newStatus} successfully.`, newStatus === "accepted" ? "success" : "error");
    } catch (e) {
      ngaToast(e?.message || "Failed to update", "error");
    }
  };
}

function setupNgaEvents() {
  document.querySelectorAll(".nga-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nga-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter.status = btn.dataset.status;
      renderNgaTable();
    });
  });

  document.getElementById("nga-plan-filter")?.addEventListener("change", (e) => {
    currentFilter.planId = e.target.value;
    renderNgaTable();
  });

  document.getElementById("nga-guide-search")?.addEventListener("input", () => {
    renderNgaTable();
  });
}

function ngaStatusChip(status) {
  const map = {
    pending: ["⏳ Pending", "#f59e0b", "#fffbeb"],
    accepted: ["✅ Accepted", "#16a34a", "#f0fdf4"],
    rejected: ["❌ Rejected", "#dc2626", "#fef2f2"],
  };
  const [label, color, bg] = map[status] || [status, "#6b7280", "#f9fafb"];
  return `<span class="nga-chip" style="color:${color};background:${bg};border-color:${color}33">${label}</span>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ngaToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `nga-toast nga-toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3000);
}

function injectNgaStyles() {
  if (document.getElementById("nga-styles")) return;
  const style = document.createElement("style");
  style.id = "nga-styles";
  style.textContent = `
    .nga-wrapper { max-width: 1200px; margin: 0 auto; padding: 24px 20px; font-family: 'Inter', sans-serif; }
    .nga-header { margin-bottom: 20px; }
    .nga-title { margin: 0 0 4px; font-size: 24px; font-weight: 800; color: #1e293b; }
    .nga-subtitle { margin: 0; font-size: 14px; color: #64748b; }
    .nga-controls { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .nga-filter-row { display: flex; gap: 6px; }
    .nga-filter-btn { padding: 7px 16px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .nga-filter-btn.active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
    .nga-search-group { display: flex; gap: 8px; align-items: center; }
    .nga-select, .nga-search { padding: 9px 14px; border: 1.5px solid #e2e8f0; border-radius: 9px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .nga-select:focus, .nga-search:focus { border-color: #2563eb; }
    .nga-stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .nga-stat { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 20px; text-align: center; min-width: 90px; font-size: 12px; color: #64748b; font-weight: 500; }
    .nga-stat-n { display: block; font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
    .nga-stat-green .nga-stat-n { color: #16a34a; }
    .nga-stat-yellow .nga-stat-n { color: #d97706; }
    .nga-stat-red .nga-stat-n { color: #dc2626; }
    .nga-table-wrap { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .nga-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .nga-table thead { background: #f8fafc; }
    .nga-table th { padding: 13px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1.5px solid #e2e8f0; font-size: 13px; }
    .nga-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #374151; vertical-align: middle; }
    .nga-table tr:last-child td { border-bottom: none; }
    .nga-table tr:hover td { background: #f8fafc; }
    .nga-muted { color: #94a3b8; font-size: 12px; }
    .nga-reason { font-size: 12px; color: #64748b; max-width: 220px; }
    .nga-empty-cell { text-align: center; color: #94a3b8; padding: 40px !important; font-size: 15px; }
    .nga-chip { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
    .nga-action-row { display: flex; gap: 6px; justify-content: flex-end; }
    .nga-btn { padding: 6px 14px; border: none; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .nga-btn-accept { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .nga-btn-accept:hover { background: #16a34a; color: #fff; }
    .nga-btn-reject { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .nga-btn-reject:hover { background: #dc2626; color: #fff; }
    .nga-toast { position: fixed; bottom: 28px; right: 28px; padding: 14px 22px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.18); z-index: 9999; opacity: 0; transform: translateY(16px); transition: all 0.28s; }
    .nga-toast.show { opacity: 1; transform: translateY(0); }
    .nga-toast-success { background: #16a34a; }
    .nga-toast-error { background: #dc2626; }
    .nga-toast-info { background: #2563eb; }
  `;
  document.head.appendChild(style);
}

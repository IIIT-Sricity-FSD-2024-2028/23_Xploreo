/**
 * Guide Dashboard — guide_dashboard.js
 * Full dashboard for guides: browse plans, apply, view applications, manage assignments.
 */
import {
  fetchPlans,
  fetchGuideApplicationsByGuide,
  applyToGuideForPlan,
  fetchGuideAssignmentsByGuide,
  confirmGuideAssignment,
  rejectGuideAssignment,
} from "../api/services.js";
import { getApiSession } from "../api/session.js";

let currentUser = null;
let allPlans = [];
let myApplications = [];
let myAssignments = [];
let activeTab = "plans";

export async function renderGuideDashboard(containerId, user) {
  currentUser = user;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="guide-page-wrapper">
      <div class="guide-page-header">
        <div class="guide-page-header-left">
          <div class="guide-page-avatar">${(user.name || user.username || "G")[0].toUpperCase()}</div>
          <div>
            <h1 class="guide-page-title">Welcome, ${user.name || user.username || "Guide"}!</h1>
            <p class="guide-page-subtitle">Manage your plan applications and incoming bookings</p>
          </div>
        </div>
        <div class="guide-header-stats" id="gd-stats"></div>
      </div>

      <div class="gd-tabs">
        <button class="gd-tab active" data-tab="plans">📦 Browse Plans</button>
        <button class="gd-tab" data-tab="applications">📋 My Applications</button>
        <button class="gd-tab" data-tab="assignments">🧳 My Jobs</button>
      </div>

      <div id="gd-content"></div>
    </div>
  `;

  injectStyles();
  setupTabs();
  await loadData();
  renderStats();
  renderTab("plans");
}

async function loadData() {
  const guideId = currentUser.id || currentUser.userId;
  try {
    const plansRes = await fetchPlans();
    allPlans = plansRes.items || plansRes || [];
  } catch (e) {
    console.warn("Failed to load plans", e);
    allPlans = [];
  }
  try {
    myApplications = await fetchGuideApplicationsByGuide(guideId);
    if (!Array.isArray(myApplications)) myApplications = myApplications.data || [];
  } catch (e) {
    console.warn("Failed to load guide applications", e);
    myApplications = [];
  }
  try {
    myAssignments = await fetchGuideAssignmentsByGuide(guideId);
    if (!Array.isArray(myAssignments)) myAssignments = myAssignments.data || [];
  } catch (e) {
    console.warn("Failed to load guide assignments", e);
    myAssignments = [];
  }
}

function renderStats() {
  const statsEl = document.getElementById("gd-stats");
  if (!statsEl) return;
  const accepted = myApplications.filter((a) => a.status === "accepted").length;
  const pending = myApplications.filter((a) => a.status === "pending").length;
  const activeAssignments = myAssignments.filter((a) => a.status === "confirmed").length;

  statsEl.innerHTML = `
    <div class="guide-header-stat">
      <span class="guide-header-stat-num">${allPlans.length}</span>
      <span class="guide-header-stat-label">Plans Available</span>
    </div>
    <div class="guide-header-stat">
      <span class="guide-header-stat-num guide-stat-green">${accepted}</span>
      <span class="guide-header-stat-label">Accepted</span>
    </div>
    <div class="guide-header-stat">
      <span class="guide-header-stat-num guide-stat-yellow">${pending}</span>
      <span class="guide-header-stat-label">Pending</span>
    </div>
    <div class="guide-header-stat">
      <span class="guide-header-stat-num guide-stat-blue">${activeAssignments}</span>
      <span class="guide-header-stat-label">Active Jobs</span>
    </div>
  `;
}

function setupTabs() {
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".gd-tab");
    if (!tab) return;
    document.querySelectorAll(".gd-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    renderTab(tab.dataset.tab);
  });
}

function renderTab(tab) {
  activeTab = tab;
  const content = document.getElementById("gd-content");
  if (!content) return;
  if (tab === "plans") renderPlansTab(content);
  else if (tab === "applications") renderApplicationsTab(content);
  else if (tab === "assignments") renderAssignmentsTab(content);
}

// ─────────────────────────────────────────────
// PLANS TAB
// ─────────────────────────────────────────────
function renderPlansTab(container) {
  container.innerHTML = `
    <div class="gd-section-header">
      <h2>Available Travel Plans</h2>
      <input class="gd-search" id="gd-plan-search" placeholder="Search plans by destination or title…" />
    </div>
    <div class="gd-plans-grid" id="gd-plans-grid"></div>
    <div id="gd-apply-modal" class="gd-modal-backdrop" style="display:none;">
      <div class="gd-modal">
        <h3 id="gd-modal-plan-name">Apply to Guide</h3>
        <p class="gd-modal-sub">Set your price per person for this plan</p>
        <label class="gd-label">Your Price Per Person (₹)
          <input type="number" id="gd-price-input" class="gd-input" min="0" placeholder="e.g. 1500" />
        </label>
        <div class="gd-modal-actions">
          <button class="gd-btn gd-btn-secondary" id="gd-modal-cancel">Cancel</button>
          <button class="gd-btn gd-btn-primary" id="gd-modal-submit">Submit Application</button>
        </div>
        <p id="gd-modal-error" class="gd-error"></p>
      </div>
    </div>
  `;

  renderPlanCards(allPlans);

  document.getElementById("gd-plan-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allPlans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q),
    );
    renderPlanCards(filtered);
  });

  document.getElementById("gd-modal-cancel").addEventListener("click", closeApplyModal);
}

function renderPlanCards(plans) {
  const grid = document.getElementById("gd-plans-grid");
  if (!grid) return;
  if (!plans.length) {
    grid.innerHTML = `<div class="gd-empty">No plans available at the moment.</div>`;
    return;
  }

  grid.innerHTML = plans
    .map((plan) => {
      const myApp = myApplications.find((a) => a.planId === plan.id);
      const statusBadge = myApp ? statusChip(myApp.status) : "";
      const autoReason = myApp?.autoDecisionReason
        ? `<p class="gd-auto-reason">${myApp.autoDecisionReason}</p>`
        : "";

      const actionBtn = !myApp
        ? `<button class="gd-btn gd-btn-primary" onclick="window.__gdApply('${plan.id}', '${escHtml(plan.title)}')">Apply to Guide</button>`
        : myApp.status === "rejected"
        ? `<button class="gd-btn gd-btn-secondary" disabled>Rejected</button>`
        : myApp.status === "pending"
        ? `<button class="gd-btn gd-btn-secondary" disabled>Pending Review</button>`
        : `<button class="gd-btn gd-btn-success" disabled>✓ Accepted</button>`;

      return `
        <div class="gd-plan-card">
          <div class="gd-plan-top">
            <div class="gd-plan-dest">${escHtml(plan.destination)}</div>
            ${statusBadge}
          </div>
          <h3 class="gd-plan-title">${escHtml(plan.title)}</h3>
          <p class="gd-plan-desc">${escHtml((plan.description || "").substring(0, 90))}…</p>
          <div class="gd-plan-meta">
            <span>🌙 ${plan.durationNights} nights</span>
            <span>💰 ₹${plan.pricePerPerson?.toLocaleString?.() ?? plan.pricePerPerson}/person</span>
            <span>⭐ ${plan.hotelStars || 3} star hotel</span>
          </div>
          ${autoReason}
          <div class="gd-plan-action">${actionBtn}</div>
        </div>
      `;
    })
    .join("");

  window.__gdApply = (planId, planTitle) => openApplyModal(planId, planTitle);
}

let applyingPlanId = null;
function openApplyModal(planId, planTitle) {
  applyingPlanId = planId;
  document.getElementById("gd-modal-plan-name").textContent = `Apply: ${planTitle}`;
  document.getElementById("gd-modal-error").textContent = "";
  document.getElementById("gd-price-input").value = "";
  document.getElementById("gd-apply-modal").style.display = "flex";

  document.getElementById("gd-modal-submit").onclick = async () => {
    const price = parseFloat(document.getElementById("gd-price-input").value);
    if (isNaN(price) || price < 0) {
      document.getElementById("gd-modal-error").textContent = "Please enter a valid price.";
      return;
    }
    try {
      await applyToGuideForPlan({ planId: applyingPlanId, guidePricePerPerson: price });
      closeApplyModal();
      await loadData();
      renderStats();
      renderPlanCards(allPlans);
      showToast("Application submitted! Auto-decision applied.", "success");
    } catch (err) {
      document.getElementById("gd-modal-error").textContent =
        err?.message || "Failed to submit. Try again.";
    }
  };
}

function closeApplyModal() {
  const modal = document.getElementById("gd-apply-modal");
  if (modal) modal.style.display = "none";
  applyingPlanId = null;
}

// ─────────────────────────────────────────────
// APPLICATIONS TAB
// ─────────────────────────────────────────────
function renderApplicationsTab(container) {
  container.innerHTML = `
    <div class="gd-section-header">
      <h2>My Plan Applications</h2>
      <div class="gd-filter-row">
        <button class="gd-filter-btn active" data-status="all">All</button>
        <button class="gd-filter-btn" data-status="pending">Pending</button>
        <button class="gd-filter-btn" data-status="accepted">Accepted</button>
        <button class="gd-filter-btn" data-status="rejected">Rejected</button>
      </div>
    </div>
    <div class="gd-table-wrap">
      <table class="gd-table">
        <thead><tr>
          <th>Plan</th><th>Price/Person</th><th>Status</th><th>Decision Reason</th><th>Applied</th>
        </tr></thead>
        <tbody id="gd-apps-tbody"></tbody>
      </table>
    </div>
  `;

  renderAppsTable("all");

  container.querySelectorAll(".gd-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".gd-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAppsTable(btn.dataset.status);
    });
  });
}

function renderAppsTable(statusFilter) {
  const tbody = document.getElementById("gd-apps-tbody");
  if (!tbody) return;
  const filtered =
    statusFilter === "all"
      ? myApplications
      : myApplications.filter((a) => a.status === statusFilter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="gd-empty-cell">No applications found.</td></tr>`;
    return;
  }

  const plan = (planId) => allPlans.find((p) => p.id === planId);
  tbody.innerHTML = filtered
    .map((app) => {
      const p = plan(app.planId);
      return `<tr>
        <td><strong>${escHtml(p?.title || app.planId)}</strong><br><small>${escHtml(p?.destination || "")}</small></td>
        <td>₹${app.guidePricePerPerson}</td>
        <td>${statusChip(app.status)}</td>
        <td class="gd-reason-cell">${escHtml(app.autoDecisionReason || "—")}</td>
        <td>${new Date(app.createdAt).toLocaleDateString()}</td>
      </tr>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// ASSIGNMENTS TAB (Incoming Jobs)
// ─────────────────────────────────────────────
function renderAssignmentsTab(container) {
  container.innerHTML = `
    <div class="gd-section-header">
      <h2>My Incoming Jobs</h2>
      <div class="gd-filter-row">
        <button class="gd-filter-btn active" data-status="all">All</button>
        <button class="gd-filter-btn" data-status="pending_guide_confirm">Awaiting My Confirm</button>
        <button class="gd-filter-btn" data-status="confirmed">Confirmed</button>
        <button class="gd-filter-btn" data-status="rejected_by_guide">Rejected</button>
        <button class="gd-filter-btn" data-status="cancelled">Cancelled</button>
      </div>
    </div>
    <div id="gd-assignments-list"></div>
  `;

  renderAssignmentsList("all");

  container.querySelectorAll(".gd-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".gd-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAssignmentsList(btn.dataset.status);
    });
  });
}

function renderAssignmentsList(statusFilter) {
  const list = document.getElementById("gd-assignments-list");
  if (!list) return;
  const filtered =
    statusFilter === "all"
      ? myAssignments
      : myAssignments.filter((a) => a.status === statusFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="gd-empty">No jobs found for this filter.</div>`;
    return;
  }

  const plan = (planId) => allPlans.find((p) => p.id === planId);

  list.innerHTML = filtered
    .map((asgn) => {
      const p = plan(asgn.planId);
      const isPending = asgn.status === "pending_guide_confirm";
      const actions = isPending
        ? `
          <button class="gd-btn gd-btn-success gd-btn-sm" onclick="window.__gdConfirm('${asgn.id}')">✓ Confirm Available</button>
          <button class="gd-btn gd-btn-danger gd-btn-sm" onclick="window.__gdReject('${asgn.id}')">✗ Not Available</button>
        `
        : "";

      return `
        <div class="gd-assignment-card ${asgn.status === 'pending_guide_confirm' ? 'gd-asgn-pending' : ''}">
          <div class="gd-asgn-top">
            <div>
              <h3>${escHtml(p?.title || asgn.planId)}</h3>
              <p class="gd-asgn-dest">📍 ${escHtml(p?.destination || "")}</p>
            </div>
            ${statusChip(asgn.status)}
          </div>
          <div class="gd-asgn-meta">
            <span>👤 Traveller: <code>${asgn.travellerId}</code></span>
            <span>💰 Guide Fee: ₹${asgn.guidePricePerPerson}/person</span>
            <span>📅 Travel Date: ${new Date(asgn.startDate || asgn.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="gd-asgn-actions">
            ${actions}
            ${asgn.status === 'confirmed' ? `<button class="gd-btn gd-btn-primary gd-btn-sm" onclick="window.__gdViewDetails('${encodeURIComponent(JSON.stringify(asgn))}')">View Details</button>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  window.__gdConfirm = async (id) => {
    try {
      await confirmGuideAssignment(id);
      await loadData();
      renderAssignmentsList(statusFilter);
      renderStats();
      showToast("Confirmed! Traveller has been notified.", "success");
    } catch (e) {
      showToast(e?.message || "Failed to confirm.", "error");
    }
  };

  window.__gdReject = (id) => {
    const modalHtml = `
      <div id="gd-confirm-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: 'Inter', sans-serif;">
        <div style="background: white; border-radius: 8px; width: 380px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
          <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Reject Job</div>
          <div style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">Are you sure you want to reject this job? The traveller will be notified.</div>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button onclick="document.getElementById('gd-confirm-modal').remove()" style="background: white; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer;">Cancel</button>
            <button onclick="document.getElementById('gd-confirm-modal').remove(); window.__gdRejectProceed('${id}')" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer;">Reject Job</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  window.__gdRejectProceed = async (id) => {
    try {
      await rejectGuideAssignment(id);
      await loadData();
      renderAssignmentsList(statusFilter);
      renderStats();
      showToast("Rejected job. Traveller notified.", "info");
    } catch (e) {
      showToast(e?.message || "Failed to reject.", "error");
    }
  };

  window.__gdViewDetails = async (asgnStr) => {
    try {
      const asgn = JSON.parse(decodeURIComponent(asgnStr));
      const bookedDate = new Date(asgn.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const travelDate = new Date(asgn.startDate || asgn.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const travelersCount = asgn.travelerCount || asgn.numberOfTravelers || 1;
      
      let tName = `Traveller ${asgn.travellerId.slice(0, 5)}`;
      let tPhone = "Not provided";
      let tEmail = "Not provided";
      let tGender = "Not provided";
      let tAge = "Not provided";

      try {
        const { fetchTravellerProfile } = await import("../api/services.js");
        const traveler = await fetchTravellerProfile(asgn.travellerId);
        if (traveler) {
          const fetchedName = `${traveler.fname || ''} ${traveler.lname || ''}`.trim();
          tName = fetchedName || traveler.name || traveler.fullName || tName;
          tPhone = traveler.phno ? String(traveler.phno) : (traveler.phone || tPhone);
          tEmail = traveler.email || tEmail;
          tGender = traveler.gender || tGender;
          if (traveler.dob) {
            const ageDifMs = Date.now() - new Date(traveler.dob).getTime();
            tAge = Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970) + " years";
          }
        }
      } catch (err) {
        console.warn("Could not load traveler profile", err);
      }
      
      const modalHtml = `
        <div id="gd-details-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: 'Inter', sans-serif;">
          <div style="background: white; border-radius: 12px; width: 420px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #2563eb; color: white; padding: 16px 20px; font-weight: 600; font-size: 18px; display: flex; justify-content: space-between; align-items: center;">
              <span>📌 Job Details</span>
              <button onclick="document.getElementById('gd-details-modal').remove()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 24px 20px; font-size: 15px; color: #374151; line-height: 1.5;">
              <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 16px;"><strong>👤 Name:</strong> ${tName}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div><strong>📞 Phone:</strong> ${tPhone}</div>
                  <div><strong>🎂 Age:</strong> ${tAge}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div><strong>🚻 Gender:</strong> ${tGender}</div>
                </div>
                <div style="word-break: break-all; margin-top: 4px;"><strong>✉️ Email:</strong> <a href="mailto:${tEmail}" style="color: #2563eb; text-decoration: none;">${tEmail}</a></div>
              </div>
              <div style="margin-bottom: 12px;"><strong>Travelers Count:</strong> ${travelersCount}</div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <div style="margin-bottom: 12px;"><strong>📅 Booking Made On:</strong> ${bookedDate}</div>
              <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div><strong>🛫 Travel Start Date:</strong> <span style="color: #2563eb; font-weight: 600;">${travelDate}</span></div>
                <div><strong>🛬 Travel End Date:</strong> <span style="color: #2563eb; font-weight: 600;">${asgn.endDate ? new Date(asgn.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not provided"}</span></div>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <div style="margin-bottom: 4px;"><strong>💰 Guide Fee:</strong> ₹${asgn.guidePricePerPerson}/person</div>
              <div style="font-size: 16px; font-weight: 700; color: #16a34a; margin-top: 8px;">Total Expected: ₹${(asgn.guidePricePerPerson * travelersCount).toLocaleString('en-IN')}</div>
            </div>
            <div style="padding: 16px 20px; background: #f9fafb; text-align: right; border-top: 1px solid #e5e7eb;">
              <button onclick="document.getElementById('gd-details-modal').remove()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) {
      showToast("Could not load details.", "error");
    }
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function statusChip(status) {
  const map = {
    pending: ["🕐 Pending", "#f59e0b", "#fffbeb"],
    accepted: ["✅ Accepted", "#16a34a", "#f0fdf4"],
    rejected: ["❌ Rejected", "#dc2626", "#fef2f2"],
    pending_guide_confirm: ["⏳ Awaiting Confirmation", "#7c3aed", "#f5f3ff"],
    confirmed: ["✅ Confirmed", "#16a34a", "#f0fdf4"],
    rejected_by_guide: ["❌ Guide Rejected", "#dc2626", "#fef2f2"],
    cancelled: ["🚫 Cancelled", "#6b7280", "#f9fafb"],
  };
  const [label, color, bg] = map[status] || [status, "#6b7280", "#f9fafb"];
  return `<span class="gd-chip" style="color:${color};background:${bg};border-color:${color}20">${label}</span>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = `gd-toast gd-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("gd-toast-show"), 50);
  setTimeout(() => {
    toast.classList.remove("gd-toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function injectStyles() {
  if (document.getElementById("gd-styles")) return;
  const style = document.createElement("style");
  style.id = "gd-styles";
  style.textContent = `
    .gd-tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; margin-bottom: 20px; }
    .gd-tab { flex: 1; border: none; background: transparent; padding: 10px 16px; border-radius: 9px; font-size: 14px; font-weight: 500; cursor: pointer; color: #64748b; transition: all 0.2s; }
    .gd-tab.active { background: #fff; color: #1e3a5f; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .gd-tab:hover:not(.active) { background: rgba(255,255,255,0.6); }
    .gd-section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .gd-section-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
    .gd-search { padding: 10px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; width: 280px; outline: none; transition: border-color 0.2s; }
    .gd-search:focus { border-color: #2563eb; }
    .gd-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .gd-filter-btn { padding: 6px 14px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: #475569; }
    .gd-filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
    .gd-filter-btn:hover:not(.active) { border-color: #2563eb; color: #2563eb; }
    .gd-plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .gd-plan-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; transition: box-shadow 0.2s, transform 0.2s; }
    .gd-plan-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
    .gd-plan-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .gd-plan-dest { font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 3px 10px; border-radius: 20px; }
    .gd-plan-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #1e293b; }
    .gd-plan-desc { margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5; }
    .gd-plan-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #475569; margin-bottom: 10px; }
    .gd-auto-reason { font-size: 11px; color: #64748b; background: #f8fafc; border-left: 3px solid #94a3b8; padding: 6px 10px; border-radius: 0 6px 6px 0; margin-bottom: 10px; }
    .gd-plan-action { margin-top: 14px; }
    .gd-btn { padding: 9px 18px; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .gd-btn-sm { padding: 7px 14px; font-size: 13px; }
    .gd-btn-primary { background: #2563eb; color: #fff; }
    .gd-btn-primary:hover { background: #1d4ed8; }
    .gd-btn-secondary { background: #f1f5f9; color: #64748b; border: 1.5px solid #e2e8f0; }
    .gd-btn-success { background: #16a34a; color: #fff; }
    .gd-btn-success:hover { background: #15803d; }
    .gd-btn-danger { background: #dc2626; color: #fff; }
    .gd-btn-danger:hover { background: #b91c1c; }
    .gd-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .gd-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
    .gd-table-wrap { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .gd-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .gd-table thead { background: #f8fafc; }
    .gd-table th { padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1.5px solid #e2e8f0; }
    .gd-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #374151; vertical-align: top; }
    .gd-table tr:last-child td { border-bottom: none; }
    .gd-reason-cell { font-size: 12px; color: #64748b; max-width: 260px; }
    .gd-empty-cell { text-align: center; color: #94a3b8; padding: 32px !important; }
    .gd-empty { text-align: center; color: #94a3b8; padding: 40px; background: #fff; border-radius: 14px; border: 1.5px dashed #e2e8f0; }
    .gd-assignment-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; margin-bottom: 12px; transition: box-shadow 0.2s; }
    .gd-assignment-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
    .gd-asgn-pending { border-left: 4px solid #7c3aed; background: #faf5ff; }
    .gd-asgn-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .gd-asgn-top h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #1e293b; }
    .gd-asgn-dest { margin: 0; font-size: 13px; color: #64748b; }
    .gd-asgn-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #475569; margin-bottom: 14px; }
    .gd-asgn-actions { display: flex; gap: 10px; }
    .gd-label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 500; color: #374151; }
    .gd-input { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 9px; font-size: 15px; outline: none; transition: border-color 0.2s; margin-top: 4px; }
    .gd-input:focus { border-color: #2563eb; }
    .gd-error { color: #dc2626; font-size: 13px; margin-top: 8px; min-height: 18px; }
    .gd-modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .gd-modal { background: #fff; border-radius: 18px; padding: 32px; width: 420px; max-width: 95vw; box-shadow: 0 24px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 14px; }
    .gd-modal h3 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
    .gd-modal-sub { margin: 0; font-size: 13px; color: #64748b; }
    .gd-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
    .gd-toast { position: fixed; bottom: 28px; right: 28px; padding: 14px 22px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.16); z-index: 9999; opacity: 0; transform: translateY(16px); transition: all 0.28s ease; }
    .gd-toast-show { opacity: 1; transform: translateY(0); }
    .gd-toast-success { background: #16a34a; }
    .gd-toast-error { background: #dc2626; }
    .gd-toast-warning { background: #d97706; }
    .gd-toast-info { background: #2563eb; }
  `;
  document.head.appendChild(style);
}

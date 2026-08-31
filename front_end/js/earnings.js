import { fetchGuideAssignmentsByGuide, fetchPlans } from "./api/services.js";
import { getApiSession } from "./api/session.js";

export async function renderEarningsPage(containerId, currentUser) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="guide-page-wrapper">
      <div class="guide-page-header">
        <div class="guide-page-header-left">
          <div class="guide-page-avatar">${(currentUser.name || currentUser.username || "G")[0].toUpperCase()}</div>
          <div>
            <h1 class="guide-page-title">Welcome, ${currentUser.name || currentUser.username || "Guide"}!</h1>
            <p class="guide-page-subtitle">Your trip-by-trip income overview</p>
          </div>
        </div>
        <div class="guide-header-stats" id="earn-header-stats"></div>
      </div>
      <div class="earn-stats-row" id="earn-stats"></div>
      <div class="earn-section-head">
        <h2>Trip Earnings Breakdown</h2>
        <div class="earn-filter-row" id="earn-filters">
          <button class="earn-filter-btn active" data-status="all">All</button>
          <button class="earn-filter-btn" data-status="confirmed">Confirmed</button>
          <button class="earn-filter-btn" data-status="pending_guide_confirm">Pending</button>
          <button class="earn-filter-btn" data-status="rejected_by_guide">Rejected</button>
          <button class="earn-filter-btn" data-status="cancelled">Cancelled</button>
        </div>
      </div>
      <div id="earn-list" class="earn-list"></div>
    </div>
  `;

  injectEarnStyles();

  const guideId = currentUser.id || currentUser.userId;
  let assignments = [];
  let plans = [];

  try {
    assignments = await fetchGuideAssignmentsByGuide(guideId);
    if (!Array.isArray(assignments)) assignments = assignments.data || [];
  } catch (e) {
    console.warn("Failed to load guide assignments for earnings", e);
  }

  try {
    const plansRes = await fetchPlans();
    plans = plansRes.items || plansRes || [];
  } catch (e) {
    console.warn("Failed to load plans for earnings", e);
  }

  renderHeaderStats(assignments);
  renderEarnStats(assignments);
  renderEarnList(assignments, plans, "all");

  document.querySelectorAll(".earn-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".earn-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderEarnList(assignments, plans, btn.dataset.status);
    });
  });
}

function renderHeaderStats(assignments) {
  const el = document.getElementById("earn-header-stats");
  if (!el) return;
  const confirmed = assignments.filter((a) => a.status === "confirmed").length;
  const pending = assignments.filter((a) => a.status === "pending_guide_confirm").length;
  const totalEarned = assignments
    .filter((a) => a.status === "confirmed")
    .reduce((s, a) => s + (Number(a.guidePricePerPerson) || 0) * (a.travelerCount || a.numberOfTravelers || 1), 0);

  el.innerHTML = `
    <div class="guide-header-stat"><span class="guide-header-stat-num">${assignments.length}</span><span class="guide-header-stat-label">Total Jobs</span></div>
    <div class="guide-header-stat"><span class="guide-header-stat-num guide-stat-green">${confirmed}</span><span class="guide-header-stat-label">Confirmed</span></div>
    <div class="guide-header-stat"><span class="guide-header-stat-num guide-stat-yellow">${pending}</span><span class="guide-header-stat-label">Pending</span></div>
  `;
}

function renderEarnStats(assignments) {
  const el = document.getElementById("earn-stats");
  if (!el) return;

  const confirmed = assignments.filter((a) => a.status === "confirmed");
  const pending = assignments.filter((a) => a.status === "pending_guide_confirm");

  // Total earned = sum of (guidePricePerPerson * travelerCount) for confirmed
  const totalEarned = confirmed.reduce((sum, a) => {
    const count = a.travelerCount || a.numberOfTravelers || 1;
    return sum + (Number(a.guidePricePerPerson) || 0) * count;
  }, 0);

  const pendingAmount = pending.reduce((sum, a) => {
    const count = a.travelerCount || a.numberOfTravelers || 1;
    return sum + (Number(a.guidePricePerPerson) || 0) * count;
  }, 0);

  el.innerHTML = `
    <div class="earn-stat-card">
      <span class="earn-stat-icon">💰</span>
      <div>
        <div class="earn-stat-num">₹${totalEarned.toLocaleString("en-IN")}</div>
        <div class="earn-stat-label">Total Earned</div>
      </div>
    </div>
    <div class="earn-stat-card">
      <span class="earn-stat-icon">⏳</span>
      <div>
        <div class="earn-stat-num earn-yellow">₹${pendingAmount.toLocaleString("en-IN")}</div>
        <div class="earn-stat-label">Pending Payout</div>
      </div>
    </div>
    <div class="earn-stat-card">
      <span class="earn-stat-icon">✅</span>
      <div>
        <div class="earn-stat-num earn-green">${confirmed.length}</div>
        <div class="earn-stat-label">Confirmed Trips</div>
      </div>
    </div>
    <div class="earn-stat-card">
      <span class="earn-stat-icon">📋</span>
      <div>
        <div class="earn-stat-num earn-blue">${assignments.length}</div>
        <div class="earn-stat-label">Total Jobs</div>
      </div>
    </div>
  `;
}

function renderEarnList(assignments, plans, statusFilter) {
  const list = document.getElementById("earn-list");
  if (!list) return;

  const filtered =
    statusFilter === "all"
      ? assignments
      : assignments.filter((a) => a.status === statusFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="earn-empty">No trips found for this filter.</div>`;
    return;
  }

  const getPlan = (planId) => plans.find((p) => String(p.id) === String(planId));

  list.innerHTML = filtered
    .map((asgn) => {
      const plan = getPlan(asgn.planId);
      const count = asgn.travelerCount || asgn.numberOfTravelers || 1;
      const fee = Number(asgn.guidePricePerPerson) || 0;
      const total = fee * count;
      const isEarned = asgn.status === "confirmed";

      return `
        <div class="earn-trip-card ${isEarned ? "earn-trip-confirmed" : ""}">
          <div class="earn-trip-left">
            <div class="earn-trip-dest">${escHtml(plan?.destination || "Trip")}</div>
            <div class="earn-trip-name">${escHtml(plan?.title || asgn.planId)}</div>
            <div class="earn-trip-meta">
              <span>👤 ${count} traveler${count !== 1 ? "s" : ""}</span>
              <span>📅 ${new Date(asgn.startDate || asgn.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div class="earn-trip-right">
            <div class="earn-trip-fee">
              <span class="earn-fee-label">Fee/person</span>
              <span class="earn-fee-per">₹${fee.toLocaleString("en-IN")}</span>
            </div>
            <div class="earn-trip-total ${isEarned ? "earn-total-green" : ""}">
              ₹${total.toLocaleString("en-IN")}
            </div>
            ${earnStatusChip(asgn.status)}
          </div>
        </div>
      `;
    })
    .join("");
}

function earnStatusChip(status) {
  const map = {
    pending_guide_confirm: ["⏳ Pending", "#d97706", "#fffbeb"],
    confirmed: ["✅ Confirmed", "#16a34a", "#f0fdf4"],
    rejected_by_guide: ["❌ Rejected", "#dc2626", "#fef2f2"],
    cancelled: ["🚫 Cancelled", "#6b7280", "#f9fafb"],
  };
  const [label, color, bg] = map[status] || [status, "#6b7280", "#f9fafb"];
  return `<span class="earn-chip" style="color:${color};background:${bg};border-color:${color}40">${label}</span>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectEarnStyles() {
  if (document.getElementById("earn-styles")) return;
  const style = document.createElement("style");
  style.id = "earn-styles";
  style.textContent = `
    .earn-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .earn-stat-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .earn-stat-icon { font-size: 28px; }
    .earn-stat-num { font-size: 22px; font-weight: 700; color: #1e293b; }
    .earn-stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }
    .earn-green { color: #16a34a; }
    .earn-yellow { color: #d97706; }
    .earn-blue { color: #2563eb; }

    .earn-section-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .earn-section-head h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
    .earn-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .earn-filter-btn { padding: 6px 14px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: #475569; }
    .earn-filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
    .earn-filter-btn:hover:not(.active) { border-color: #2563eb; color: #2563eb; }

    .earn-list { display: flex; flex-direction: column; gap: 12px; }
    .earn-empty { text-align: center; color: #94a3b8; padding: 48px; background: #fff; border-radius: 14px; border: 1.5px dashed #e2e8f0; font-size: 15px; }

    .earn-trip-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: box-shadow 0.2s, transform 0.2s; }
    .earn-trip-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }
    .earn-trip-confirmed { border-left: 4px solid #16a34a; }

    .earn-trip-left { flex: 1; }
    .earn-trip-dest { font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 3px 10px; border-radius: 20px; display: inline-block; margin-bottom: 6px; }
    .earn-trip-name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .earn-trip-meta { display: flex; gap: 16px; font-size: 13px; color: #64748b; }

    .earn-trip-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .earn-trip-fee { text-align: right; }
    .earn-fee-label { display: block; font-size: 11px; color: #94a3b8; }
    .earn-fee-per { font-size: 14px; color: #475569; font-weight: 500; }
    .earn-trip-total { font-size: 22px; font-weight: 700; color: #1e293b; }
    .earn-total-green { color: #16a34a; }
    .earn-chip { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
  `;
  document.head.appendChild(style);
}

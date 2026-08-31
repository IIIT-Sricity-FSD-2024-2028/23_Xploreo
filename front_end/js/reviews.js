import { apiGet, apiPost } from "./api/http.js";

/**
 * Guide Reviews Page
 * ─────────────────────────────────────────────────────────
 * Shows reviews received BY the logged-in guide.
 * Reviews are written by travellers after a confirmed trip.
 * Guides see their average rating, review cards (read-only).
 * ─────────────────────────────────────────────────────────
 */
export async function renderReviewsPage(containerId, currentUser) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const guideId = currentUser.id || currentUser.userId;
  const guideName = currentUser.name || currentUser.username || "Guide";

  container.innerHTML = `
    <div class="guide-page-wrapper">
      <div class="guide-page-header">
        <div class="guide-page-header-left">
          <div class="guide-page-avatar">${guideName[0].toUpperCase()}</div>
          <div>
            <h1 class="guide-page-title">Welcome, ${guideName}!</h1>
            <p class="guide-page-subtitle">What travellers are saying about your tours</p>
          </div>
        </div>
        <div class="rv-avg-block" id="rv-avg"></div>
      </div>
      <div id="rv-list" class="rv-list">
        <div class="rv-loading">Loading reviews…</div>
      </div>
    </div>
  `;

  injectReviewStyles();

  let reviews = [];
  try {
    const result = await apiGet(`/reviews?targetType=guide&targetId=${guideId}`);
    reviews = Array.isArray(result) ? result : (result.data || result.items || []);
  } catch (e) {
    console.warn("Failed to load guide reviews", e);
  }

  renderAvg(reviews);
  renderReviewList(reviews);
}

function renderAvg(reviews) {
  const el = document.getElementById("rv-avg");
  if (!el) return;
  if (!reviews.length) {
    el.innerHTML = `<span class="rv-no-avg">No reviews yet</span>`;
    return;
  }
  const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
  el.innerHTML = `
    <div class="rv-avg-left">
      <div class="rv-avg-num">${avg.toFixed(1)}</div>
    </div>
    <div class="rv-avg-right">
      <div class="rv-avg-stars">${starBar(avg)}</div>
      <div class="rv-avg-count">${reviews.length} review${reviews.length !== 1 ? "s" : ""}</div>
    </div>
  `;
}

function renderReviewList(reviews) {
  const list = document.getElementById("rv-list");
  if (!list) return;
  if (!reviews.length) {
    list.innerHTML = `
      <div class="rv-empty">
        <div class="rv-empty-icon">⭐</div>
        <p>No reviews yet. Reviews will appear here after travellers complete trips with you.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = reviews
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => {
      const reviewer = r.reviewerName || r.userName || `Traveller #${r.userId}`;
      const date = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "";
      const rating = Number(r.rating) || 0;
      return `
        <div class="rv-card">
          <div class="rv-card-top">
            <div class="rv-reviewer-avatar">${String(reviewer)[0].toUpperCase()}</div>
            <div class="rv-reviewer-info">
              <div class="rv-reviewer-name">${escHtml(reviewer)}</div>
              <div class="rv-reviewer-date">${date}</div>
            </div>
            <div class="rv-card-stars">${starBar(rating)}</div>
          </div>
          <p class="rv-comment">${escHtml(r.comment || "")}</p>
        </div>
      `;
    })
    .join("");
}

function starBar(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) html += `<span class="rv-star rv-star-full">★</span>`;
    else if (i === full && half) html += `<span class="rv-star rv-star-half">★</span>`;
    else html += `<span class="rv-star rv-star-empty">☆</span>`;
  }
  return html;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectReviewStyles() {
  if (document.getElementById("rv-styles")) return;
  const s = document.createElement("style");
  s.id = "rv-styles";
  s.textContent = `
    .rv-avg-block { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.14); border-radius: 12px; padding: 12px 24px; border: 1px solid rgba(255,255,255,0.15); min-width: 120px; color: #fff; height: 72px; box-sizing: border-box; }
    .rv-avg-left { display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid rgba(255,255,255,0.2); padding-right: 16px; }
    .rv-avg-right { display: flex; flex-direction: column; justify-content: center; }
    .rv-avg-num { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 2px; }
    .rv-avg-stars { font-size: 16px; letter-spacing: 2px; line-height: 1; }
    .rv-avg-count { font-size: 11px; opacity: 0.8; margin-top: 4px; display: block; }
    .rv-no-avg { font-size: 14px; font-weight: 500; opacity: 0.9; }

    .rv-list { display: flex; flex-direction: column; gap: 14px; }
    .rv-loading { text-align: center; color: #94a3b8; padding: 48px; font-size: 15px; }
    .rv-empty { text-align: center; color: #94a3b8; padding: 56px 24px; background: #fff; border-radius: 14px; border: 1.5px dashed #e2e8f0; }
    .rv-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .rv-empty p { font-size: 15px; max-width: 360px; margin: 0 auto; line-height: 1.6; }

    .rv-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; transition: box-shadow 0.2s, transform 0.2s; }
    .rv-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }
    .rv-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .rv-reviewer-avatar { width: 40px; height: 40px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; border: 2px solid #dbeafe; }
    .rv-reviewer-info { flex: 1; }
    .rv-reviewer-name { font-size: 15px; font-weight: 700; color: #1e293b; }
    .rv-reviewer-date { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .rv-card-stars { font-size: 18px; }
    .rv-comment { margin: 0; font-size: 14px; color: #475569; line-height: 1.65; border-top: 1px solid #f1f5f9; padding-top: 12px; }

    .rv-star-full { color: #f59e0b; }
    .rv-star-half { color: #fbbf24; opacity: 0.7; }
    .rv-star-empty { color: #d1d5db; }
  `;
  document.head.appendChild(s);
}

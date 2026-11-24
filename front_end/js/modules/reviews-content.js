// State management
let sortOrder = "newest"; // "newest" or "oldest"

export function renderReviewsContent(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Store references globally so handlers can re-render
    window.__rvContainerId = containerId;
    window.__rvCurrentUser = currentUser;

    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    let myReviews = allReviews.filter(r =>
        String(r.guideId).trim() === String(currentUser.id).trim()
    );

    // Apply sort
    if (sortOrder === "newest") {
        myReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
        myReviews.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // --- Calculations ---
    const totalReviews = myReviews.length;
    const avgRating = totalReviews > 0
        ? (myReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : "0.0";

    const ratingCounts = [0, 0, 0, 0, 0];
    myReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating - 1]++; });
    const maxCount = Math.max(...ratingCounts, 1);

    const repliedCount = myReviews.filter(r => r.reply).length;
    const pendingReplies = totalReviews - repliedCount;
    const responseRate = totalReviews > 0
        ? Math.round((repliedCount / totalReviews) * 100)
        : 0;

    // --- Star SVG helper ---
    const starSVG = (filled) => filled
        ? `<svg width="18" height="18" fill="#F59E0B" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`
        : `<svg width="18" height="18" fill="#E5E7EB" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;

    const renderStars = (rating) => Array(5).fill(0).map((_, i) => starSVG(i < rating)).join('');

    // --- Rating distribution bars ---
    const ratingBars = [5, 4, 3, 2, 1].map(star => {
        const count = ratingCounts[star - 1];
        const pct = (count / maxCount) * 100;
        return `
            <div class="rv-dist-row">
                <span class="rv-dist-label">${star}</span>
                <svg width="14" height="14" fill="#F59E0B" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                <div class="rv-dist-bar-bg">
                    <div class="rv-dist-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <span class="rv-dist-count">${count}</span>
            </div>
        `;
    }).join('');

    // --- Avatar (colored circle with initials) ---
    const avatarHTML = (name) => {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];
        const color = colors[initials.charCodeAt(0) % colors.length];
        return `<div class="rv-avatar" style="background: ${color};">${initials}</div>`;
    };

    // --- Review items ---
    const reviewItems = myReviews.map(r => {
        const replySection = r.reply
            ? `<div class="rv-reply-box">
                    <div class="rv-reply-header">
                        <div class="rv-reply-label">
                            <svg width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            <span>Your Reply</span>
                        </div>
                        <div class="rv-reply-edit-actions">
                            <button class="rv-edit-btn" onclick="handleEditReply('${r.id}')" title="Edit reply">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="rv-delete-btn" onclick="handleDeleteReply('${r.id}')" title="Delete reply">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <p class="rv-reply-text">${r.reply}</p>
               </div>`
            : `<div class="rv-reply-actions">
                    <button class="rv-reply-btn" onclick="handleOpenReplyForm('${r.id}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        Reply
                    </button>
                    <span class="rv-pending-badge" onclick="handleOpenReplyForm('${r.id}')" style="cursor:pointer;">Pending Reply</span>
               </div>`;

        return `
            <div class="rv-item" id="rv-item-${r.id}">
                <div class="rv-item-top">
                    <div class="rv-item-left">
                        ${avatarHTML(r.customerName)}
                        <div class="rv-item-meta">
                            <h4 class="rv-item-name">${r.customerName}</h4>
                            <span class="rv-item-tour">${r.tourName || 'Tour'}</span>
                        </div>
                    </div>
                    <span class="rv-item-date">${r.date}</span>
                </div>
                <div class="rv-item-stars">${renderStars(r.rating)}</div>
                <p class="rv-item-comment">${r.comment}</p>
                ${replySection}
                <div class="rv-inline-form" id="rv-form-${r.id}" style="display:none;">
                    <textarea class="rv-reply-textarea" id="rv-textarea-${r.id}" placeholder="Write your reply..." rows="3"></textarea>
                    <div class="rv-form-actions">
                        <button class="rv-form-cancel" onclick="handleCancelReply('${r.id}')">Cancel</button>
                        <button class="rv-form-submit" onclick="handleSubmitReply('${r.id}')">Send Reply</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const sortLabel = sortOrder === "newest" ? "↓ Newest First" : "↑ Oldest First";

    // --- Analytics Modal ---
    const analyticsModal = `
        <div class="rv-analytics-overlay" id="rv-analytics-modal" style="display:none;">
            <div class="rv-analytics-content">
                <div class="rv-analytics-modal-header">
                    <h2>Review Analytics</h2>
                    <button class="rv-analytics-close" onclick="handleCloseAnalytics()">✕</button>
                </div>
                <div class="rv-analytics-body">
                    <div class="rv-analytics-grid">
                        <div class="rv-analytics-stat">
                            <span class="rv-analytics-stat-label">Average Rating</span>
                            <div class="rv-analytics-big">${avgRating}</div>
                            <div class="rv-avg-stars">${renderStars(Math.round(parseFloat(avgRating)))}</div>
                        </div>
                        <div class="rv-analytics-stat">
                            <span class="rv-analytics-stat-label">Total Reviews</span>
                            <div class="rv-analytics-big">${totalReviews}</div>
                            <span class="rv-analytics-stat-sub">All time</span>
                        </div>
                        <div class="rv-analytics-stat">
                            <span class="rv-analytics-stat-label">Response Rate</span>
                            <div class="rv-analytics-big">${responseRate}%</div>
                            <span class="rv-analytics-stat-sub">${repliedCount} of ${totalReviews} replied</span>
                        </div>
                        <div class="rv-analytics-stat">
                            <span class="rv-analytics-stat-label">5-Star Reviews</span>
                            <div class="rv-analytics-big">${ratingCounts[4]}</div>
                            <span class="rv-analytics-stat-sub">${totalReviews > 0 ? Math.round((ratingCounts[4] / totalReviews) * 100) : 0}% of total</span>
                        </div>
                    </div>

                    <div class="rv-analytics-dist-section">
                        <h3>Rating Breakdown</h3>
                        ${[5,4,3,2,1].map(star => {
                            const count = ratingCounts[star - 1];
                            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                            return `
                                <div class="rv-analytics-bar-row">
                                    <span class="rv-analytics-bar-label">${star} star${star !== 1 ? 's' : ''}</span>
                                    <div class="rv-analytics-bar-bg">
                                        <div class="rv-analytics-bar-fill" style="width: ${pct}%;"></div>
                                    </div>
                                    <span class="rv-analytics-bar-pct">${pct}%</span>
                                    <span class="rv-analytics-bar-count">(${count})</span>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="rv-analytics-insights">
                        <h3>Insights</h3>
                        <div class="rv-insight-item">
                            <span class="rv-insight-icon">📊</span>
                            <span>${parseFloat(avgRating) >= 4.5 ? 'Excellent rating! Your customers love your tours.' : parseFloat(avgRating) >= 3.5 ? 'Good rating. Keep improving your tour experience!' : 'There\'s room to improve. Check customer feedback for common themes.'}</span>
                        </div>
                        <div class="rv-insight-item">
                            <span class="rv-insight-icon">${pendingReplies > 0 ? '⚠️' : '✅'}</span>
                            <span>${pendingReplies > 0 ? `You have ${pendingReplies} pending ${pendingReplies === 1 ? 'reply' : 'replies'}. Responding boosts your profile!` : 'All reviews have been replied to. Great job!'}</span>
                        </div>
                        <div class="rv-insight-item">
                            <span class="rv-insight-icon">⭐</span>
                            <span>${ratingCounts[4]} out of ${totalReviews} reviews are 5-star ratings.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Full page HTML ---
    container.innerHTML = `
        <div class="rv-page">
            <!-- Page Header -->
            <div class="rv-header">
                <h1 class="rv-page-title">Reviews</h1>
                <p class="rv-page-subtitle">Customer feedback and ratings</p>
            </div>

            <!-- Summary Row: Avg Rating + Distribution -->
            <div class="rv-summary-row">
                <div class="rv-avg-card">
                    <div class="rv-avg-number">${avgRating}</div>
                    <div class="rv-avg-stars">${renderStars(Math.round(parseFloat(avgRating)))}</div>
                    <p class="rv-avg-subtext">Based on ${totalReviews} reviews</p>
                    <a class="rv-analytics-link" href="javascript:void(0)" onclick="handleOpenAnalytics()">↗ View Analytics</a>
                </div>
                <div class="rv-dist-card">
                    <h3 class="rv-dist-title">Rating Distribution</h3>
                    ${ratingBars}
                </div>
            </div>

            <!-- Mini Stats Row -->
            <div class="rv-mini-stats">
                <div class="rv-mini-card">
                    <span class="rv-mini-label">Total Reviews</span>
                    <h2 class="rv-mini-value">${totalReviews}</h2>
                    <span class="rv-mini-sub rv-sub-blue">All time</span>
                </div>
                <div class="rv-mini-card">
                    <span class="rv-mini-label">Pending Replies</span>
                    <h2 class="rv-mini-value">${pendingReplies}</h2>
                    <span class="rv-mini-sub rv-sub-orange">Needs response</span>
                </div>
                <div class="rv-mini-card">
                    <span class="rv-mini-label">Response Rate</span>
                    <h2 class="rv-mini-value">${responseRate}%</h2>
                    <span class="rv-mini-sub rv-sub-gray">${repliedCount} of ${totalReviews}</span>
                </div>
            </div>

            <!-- All Reviews Section -->
            <div class="rv-all-section">
                <div class="rv-all-header">
                    <div>
                        <h2 class="rv-all-title">All Reviews</h2>
                        <p class="rv-all-subtitle">Customer feedback and replies</p>
                    </div>
                    <button class="rv-sort-btn" onclick="handleToggleSort()">${sortLabel}</button>
                </div>
                <div class="rv-items-list">
                    ${reviewItems || `<div class="empty-state-card"><h2>No Reviews Yet</h2><p class="no-data">Complete more tours to gather feedback!</p></div>`}
                </div>
            </div>
        </div>

        ${analyticsModal}
    `;
}

// ========================
// GLOBAL EVENT HANDLERS
// ========================

// Re-render helper
function reRender() {
    const containerId = window.__rvContainerId;
    const currentUser = window.__rvCurrentUser;
    if (containerId && currentUser) {
        renderReviewsContent(containerId, currentUser);
    }
}

// --- REPLY: Open inline form ---
window.handleOpenReplyForm = (reviewId) => {
    const form = document.getElementById(`rv-form-${reviewId}`);
    const actions = form?.previousElementSibling;
    if (form) {
        form.style.display = "block";
        if (actions) actions.style.display = "none";
        const textarea = document.getElementById(`rv-textarea-${reviewId}`);
        if (textarea) {
            textarea.focus();
            textarea.value = "";
        }
    }
};

// --- REPLY: Cancel ---
window.handleCancelReply = (reviewId) => {
    const form = document.getElementById(`rv-form-${reviewId}`);
    const actions = form?.previousElementSibling;
    if (form) {
        form.style.display = "none";
        if (actions) actions.style.display = "flex";
    }
};

// --- REPLY: Submit ---
window.handleSubmitReply = (reviewId) => {
    const textarea = document.getElementById(`rv-textarea-${reviewId}`);
    const reply = textarea?.value?.trim();
    if (!reply) {
        textarea?.focus();
        return;
    }

    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const idx = allReviews.findIndex(r => r.id === reviewId);
    if (idx !== -1) {
        allReviews[idx].reply = reply;
        localStorage.setItem("reviews", JSON.stringify(allReviews));
        reRender();
    }
};

// --- REPLY: Edit existing ---
window.handleEditReply = (reviewId) => {
    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;

    // Show inline form pre-filled with existing reply
    const form = document.getElementById(`rv-form-${reviewId}`);
    const replyBox = form?.previousElementSibling;
    if (form) {
        form.style.display = "block";
        if (replyBox) replyBox.style.display = "none";
        const textarea = document.getElementById(`rv-textarea-${reviewId}`);
        if (textarea) {
            textarea.value = review.reply || "";
            textarea.focus();
        }
    }
};

// --- REPLY: Delete ---
window.handleDeleteReply = (reviewId) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;

    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const idx = allReviews.findIndex(r => r.id === reviewId);
    if (idx !== -1) {
        allReviews[idx].reply = null;
        localStorage.setItem("reviews", JSON.stringify(allReviews));
        reRender();
    }
};

// --- SORT: Toggle between newest/oldest ---
window.handleToggleSort = () => {
    sortOrder = sortOrder === "newest" ? "oldest" : "newest";
    reRender();
};

// --- ANALYTICS: Open modal ---
window.handleOpenAnalytics = () => {
    const modal = document.getElementById("rv-analytics-modal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
    }
};

// --- ANALYTICS: Close modal ---
window.handleCloseAnalytics = () => {
    const modal = document.getElementById("rv-analytics-modal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => modal.style.display = "none", 250);
    }
};

// Close analytics modal on overlay click
window.addEventListener("click", (e) => {
    const modal = document.getElementById("rv-analytics-modal");
    if (e.target === modal) {
        handleCloseAnalytics();
    }
});

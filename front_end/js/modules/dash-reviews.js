import { filterByGuide } from "../utils/filterByGuide.js";

export function renderDashReviews(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Pull from reviews data (not tours) and filter by guide
    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const myReviews = filterByGuide(allReviews, currentUser.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3); // Show latest 3 on dashboard

    // Star SVG rendering helper
    const starSVG = (filled) => filled
        ? `<svg width="16" height="16" fill="#FBBF24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`
        : `<svg width="16" height="16" fill="#E5E7EB" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;

    const renderStars = (rating) => Array(5).fill(0).map((_, i) => starSVG(i < rating)).join('');

    const reviewsHTML = myReviews.length > 0
        ? myReviews.map(r => `
            <div class="dash-review-item review-inner-card">
                <div class="dash-review-header borderless-header">
                    <div class="dash-review-meta">
                        <h3 class="dash-review-customer">${r.customerName}</h3>
                        <span class="dash-review-tour">${r.tourName || ''}</span>
                    </div>
                    <div class="rating-stars star-yellow">
                        ${renderStars(r.rating)}
                        <span>${r.rating.toFixed(1)}</span>
                    </div>
                </div>
                <p class="dash-review-text dark-text">"${r.comment}"</p>
                <span class="dash-review-date bold-date">${r.date}</span>
            </div>
        `).join('')
        : `<p class="no-data" style="text-align:center; padding: 20px 0;">No reviews yet. Complete tours to get feedback!</p>`;

    container.innerHTML = `
        <div class="dash-reviews-wrapper">
            <h2 class="dash-section-title">Recent Reviews</h2>
            <p class="dash-section-subtitle">Latest feedback from your customers</p>
            
            <div class="dash-reviews-list">
                ${reviewsHTML}
            </div>
            
            <div style="text-align: center; margin-top: 16px;">
                <button class="btn btn-outline-purple" style="border:none;" onclick="window.location.href='./reviews.html'">View All Reviews</button>
            </div>
        </div>
    `;
}

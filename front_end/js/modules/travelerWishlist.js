import { showToast } from "./travelerDashboard.js";

const heartActiveSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const shareSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
const thumbsUpSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;

export function renderTravelerWishlist(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let wishlist = JSON.parse(localStorage.getItem("traveler_wishlist") || "[]");
    
    let emptyState = wishlist.length === 0 ? `<div style="padding: 40px; text-align: center; color: #64748B;">You haven't saved any trips yet! Head back to Explore to add some.</div>` : '';

    const HTML = `
        <div class="dashboard-container" style="padding-top: 20px;">
            <div class="wishlist-header">
                <h1>Your Wishlist</h1>
                <p>${wishlist.length} saved destinations</p>
            </div>

            <div class="wishlist-grid-wrapper">
                <div class="wishlist-grid">
                    ${wishlist.map(item => `
                        <div class="wishlist-card" style="background-image: url('${item.image || "https://images.unsplash.com/photo-1499856871958-5b9627545d1a"}');" data-title="${item.title}">
                            <div class="wishlist-actions">
                                <button class="wishlist-action-btn remove-wish-btn" title="Remove from wishlist">${heartActiveSvg}</button>

                            </div>
                            <button class="wishlist-action-btn likes-btn">
                                ${thumbsUpSvg} ${item.likes || 12}
                            </button>
                            <div class="card-info">
                                <h3>${item.title}</h3>
                                <p>${item.location}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${emptyState}
            </div>
            <div class="saved-items-header">
                <h3>All Saved Items</h3>
                <span>${wishlist.length} items</span>
            </div>
        </div>
    `;

    container.innerHTML = HTML;

    // Attach event listener for removing capability
    const removeBtns = container.querySelectorAll(".remove-wish-btn");
    removeBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const card = e.target.closest('.wishlist-card');
            if (card) {
                const title = card.getAttribute('data-title');
                wishlist = wishlist.filter(i => i.title !== title);
                localStorage.setItem("traveler_wishlist", JSON.stringify(wishlist));
                
                showToast("Removed from Wishlist");
                
                // Complete re-render to update counts and UI immediately
                renderTravelerWishlist(containerId, user);
            }
        });
    });
}

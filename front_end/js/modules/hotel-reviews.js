import { fetchReviews, fetchPartnerHotels } from "../api/services.js";

export async function renderHotelReviews(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="hotel-card-header hotel-flex-header">
            <h2>Customer Reviews</h2>
        </div>
        <div class="hotel-empty-state" style="padding: 40px 20px; border: 1px dashed #cbd5e1; box-shadow: none;">
            <p style="color: #64748b; font-size: 15px; margin: 0;">Loading reviews...</p>
        </div>
    `;

    try {
        const [allReviews, partnerHotels] = await Promise.all([
            fetchReviews(),
            fetchPartnerHotels()
        ]);

        const partnerHotelIds = new Set(partnerHotels.map(h => h.id));
        const hotelReviews = allReviews.filter(r =>
            (r.targetType === "hotel" || r.targetType === "HOTEL") && partnerHotelIds.has(r.targetId)
        );

        if (hotelReviews.length === 0) {
            container.innerHTML = `
                <div class="hotel-card-header hotel-flex-header">
                    <h2>Customer Reviews</h2>
                </div>
                <div class="hotel-empty-state" style="padding: 40px 20px; border: 1px dashed #cbd5e1; box-shadow: none;">
                    <p style="color: #64748b; font-size: 15px; margin: 0;">No reviews available yet. When travellers review your hotels, they will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="hotel-card-header hotel-flex-header">
                <h2>Customer Reviews</h2>
            </div>
            <div class="reviews-list" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                ${hotelReviews.map(r => `
                    <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong>User ${r.userId}</strong>
                            <span style="color: #f59e0b;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        <p style="color: #475569; margin: 0;">${r.comment || 'No comment provided.'}</p>
                        ${r.image ? `
                        <div style="margin-top: 10px;">
                            <span style="display: inline-block; padding: 4px 8px; background: #e2e8f0; border-radius: 4px; font-size: 12px; color: #475569;">
                                📎 Attached: ${r.image}
                            </span>
                        </div>
                        ` : ''}
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">Hotel ID: ${r.targetId}</small>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error("Failed to load hotel reviews:", error);
        container.innerHTML = `
            <div class="hotel-card-header hotel-flex-header">
                <h2>Customer Reviews</h2>
            </div>
            <div class="hotel-empty-state" style="padding: 40px 20px; border: 1px dashed #cbd5e1; box-shadow: none;">
                <p style="color: #ef4444; font-size: 15px; margin: 0;">Failed to load reviews. Please try again later.</p>
            </div>
        `;
    }
}
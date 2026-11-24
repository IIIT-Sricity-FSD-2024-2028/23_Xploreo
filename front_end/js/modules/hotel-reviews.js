export function renderHotelReviews(containerId) {
    const container = document.getElementById(containerId);
    
    const reviews = JSON.parse(localStorage.getItem("hotelReviews")) || [];
    console.log(reviews);
    const html = `
        <div class="hotel-card-header hotel-flex-header">
            <h2>Customer Reviews</h2>
            <span class="hotel-link">View All Reviews</span>
        </div>

        <div class="hotel-review-grid">
            ${reviews.map(r => `
                <div class="hotel-review-box">

                    <div class="hotel-review-header">
                        <p class="hotel-cust-name">${r.name}</p>
                        <span class="hotel-sub-text">${r.date}</span>
                    </div>

                    <p class="hotel-review-text">${r.review}</p>

                    <div class="hotel-stars">
                        ${"⭐".repeat(r.rating)}
                    </div>

                </div>
            `).join("")}
        </div>
    `;
    console.log(html);
    container.innerHTML = html;
}
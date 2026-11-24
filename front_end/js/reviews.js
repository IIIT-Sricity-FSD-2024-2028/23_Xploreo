import { apiGetAndSync, apiPostAndSync, apiDeleteAndSync, apiPatchAndSync } from "./utils/api.js";

function getStorage(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function setStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function showMessage(messageEl, text, isSuccess = false) {
    messageEl.textContent = text;
    messageEl.hidden = false;
    messageEl.classList.toggle("success", isSuccess);
}

function clearMessage(messageEl) {
    messageEl.textContent = "";
    messageEl.hidden = true;
}

export function renderReviewsPage(containerId, currentUser = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="crud-page">
            <header class="crud-page-header">
                <div>
                    <h1>Reviews</h1>
                    <p>Add reviews, filter by target, and manage feedback.</p>
                </div>
            </header>
            <section class="crud-panel">
                <h2 id="formTitle">Add Review</h2>
                <div id="crudMessage" class="crud-message" hidden></div>
                <form id="reviewForm" class="crud-form">
                    <input type="hidden" id="reviewId">
                    <label>User ID<input id="userId" type="number" required></label>
                    <label>Target type<select id="targetType"><option value="guide">Guide</option><option value="hotel">Hotel</option><option value="experience">Experience</option></select></label>
                    <label>Target ID<input id="targetId" type="number" required></label>
                    <label>Rating<select id="rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
                    <label class="crud-full">Comment<textarea id="comment" required></textarea></label>
                    <div class="crud-actions crud-full">
                        <button type="submit" class="crud-btn crud-primary">Save Review</button>
                        <button type="button" id="resetBtn" class="crud-btn">Clear</button>
                    </div>
                </form>
            </section>
            <section class="crud-panel">
                <div class="crud-toolbar">
                    <h2>All Reviews</h2>
                    <select id="targetFilter">
                        <option value="">All targets</option>
                        <option value="guide">Guide</option>
                        <option value="hotel">Hotel</option>
                        <option value="experience">Experience</option>
                    </select>
                </div>
                <div id="reviewList" class="crud-grid"></div>
            </section>
        </div>
    `;

    const form = document.getElementById("reviewForm");
    const list = document.getElementById("reviewList");
    const message = document.getElementById("crudMessage");
    const formTitle = document.getElementById("formTitle");
    const targetFilter = document.getElementById("targetFilter");
    let reviews = [];

    const getPayload = () => ({
        userId: Number(document.getElementById("userId").value),
        targetType: document.getElementById("targetType").value,
        targetId: Number(document.getElementById("targetId").value),
        rating: Number(document.getElementById("rating").value),
        comment: document.getElementById("comment").value.trim()
    });

    const resetForm = () => {
        form.reset();
        document.getElementById("reviewId").value = "";
        document.getElementById("userId").value = currentUser?.id || currentUser?.userId || "";
        formTitle.textContent = "Add Review";
        clearMessage(message);
    };

    const fillForm = (review) => {
        document.getElementById("reviewId").value = review.id;
        document.getElementById("userId").value = review.userId;
        document.getElementById("targetType").value = review.targetType;
        document.getElementById("targetId").value = review.targetId;
        document.getElementById("rating").value = review.rating;
        document.getElementById("comment").value = review.comment || "";
        formTitle.textContent = `Edit Review ${review.id}`;
    };

    const renderReviews = () => {
        const filter = targetFilter.value;
        const visible = filter ? reviews.filter((review) => review.targetType === filter) : reviews;
        list.innerHTML = visible.length ? visible.map((review) => `
            <article class="crud-card">
                <h3>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</h3>
                <div class="crud-meta">
                    <strong>ID:</strong> ${review.id}<br>
                    <strong>User ID:</strong> ${review.userId}<br>
                    <strong>Target:</strong> ${review.targetType} #${review.targetId}<br>
                    <strong>Rating:</strong> ${review.rating}/5<br>
                    <strong>Created:</strong> ${review.createdAt ? new Date(review.createdAt).toLocaleString() : "-"}
                </div>
                <p class="crud-meta">${review.comment || ""}</p>
                <div class="crud-card-actions">
                    <button class="crud-btn" data-action="edit" data-id="${review.id}">Edit</button>
                    <button class="crud-btn crud-danger" data-action="delete" data-id="${review.id}">Delete</button>
                </div>
            </article>
        `).join("") : '<p class="crud-meta">No reviews found.</p>';
    };

    const loadReviews = async () => {
        try {
            clearMessage(message);
            reviews = await apiGetAndSync("/reviews", "reviews");
            if (!Array.isArray(reviews)) reviews = getStorage("reviews");
            renderReviews();
        } catch (error) {
            showMessage(message, error.message);
            list.innerHTML = '<p class="crud-meta">Unable to load reviews.</p>';
        }
    };

    form.onsubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById("reviewId").value;
        try {
            const data = getPayload();
            if (id) {
                await apiPatchAndSync(`/reviews/${id}`, data, "reviews");
            } else {
                await apiPostAndSync("/reviews", data, "reviews");
            }
            showMessage(message, "Review saved successfully.", true);
            resetForm();
            await loadReviews();
        } catch (error) {
            showMessage(message, error.message);
        }
    };

    list.onclick = async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const id = button.dataset.id;
        const review = reviews.find((item) => String(item.id) === String(id));
        if (button.dataset.action === "edit" && review) fillForm(review);
        if (button.dataset.action === "delete") {
            try {
                await apiDeleteAndSync(`/reviews/${id}`, "reviews", id);
                showMessage(message, "Review deleted successfully.", true);
                await loadReviews();
            } catch (error) {
                showMessage(message, error.message);
            }
        }
    };

    targetFilter.onchange = renderReviews;
    document.getElementById("resetBtn").onclick = resetForm;
    resetForm();
    void loadReviews();
}

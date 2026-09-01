export function renderinternalcontents(containerId, currentUser, currentActiveTab) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allRequests = JSON.parse(localStorage.getItem("tours")) || [];
    
    // Defensive check for currentUser
    if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem("currentUser")) || { id: "00001" };
    }

    let myRequests = allRequests.filter(req => 
        String(req.guideId).trim() === String(currentUser.id).trim() && req.status === currentActiveTab
    );

    if (currentActiveTab === "pending") { // Represents "Upcoming"
        if (myRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h2>Upcoming Tours</h2>
                    <p class='no-data'>No upcoming tours assigned for you right now.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="tours-grid">
                ${myRequests.map(req => `
                    <div class="tour-card">
                        <div class="card-badge"><span class="badge badge-confirmed">Confirmed</span></div>
                        <h2 class="card-title">${req.title}</h2>
                        
                        <div class="tour-meta-grid">
                            <div class="meta-item">
                                <img src="../components/ui/user.svg" alt="user" class="meta-icon" />
                                <span>${req.customer}</span>
                            </div>
                            <div class="meta-item">
                                <img src="../components/ui/support.svg" alt="phone" class="meta-icon" />
                                <span>${req.phone || "N/A"}</span>
                            </div>
                            <div class="meta-item">
                                <img src="../components/ui/upcomingtours.svg" alt="date" class="meta-icon" />
                                <span>${req.dateTime.split(" | ")[0]}</span>
                            </div>
                            <div class="meta-item">
                                <img src="../components/ui/schedule.svg" alt="time" class="meta-icon" />
                                <span>${req.dateTime.split(" | ")[1]}</span>
                            </div>
                            <div class="meta-item">
                                <img src="../components/ui/tours.svg" alt="location" class="meta-icon" />
                                <span>${req.destination}</span>
                            </div>
                        </div>

                        <div class="card-footer-info">
                            <div class="guests-amount">
                                <p class="guests">${req.guests} guests</p>
                                <p class="amount">₹${req.amount}</p>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-solid-blue" onclick="handleTourStart('${req.id}')">Start</button>
                                <button class="btn btn-outline-blue" onclick="openTourModal('${req.id}')">Details</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } else if (currentActiveTab === 'ongoing') {
        if (myRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h2>Ongoing Tours</h2>
                    <p class='no-data'>You don't have any tours in progress right now.</p>
                </div>`;
            return;
        }

        container.innerHTML = myRequests.map(req => {
            const itinerary = req.plan_iternary || [];
            const totalSteps = itinerary.length || 1;
            const currentStepIndex = itinerary.indexOf(req.currentloction);
            const displayIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
            const progress = Math.round((displayIndex / (totalSteps - 1 || 1)) * 100);
            const nextStop = itinerary[displayIndex + 1] || "Arrived";

            return `
                <div class="ongoing-tour-card">
                    <div class="card-top-header">
                        <div class="title-row">
                            <h2>${req.title}</h2>
                            <span class="badge badge-ongoing">In Progress</span>
                        </div>
                        <div class="price-guests">
                            <h3 class="price">₹${req.amount}</h3>
                            <p class="guests-small">${req.guests} guests</p>
                        </div>
                    </div>
                    <p class="customer-subtitle">${req.customer}</p>

                    <div class="info-boxes">
                        <div class="info-box light-blue">
                            <label>Started At</label>
                            <span>${req.dateTime.split(' | ')[1]}</span>
                        </div>
                        <div class="info-box light-purple">
                            <label>Duration</label>
                            <span>${req.duration || "N/A"}</span>
                        </div>
                        <div class="info-box light-orange">
                            <label>Next Stop</label>
                            <span class="next-stop-text">${nextStop}</span>
                        </div>
                    </div>

                    <div class="progress-section">
                        <div class="progress-labels">
                            <label>Tour Progress</label>
                            <span class="percent text-blue">${progress}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-fill" style="width: ${progress}%;"></div>
                        </div>
                    </div>

                    <div class="action-buttons-ongoing">
                        <button class="btn btn-solid-blue flex-btn">
                            <img src="../components/ui/support.svg" alt="call" class="btn-icon" style="filter: brightness(0) invert(1);" /> Call Customer
                        </button>
                        <button class="btn btn-outline-blue flex-btn" onclick="openTourModal('${req.id}')">
                            <img src="../components/ui/tours.svg" alt="route" class="btn-icon" /> View Route
                        </button>
                        <button class="btn btn-outline-green flex-btn" onclick="handleTourAction('${req.id}')">
                            <img src="../components/ui/schedule.svg" alt="complete" class="btn-icon" /> ${displayIndex >= totalSteps - 1 ? 'Finish Tour' : 'Complete'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } else if (currentActiveTab === "completed") {
        if (myRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h2>Completed Tours</h2>
                    <p class='no-data'>No completed tours yet!</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="tours-list-vertical">
                ${myRequests.map(req => {
                    const stars = Array(5).fill(0).map((_, i) => i < (req.rating || 5) ? '★' : '☆').join('');
                    return `
                    <div class="completed-tour-card">
                        <div class="comp-header">
                            <h2>${req.title}</h2>
                            <h3 class="price">₹${req.amount}</h3>
                        </div>
                        <div class="comp-sub">
                            <div class="comp-icons">
                                <span class="cust-info">
                                    <img src="../components/ui/user.svg" alt="user" /> ${req.customer}
                                </span>
                                <span class="cust-info">
                                    <img src="../components/ui/upcomingtours.svg" alt="date" /> ${req.dateTime.split(" | ")[0]}
                                </span>
                                <span class="cust-info">${req.guests} guests</span>
                            </div>
                            <div class="rating-stars">${stars}</div>
                        </div>

                        ${req.review ? `
                        <div class="customer-review-box">
                            <label><img src="../css/icons/message.svg" alt="chat" /> Customer Review</label>
                            <p>${req.review}</p>
                        </div>
                        ` : ''}

                        <div class="comp-actions">
                            <button class="btn btn-outline-blue" onclick="openTourModal('${req.id}')">View Details</button>
                            <button class="btn btn-outline-purple">Download Receipt</button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    }
}

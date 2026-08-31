(function renderFlightCardDemo() {
    const mountNode = document.getElementById("flight-card-demo");
    if (!mountNode) return;

    const flight = {
        airline: "Emirates",
        code: "EK 523",
        departureTime: "08:15",
        arrivalTime: "22:45",
        from: "NYC",
        to: "BOM",
        duration: "14h 30m",
        stops: 0,
        price: 1245
    };

    mountNode.innerHTML = createFlightCard(flight);
})();

function createFlightCard(flight) {
    const departure = splitTime(flight.departureTime);
    const arrival = splitTime(flight.arrivalTime);

    return `
        <section class="flight-card-shell">
            <article class="flight-card">
                <div class="airline-section">
                    <div class="airline-logo">${getInitials(flight.airline)}</div>
                    <div class="airline-copy">
                        <h2>${escapeHtml(flight.airline)}</h2>
                        <p>${escapeHtml(flight.code)}</p>
                    </div>
                </div>

                <div class="time-section departure">
                    <div class="time-value">${departure.time}</div>
                    <div class="time-meridiem">${departure.period}</div>
                    <div class="time-city">${escapeHtml(flight.from)}</div>
                </div>

                <div class="path-section">
                    <div class="path-line">
                        <span class="path-plane" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 16.5 22 12 2 7.5l5 4.5z"></path>
                            </svg>
                        </span>
                    </div>
                    <div class="path-duration">${escapeHtml(flight.duration)}</div>
                    <div class="path-stops">${escapeHtml(getStopsLabel(flight.stops))}</div>
                </div>

                <div class="time-section arrival">
                    <div class="time-value">${arrival.time}</div>
                    <div class="time-meridiem">${arrival.period}</div>
                    <div class="time-city">${escapeHtml(flight.to)}</div>
                </div>

                <div class="price-section">
                    <div class="card-top-actions">
                        <span class="save-pill">Save</span>
                        <button class="save-button" type="button" aria-label="Save flight">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m12 21-1.45-1.32C5.4 15.03 2 11.92 2 8.08 2 5 4.42 2.6 7.5 2.6c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 2.6C19.58 2.6 22 5 22 8.08c0 3.84-3.4 6.95-8.55 11.6z"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="price-amount">$${flight.price}</div>
                    <div class="price-subtext">per person</div>
                    <div class="price-divider" aria-hidden="true"></div>
                    <div class="price-meta">${escapeHtml(flight.duration)}<br>${escapeHtml(getStopsLabel(flight.stops))}</div>
                    <button class="details-button" type="button">View Details</button>
                </div>
            </article>
        </section>
    `;
}

function splitTime(value) {
    const [hourString, minute] = String(value).split(":");
    const hour = Number(hourString);
    const period = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;
    return {
        time: `${String(normalizedHour).padStart(2, "0")}:${minute}`,
        period
    };
}

function getStopsLabel(stops) {
    if (stops === 0) return "Non-stop";
    if (stops === 1) return "1 stop";
    return "2+ stops";
}

function getInitials(airline) {
    return String(airline)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

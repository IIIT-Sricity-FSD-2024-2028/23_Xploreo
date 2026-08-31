import {
    calculateTravelerBookingTotal,
    createEmptyTraveler,
    createTravelerConfirmation,
    createTravelerDraft,
    formatBookingCurrency,
    getSelectedTravelerPackage,
    getTravelerBookingDraft,
    inferTravelerCount,
    normalizeTraveler,
    saveTravelerBookingConfirmation,
    saveTravelerBookingDraft
} from "./dashboard.js";

document.addEventListener("DOMContentLoaded", () => {
    renderTravelerBookingDetailsPage("traveler-booking-details-app");
});

function renderTravelerBookingDetailsPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedPackage = getSelectedTravelerPackage();
    const existingDraft = getTravelerBookingDraft();
    const packageView = buildPackageViewModel(selectedPackage);

    const state = {
        packageData: selectedPackage,
        travelers: getInitialTravelers(selectedPackage, existingDraft),
        selectedDate: existingDraft?.packageData?.departureDate || selectedPackage.departureDate || "",
        activeGalleryIndex: 0,
        itinerary: cloneItinerary(packageView.itinerary),
        modal: null
    };

    function render() {
        const travelerCount = state.travelers.length;
        const totalPrice = calculateTravelerBookingTotal(state.packageData, travelerCount);
        const activeImage = packageView.gallery[state.activeGalleryIndex] || packageView.gallery[0];

        container.innerHTML = `
            <main class="traveler-package-detail-page">
                <section class="traveler-detail-header-card">
                    <div class="traveler-detail-breadcrumbs">
                        <a href="./dashboard.html">Home</a>
                        <span>/</span>
                        <a href="./package-search.html">Holidays</a>
                        <span>/</span>
                        <strong>${escapeHtml(state.packageData.title)}</strong>
                    </div>

                    <div class="traveler-detail-title-row">
                        <div>
                            <h1>${escapeHtml(state.packageData.title)}</h1>
                            <div class="traveler-detail-submeta">
                                <span>${pinIcon()} ${escapeHtml(packageView.locationLabel)}</span>
                                <span>${calendarIcon()} Duration: ${state.packageData.nights}N/${state.packageData.days}D</span>
                                <span class="traveler-rating-pill">${starIcon()} ${packageView.rating}</span>
                                <span>(${packageView.reviews} reviews)</span>
                            </div>
                        </div>

                        <div class="traveler-detail-actions">
                            <button type="button" class="traveler-circle-action" aria-label="Save package">${heartIcon()}</button>
                            <button type="button" class="traveler-circle-action" aria-label="Share package">${shareIcon()}</button>
                        </div>
                    </div>
                </section>

                <section class="traveler-detail-layout">
                    <div class="traveler-detail-main">
                        <section class="traveler-panel traveler-gallery-panel">
                            <img class="traveler-hero-image" src="${escapeHtml(activeImage)}" alt="${escapeHtml(state.packageData.title)}">
                            <div class="traveler-gallery-counter">${state.activeGalleryIndex + 1} / ${packageView.gallery.length}</div>
                            <div class="traveler-gallery-strip">
                                ${packageView.gallery.map((image, index) => `
                                    <button type="button" class="traveler-gallery-thumb ${index === state.activeGalleryIndex ? "active" : ""}" data-gallery-index="${index}">
                                        <img src="${escapeHtml(image)}" alt="${escapeHtml(state.packageData.title)} preview ${index + 1}">
                                    </button>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-panel">
                            <h2>Package Highlights</h2>
                            <div class="traveler-highlight-grid">
                                ${packageView.highlights.map((item) => `
                                    <article class="traveler-highlight-item">
                                        <span class="traveler-highlight-icon">${item.icon}</span>
                                        <span>${escapeHtml(item.label)}</span>
                                    </article>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-panel">
                            <div class="traveler-section-heading">
                                <h2>Day-wise Itinerary</h2>
                                <span>Customizable</span>
                            </div>

                            <div class="traveler-itinerary-list">
                                ${state.itinerary.map((day, dayIndex) => `
                                    <article class="traveler-day-block">
                                        <div class="traveler-day-marker">${dayIndex + 1}</div>
                                        <div class="traveler-day-content">
                                            <h3>Day ${dayIndex + 1}: ${escapeHtml(day.title)}</h3>
                                            ${day.items.map((item, itemIndex) => `
                                                <div class="traveler-itinerary-card">
                                                    <div class="traveler-itinerary-copy">
                                                        <div class="traveler-itinerary-icon">${item.icon}</div>
                                                        <div>
                                                            <h4>${escapeHtml(item.name)}</h4>
                                                            <p>${escapeHtml(item.detail)}</p>
                                                            ${item.selected ? `<small>Selected: ${escapeHtml(item.selected)}</small>` : ""}
                                                        </div>
                                                    </div>
                                                    <div class="traveler-itinerary-actions">
                                                        <button type="button" data-remove-item="${dayIndex}:${itemIndex}">REMOVE</button>
                                                        <button type="button" data-modify-item="${dayIndex}:${itemIndex}">MODIFY</button>
                                                    </div>
                                                </div>
                                            `).join("")}
                                            <div class="traveler-add-day-card">
                                                <div class="traveler-itinerary-copy">
                                                    <div class="traveler-itinerary-icon traveler-itinerary-icon-soft">${sparkleIcon()}</div>
                                                    <div>
                                                        <h4>Add Activities to your day</h4>
                                                        <p>Spend the day at leisure or add an activity, transfer or meal</p>
                                                    </div>
                                                </div>
                                                <button type="button" data-add-to-day="${dayIndex}">ADD TO DAY</button>
                                            </div>
                                        </div>
                                    </article>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-double-column">
                            <article class="traveler-panel">
                                <h2>Inclusions</h2>
                                <ul class="traveler-bullet-list">
                                    ${packageView.inclusions.map((item) => `<li>${checkCircleIcon()}<span>${escapeHtml(item)}</span></li>`).join("")}
                                </ul>
                            </article>

                            <article class="traveler-panel">
                                <h2>Exclusions</h2>
                                <ul class="traveler-bullet-list traveler-bullet-list-negative">
                                    ${packageView.exclusions.map((item) => `<li>${closeCircleIcon()}<span>${escapeHtml(item)}</span></li>`).join("")}
                                </ul>
                            </article>
                        </section>

                        <section class="traveler-panel traveler-traveler-form-panel" id="traveler-details-section">
                            <div class="traveler-section-heading">
                                <div>
                                    <h2>Traveler Details</h2>
                                    <p>Fill traveler information before continuing to confirmation.</p>
                                </div>
                                <button type="button" class="traveler-secondary-button" id="add-traveler-btn">Add traveler</button>
                            </div>

                            <div class="traveler-form-grid">
                                ${state.travelers.map((traveler, index) => renderTravelerCard(traveler, index)).join("")}
                            </div>

                            <div class="traveler-action-row">
                                <button type="button" class="traveler-secondary-button" id="save-draft-btn">Save details</button>
                                <button type="button" class="traveler-primary-button" id="continue-booking-btn">Continue to confirmation</button>
                            </div>
                            <p class="traveler-feedback" id="traveler-booking-feedback"></p>
                        </section>
                    </div>

                    <aside class="traveler-detail-sidebar">
                        <section class="traveler-panel traveler-sidebar-panel">
                            <p class="traveler-sidebar-label">Starting from (per person)</p>
                            <div class="traveler-sidebar-price">${formatBookingCurrency(state.packageData.pricePerPerson)}</div>
                            <p class="traveler-sidebar-total">Total for ${travelerCount} traveler${travelerCount > 1 ? "s" : ""}: ${formatBookingCurrency(totalPrice)}</p>

                            <label class="traveler-sidebar-field">
                                <span>Select Date</span>
                                <div class="traveler-sidebar-input">
                                    ${calendarIcon()}
                                    <input type="date" id="traveler-package-date" value="${escapeHtml(state.selectedDate)}">
                                </div>
                            </label>

                            <div class="traveler-sidebar-field">
                                <span>Number of Travelers</span>
                                <div class="traveler-traveler-stepper">
                                    <button type="button" data-traveler-step="-1">-</button>
                                    <div>
                                        <strong>${travelerCount}</strong>
                                        <span>Travelers</span>
                                    </div>
                                    <button type="button" data-traveler-step="1">+</button>
                                </div>
                            </div>

                            <div class="traveler-sidebar-summary">
                                <div><span>Duration</span><strong>${state.packageData.nights}N/${state.packageData.days}D</strong></div>
                                <div><span>Destination</span><strong>${escapeHtml(packageView.locationLabel)}</strong></div>
                                <div><span>Hotel</span><strong>${escapeHtml(state.packageData.hotelCategory)}★ Resort</strong></div>
                            </div>

                            <button type="button" class="traveler-primary-button traveler-sidebar-book" id="book-now-btn">Book Now</button>

                            <ul class="traveler-assurance-list">
                                <li>${checkCircleIcon()} Free cancellation up to 48 hours</li>
                                <li>${checkCircleIcon()} Instant booking confirmation</li>
                                <li>${checkCircleIcon()} Best price guarantee</li>
                                <li>${checkCircleIcon()} 24/7 customer support</li>
                            </ul>
                        </section>
                    </aside>
                </section>

                ${renderModal(state.modal)}
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-gallery-index]").forEach((button) => {
            button.addEventListener("click", () => {
                state.activeGalleryIndex = Number(button.dataset.galleryIndex);
                render();
            });
        });

        container.querySelectorAll("[data-traveler-step]").forEach((button) => {
            button.addEventListener("click", () => {
                const nextCount = Math.max(1, state.travelers.length + Number(button.dataset.travelerStep));
                syncTravelerCount(nextCount);
                persistDraft(false);
                render();
            });
        });

        container.querySelector("#traveler-package-date")?.addEventListener("change", (event) => {
            state.selectedDate = event.target.value;
            persistDraft(false);
        });

        container.querySelector("#book-now-btn")?.addEventListener("click", () => {
            document.getElementById("traveler-details-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        container.querySelectorAll("[data-remove-item]").forEach((button) => {
            button.addEventListener("click", () => {
                const [dayIndex, itemIndex] = button.dataset.removeItem.split(":").map(Number);
                state.itinerary[dayIndex].items.splice(itemIndex, 1);
                render();
            });
        });

        container.querySelectorAll("[data-modify-item]").forEach((button) => {
            button.addEventListener("click", () => {
                const [dayIndex, itemIndex] = button.dataset.modifyItem.split(":").map(Number);
                openModifyModal(dayIndex, itemIndex);
            });
        });

        container.querySelectorAll("[data-add-to-day]").forEach((button) => {
            button.addEventListener("click", () => {
                openAddModal(Number(button.dataset.addToDay));
            });
        });

        container.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", closeModal);
        });

        container.querySelector(".traveler-modal-backdrop")?.addEventListener("click", (event) => {
            if (event.target.classList.contains("traveler-modal-backdrop")) {
                closeModal();
            }
        });

        container.querySelectorAll("[data-select-option]").forEach((button) => {
            button.addEventListener("click", () => {
                const [dayIndex, itemIndex, optionIndex] = button.dataset.selectOption.split(":").map(Number);
                applyModifySelection(dayIndex, itemIndex, optionIndex);
            });
        });

        container.querySelectorAll("[data-add-option]").forEach((button) => {
            button.addEventListener("click", () => {
                const [dayIndex, optionIndex] = button.dataset.addOption.split(":").map(Number);
                applyAddSelection(dayIndex, optionIndex);
            });
        });

        container.querySelectorAll("[data-traveler-field]").forEach((input) => {
            input.addEventListener("input", handleFieldUpdate);
            input.addEventListener("change", handleFieldUpdate);
        });

        container.querySelectorAll("[data-remove-traveler]").forEach((button) => {
            button.addEventListener("click", () => {
                if (state.travelers.length === 1) {
                    setFeedback("At least one traveler is required.", true);
                    return;
                }

                state.travelers = state.travelers.filter((traveler) => traveler.id !== button.dataset.removeTraveler);
                persistDraft(false);
                render();
            });
        });

        container.querySelector("#add-traveler-btn")?.addEventListener("click", () => {
            state.travelers = [...state.travelers, createEmptyTraveler(state.travelers.length)];
            persistDraft(false);
            render();
        });

        container.querySelector("#save-draft-btn")?.addEventListener("click", () => {
            persistDraft(true);
        });

        container.querySelector("#continue-booking-btn")?.addEventListener("click", () => {
            const validation = validateTravelers(state.travelers);
            if (!validation.valid) {
                setFeedback(validation.message, true);
                return;
            }

            const draft = createTravelerDraft({
                ...state.packageData,
                departureDate: state.selectedDate,
                itinerary: state.itinerary
            }, state.travelers);
            const confirmation = createTravelerConfirmation(draft);

            saveTravelerBookingDraft(draft);
            saveTravelerBookingConfirmation(confirmation);
            window.location.href = "./booking-confirmation.html";
        });
    }

    function openModifyModal(dayIndex, itemIndex) {
        const item = state.itinerary[dayIndex].items[itemIndex];
        state.modal = {
            type: "modify",
            dayIndex,
            itemIndex,
            title: `Modify ${item.name}`,
            subtitle: "Choose another option for this itinerary item",
            options: getModifyOptions(item)
        };
        render();
    }

    function openAddModal(dayIndex) {
        state.modal = {
            type: "add",
            dayIndex,
            title: `Add Activities to Day ${dayIndex + 1}`,
            subtitle: "Choose an activity to add to your itinerary",
            options: getAddOptions(state.packageData.destination, dayIndex)
        };
        render();
    }

    function closeModal() {
        state.modal = null;
        render();
    }

    function applyModifySelection(dayIndex, itemIndex, optionIndex) {
        const option = state.modal?.options?.[optionIndex];
        if (!option) return;

        state.itinerary[dayIndex].items[itemIndex] = {
            ...state.itinerary[dayIndex].items[itemIndex],
            name: option.name,
            detail: option.detail,
            selected: option.selected,
            icon: option.icon
        };

        closeModal();
    }

    function applyAddSelection(dayIndex, optionIndex) {
        const option = state.modal?.options?.[optionIndex];
        if (!option) return;

        state.itinerary[dayIndex].items.push({
            name: option.name,
            detail: option.detail,
            selected: option.selected,
            icon: option.icon
        });

        closeModal();
    }

    function handleFieldUpdate(event) {
        const fieldName = event.target.dataset.travelerField;
        const travelerId = event.target.dataset.travelerId;

        state.travelers = state.travelers.map((traveler, index) => {
            if (traveler.id !== travelerId) return traveler;
            return normalizeTraveler({ ...traveler, [fieldName]: event.target.value }, index);
        });

        persistDraft(false);
    }

    function syncTravelerCount(nextCount) {
        if (nextCount > state.travelers.length) {
            const additions = Array.from({ length: nextCount - state.travelers.length }, (_, index) => createEmptyTraveler(state.travelers.length + index));
            state.travelers = [...state.travelers, ...additions];
            return;
        }

        state.travelers = state.travelers.slice(0, nextCount);
    }

    function persistDraft(showMessage) {
        const draft = createTravelerDraft({
            ...state.packageData,
            departureDate: state.selectedDate,
            itinerary: state.itinerary
        }, state.travelers);
        saveTravelerBookingDraft(draft);

        if (showMessage) {
            setFeedback("Traveler details saved successfully.");
        }
    }

    function setFeedback(message, isError = false) {
        const feedback = container.querySelector("#traveler-booking-feedback");
        if (!feedback) return;
        feedback.textContent = message;
        feedback.dataset.error = isError ? "true" : "false";
    }

    render();
}

function renderModal(modal) {
    if (!modal) return "";

    if (modal.type === "modify") {
        return `
            <div class="traveler-modal-backdrop">
                <div class="traveler-modal">
                    <div class="traveler-modal-header">
                        <div>
                            <h3>${escapeHtml(modal.title)}</h3>
                            <p>${escapeHtml(modal.subtitle)}</p>
                        </div>
                        <button type="button" class="traveler-modal-close" data-close-modal>&times;</button>
                    </div>
                    <div class="traveler-modal-body">
                        ${modal.options.map((option, optionIndex) => `
                            <article class="traveler-modal-option ${option.selectedTag ? "active" : ""}">
                                <div class="traveler-modal-option-media">
                                    <img src="${escapeHtml(option.image)}" alt="${escapeHtml(option.name)}">
                                </div>
                                <div class="traveler-modal-option-content">
                                    <div class="traveler-modal-option-top">
                                        <div>
                                            <h4>${escapeHtml(option.name)}</h4>
                                            <p>${escapeHtml(option.subtitle)}</p>
                                        </div>
                                        ${option.selectedTag ? `<span class="traveler-option-selected">${escapeHtml(option.selectedTag)}</span>` : ""}
                                    </div>
                                    <div class="traveler-modal-chip-row">
                                        ${option.features.map((feature) => `<span>${checkCircleIcon()}${escapeHtml(feature)}</span>`).join("")}
                                    </div>
                                    <div class="traveler-modal-option-footer">
                                        <strong>${escapeHtml(option.priceLabel)}</strong>
                                        <button type="button" class="traveler-primary-button traveler-modal-select" data-select-option="${modal.dayIndex}:${modal.itemIndex}:${optionIndex}">SELECT</button>
                                    </div>
                                </div>
                            </article>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="traveler-modal-backdrop">
            <div class="traveler-modal">
                <div class="traveler-modal-header">
                    <div>
                        <h3>${escapeHtml(modal.title)}</h3>
                        <p>${escapeHtml(modal.subtitle)}</p>
                    </div>
                    <button type="button" class="traveler-modal-close" data-close-modal>&times;</button>
                </div>
                <div class="traveler-modal-body">
                    ${modal.options.map((option, optionIndex) => `
                        <article class="traveler-modal-option ${option.selectedTag ? "active" : ""}">
                            <div class="traveler-modal-option-media">
                                <img src="${escapeHtml(option.image)}" alt="${escapeHtml(option.name)}">
                            </div>
                            <div class="traveler-modal-option-content">
                                <div class="traveler-modal-option-top">
                                    <div>
                                        <h4>${escapeHtml(option.name)}</h4>
                                        <p>${escapeHtml(option.subtitle)}</p>
                                        <div class="traveler-modal-rating">${starIcon()} ${escapeHtml(option.rating)} <span>(${escapeHtml(option.reviews)} reviews)</span></div>
                                    </div>
                                    <strong>${escapeHtml(option.priceLabel)}</strong>
                                </div>
                                <div class="traveler-modal-chip-row">
                                    ${option.features.map((feature) => `<span>${checkCircleIcon()}${escapeHtml(feature)}</span>`).join("")}
                                </div>
                                <div class="traveler-modal-option-footer">
                                    <button type="button" class="traveler-modal-link">VIEW DETAILS</button>
                                    <button type="button" class="traveler-primary-button traveler-modal-select" data-add-option="${modal.dayIndex}:${optionIndex}">ADD TO DAY</button>
                                </div>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </div>
        </div>
    `;
}

function getInitialTravelers(selectedPackage, existingDraft) {
    if (existingDraft?.packageId === selectedPackage.id && existingDraft.travelers?.length) {
        return existingDraft.travelers.map((traveler, index) => normalizeTraveler(traveler, index));
    }

    return Array.from({ length: inferTravelerCount(selectedPackage) }, (_, index) => createEmptyTraveler(index));
}

function validateTravelers(travelers) {
    for (let index = 0; index < travelers.length; index += 1) {
        const traveler = travelers[index];
        if (!traveler.name) return { valid: false, message: `Traveler ${index + 1} is missing a name.` };
        if (traveler.age === "" || Number(traveler.age) <= 0) return { valid: false, message: `Traveler ${index + 1} needs a valid age.` };
        if (!traveler.gender) return { valid: false, message: `Traveler ${index + 1} needs a gender selection.` };
    }
    return { valid: true, message: "" };
}

function cloneItinerary(itinerary) {
    return itinerary.map((day) => ({
        ...day,
        items: day.items.map((item) => ({ ...item }))
    }));
}

function buildPackageViewModel(packageData) {
    const keyword = `${packageData.destination} ${packageData.title}`.toLowerCase();

    let finalItinerary = [];
    if (packageData.itinerary && packageData.itinerary.day1) {
        const struct = packageData.itinerary;
        const day1Items = [];
        if (struct.day1.flight) {
            const f = struct.day1.flight;
            const depTime = new Date(f.departureAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const arrTime = new Date(f.arrivalAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            day1Items.push(itineraryItem(flightIcon(), `Flight: ${f.airline} ${f.flightNumber}`, `${f.fromAirport} ➔ ${f.toAirport} | Depart: ${depTime} | Arrive: ${arrTime}`, "Economy Class", "flight"));
        }
        if (struct.day1.transport) {
            const t = struct.day1.transport;
            day1Items.push(itineraryItem(transferIcon(), "Arrival Transfer", t.description || "Coordinated transfer from airport", "Private AC Sedan", "transfer"));
        }
        if (struct.day1.hotel) {
            const h = struct.day1.hotel;
            day1Items.push(itineraryItem(hotelSmallIcon(), "Hotel Check-in", h.description || `Check-in at ${h.name || 'your selected accommodation'}`, "", "hotel"));
        }
        finalItinerary.push(itineraryDay("Arrival & Check-in", day1Items));

        if (Array.isArray(struct.days)) {
            struct.days.forEach(d => {
                const dayItems = d.experiences.map(exp => itineraryItem(compassIcon(), exp.title, exp.description || `Location: ${exp.location}`, "", "activity"));
                finalItinerary.push(itineraryDay(`Day ${d.dayNumber}`, dayItems));
            });
        }
    } else if (Array.isArray(packageData.itinerary) && packageData.itinerary.length > 0) {
        finalItinerary = packageData.itinerary.map(day => {
             return itineraryDay(day.title || day.day || "Day", [itineraryItem(compassIcon(), day.title || "Experience", day.detail || "", "", "activity")]);
        });
    } else {
        finalItinerary = createItinerary(packageData, keyword);
    }

    return {
        locationLabel: inferLocationLabel(packageData.destination),
        rating: inferRating(packageData),
        reviews: inferReviews(packageData),
        gallery: createGallery(keyword, packageData.image),
        highlights: createHighlights(packageData),
        itinerary: finalItinerary,
        inclusions: createInclusions(packageData),
        exclusions: createExclusions()
    };
}

function inferLocationLabel(destination) {
    const map = {
        goa: "Goa, Indonesia",
        maldives: "Maldives",
        mumbai: "Mumbai, UAE",
        thailand: "Phuket & Krabi, Thailand",
        switzerland: "Swiss Alps, Switzerland",
        goa: "Goa, India",
        singapore: "Singapore"
    };

    return map[String(destination || "").trim().toLowerCase()] || destination;
}

function inferRating(packageData) {
    return (4.2 + (Number(packageData.hotelCategory) * 0.12)).toFixed(1);
}

function inferReviews(packageData) {
    return 240 + (Number(packageData.days) * 17) + (Number(packageData.hotelCategory) * 19);
}

function createGallery(keyword, fallbackImage) {
    if (keyword.includes("goa")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    if (keyword.includes("maldives")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    if (keyword.includes("mumbai")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1526495124232-a04e1849168c?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    if (keyword.includes("thailand")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    if (keyword.includes("switzerland")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    if (keyword.includes("goa")) {
        return [
            fallbackImage,
            "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?auto=format&fit=crop&q=80&w=1400"
        ];
    }

    return [fallbackImage, fallbackImage, fallbackImage, fallbackImage];
}

function createHighlights(packageData) {
    return [
        { icon: airplaneIcon(), label: packageData.withFlight ? "Round-trip flights included" : "Land package with optional flights" },
        { icon: hotelSmallIcon(), label: packageData.stayLine },
        { icon: mealIcon(), label: packageData.mealsLine },
        { icon: transferIcon(), label: packageData.transferLine },
        { icon: sparkleIcon(), label: packageData.activityLine },
        { icon: giftIcon(), label: packageData.perk }
    ];
}

function createItinerary(packageData, keyword) {
    if (keyword.includes("goa")) {
        return [
            itineraryDay("Arrival & Check-in", [itineraryItem(transferIcon(), "Arrival Transfer", "Coordinated transfer and hotel check-in", "Private AC Sedan", "transfer"), itineraryItem(hotelSmallIcon(), "Hotel Check-in", "Check-in at your selected hotel and relax", "Grand Mirage Resort & Thalasso Goa (4★)", "hotel")]),
            itineraryDay("Explore Destination", [itineraryItem(compassIcon(), "Guided Experience", "Visit Tegallalang Rice Terraces, Tirta Empul Temple, and Ubud Monkey Forest", "", "activity")]),
            itineraryDay("Water Sports & Beach Day", [itineraryItem(wavesIcon(), "Water Sports Activities", "Full day at Nusa Dua Beach for water sports activities", "Water Sports Package - Standard", "activity")]),
            itineraryDay("Temple Tour", [itineraryItem(cameraIcon(), "Temple Tours", "Visit Tanah Lot Temple and Uluwatu Temple with Kecak Fire Dance performance", "", "activity")]),
            itineraryDay("Spa & Leisure Day", [itineraryItem(spaIcon(), "Couples Spa Session", "Rejuvenating spa session at the resort", "", "activity")]),
            itineraryDay("Departure", [itineraryItem(transferIcon(), "Airport Drop-off", "Transfer to airport for your onward journey", "Private AC Sedan", "transfer")])
        ];
    }

    return [
        itineraryDay("Arrival & Check-in", [itineraryItem(transferIcon(), "Arrival Transfer", "Coordinated transfer and hotel check-in", "", "transfer")]),
        itineraryDay("Explore Destination", [itineraryItem(compassIcon(), "Guided Experience", packageData.activityLine, "", "activity")]),
        itineraryDay("Leisure Time", [itineraryItem(spaIcon(), "Signature Perk", packageData.perk, "", "activity")]),
        itineraryDay("Departure", [itineraryItem(transferIcon(), "Return Transfer", "Departure support and airport drop-off", "", "transfer")])
    ];
}

function createInclusions(packageData) {
    return [
        packageData.withFlight ? "Round-trip economy class airfare" : "Land package accommodation and activities",
        `${packageData.nights} nights accommodation in ${packageData.hotelCategory}★ resort`,
        packageData.mealsLine,
        packageData.transferLine,
        packageData.activityLine,
        "Professional local assistance throughout the trip",
        packageData.perk,
        "All applicable taxes"
    ];
}

function createExclusions() {
    return [
        "Travel insurance",
        "Visa fees",
        "Lunch on all days",
        "Personal expenses like laundry, telephone calls, tips",
        "Any meals not mentioned in inclusions",
        "Camera fees at monuments",
        "Optional activities or tours",
        "Early check-in or late check-out charges"
    ];
}

function getModifyOptions(item) {
    const image = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800";
    const transferImage = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800";
    const hotelImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800";

    if (item.kind === "transfer") {
        return [
            optionCard("Private AC Sedan", "Standard Transfer • Up to 3 passengers", ["AC Vehicle", "English Speaking Driver", "Airport Pickup"], "Included in package", transferImage, transferIcon(), "Selected"),
            optionCard("Private AC SUV", "Premium Transfer • Up to 6 passengers", ["Luxury SUV", "Professional Chauffeur", "Complimentary Water"], "+₹89 per vehicle", transferImage, transferIcon()),
            optionCard("Shared Shuttle Service", "Budget Transfer • Shared with other travelers", ["AC Vehicle", "Fixed Schedule", "Airport Pickup"], "+₹45 per person", transferImage, transferIcon())
        ];
    }

    if (item.kind === "hotel") {
        return [
            optionCard("Grand Mirage Resort & Thalasso Goa (4★)", "Beachfront Stay • Breakfast Included", ["Oceanfront", "Spa Access", "Daily Breakfast"], "Included in package", hotelImage, hotelSmallIcon(), "Selected"),
            optionCard("Nusa Dua Grand Villas (5★)", "Luxury Villa Stay • Private Pool", ["Private Pool", "Premium Lounge", "Butler Support"], "+₹190 per person", hotelImage, hotelSmallIcon()),
            optionCard("Sanur Breeze Hotel (4★)", "Seaside Stay • Calm Area", ["Beach Access", "Family Friendly", "Breakfast Included"], "+₹60 per person", hotelImage, hotelSmallIcon())
        ];
    }

    return [
        optionCard("Private Temple Tour", "Cultural Experience • 4 hours", ["Hotel Pickup", "Guide Included", "Entrance Fees"], "+₹75 per person", image, cameraIcon(), "Recommended"),
        optionCard("Goanese Cooking Class", "Culinary Experience • 3 hours", ["Market Tour", "All Ingredients", "Recipe Book"], "+₹65 per person", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&q=80&w=800", mealIcon()),
        optionCard("Sunset Dinner Cruise", "Water Activity • 2.5 hours", ["Buffet Dinner", "Live Music", "Transfers"], "+₹95 per person", "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&q=80&w=800", wavesIcon())
    ];
}

function getAddOptions(destination, dayIndex) {
    const lower = String(destination || "").toLowerCase();

    if (lower.includes("goa")) {
        return [
            addCard("Private Temple Tour", "Cultural Experience • 4 hours", "4.8", "156", "₹75 per person", ["Hotel Pickup", "Guide Included", "Entrance Fees"], "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&q=80&w=800", cameraIcon()),
            addCard("Goanese Cooking Class", "Culinary Experience • 3 hours", "4.9", "203", "₹65 per person", ["Market Tour", "All Ingredients", "Recipe Book"], "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&q=80&w=800", mealIcon()),
            addCard("Sunset Dinner Cruise", "Water Activity • 2.5 hours", "4.7", "178", "₹95 per person", ["Buffet Dinner", "Live Music", "Transfers"], "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&q=80&w=800", wavesIcon()),
            addCard(`Leisure Activity for Day ${dayIndex + 1}`, "Flexible Experience • 2 hours", "4.6", "91", "₹40 per person", ["Flexible Timing", "Local Support", "Instant Confirmation"], "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&q=80&w=800", sparkleIcon())
        ];
    }

    return [
        addCard("Guided City Tour", "Sightseeing • 4 hours", "4.8", "124", "₹70 per person", ["Guide Included", "Transfers", "Photo Stops"], "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800", compassIcon()),
        addCard("Signature Dining Experience", "Dining • 2 hours", "4.7", "89", "₹55 per person", ["Reserved Seating", "Chef Special", "Flexible Timing"], "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800", mealIcon())
    ];
}

function optionCard(name, subtitle, features, priceLabel, image, icon, selectedTag = "") {
    return { name, subtitle, features, priceLabel, image, icon, selectedTag, detail: subtitle, selected: selectedTag || name };
}

function addCard(name, subtitle, rating, reviews, priceLabel, features, image, icon) {
    return { name, subtitle, rating, reviews, priceLabel, features, image, icon, detail: subtitle, selected: priceLabel };
}

function itineraryDay(title, items) {
    return { title, items };
}

function itineraryItem(icon, name, detail, selected = "", kind = "activity") {
    return { icon, name, detail, selected, kind };
}

function renderTravelerCard(traveler, index) {
    return `
        <article class="traveler-entry-card">
            <div class="traveler-entry-head">
                <h4>Traveler ${index + 1}</h4>
                <button type="button" class="traveler-remove-button" data-remove-traveler="${escapeHtml(traveler.id)}">Remove</button>
            </div>
            <label class="traveler-field">
                <span>Full name</span>
                <input type="text" value="${escapeHtml(traveler.name)}" data-traveler-id="${escapeHtml(traveler.id)}" data-traveler-field="name" placeholder="Enter traveler name">
            </label>
            <label class="traveler-field">
                <span>Age</span>
                <input type="number" min="1" value="${escapeHtml(String(traveler.age))}" data-traveler-id="${escapeHtml(traveler.id)}" data-traveler-field="age" placeholder="Enter age">
            </label>
            <label class="traveler-field">
                <span>Gender</span>
                <select data-traveler-id="${escapeHtml(traveler.id)}" data-traveler-field="gender">
                    <option value="">Select gender</option>
                    <option value="Male" ${traveler.gender === "Male" ? "selected" : ""}>Male</option>
                    <option value="Female" ${traveler.gender === "Female" ? "selected" : ""}>Female</option>
                    <option value="Other" ${traveler.gender === "Other" ? "selected" : ""}>Other</option>
                </select>
            </label>
        </article>
    `;
}

function pinIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`; }
function calendarIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`; }
function starIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.9 6 6.6 1-4.8 4.7 1.1 6.6L12 17.7l-5.8 3.1 1.1-6.6L2.5 9.5l6.6-1L12 2.5Z"></path></svg>`; }
function heartIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`; }
function shareIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`; }
function airplaneIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 19 20-7-20-7 5 7-5 7Z"></path></svg>`; }
function hotelSmallIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path><path d="M9 13h.01"></path><path d="M15 13h.01"></path></svg>`; }
function mealIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"></path><path d="M10 3v12"></path><path d="M14 3a5 5 0 0 1 5 5v7"></path><path d="M4 15h8"></path><path d="M17 21v-8"></path></svg>`; }
function transferIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="11" width="15" height="7" rx="2"></rect><path d="M16 13h3l3 3v2h-6"></path><circle cx="5.5" cy="18.5" r="1.5"></circle><circle cx="18.5" cy="18.5" r="1.5"></circle></svg>`; }
function flightIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`; }
function sparkleIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"></path><path d="M5 19h.01"></path><path d="M19 19h.01"></path></svg>`; }
function giftIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="13" rx="2"></rect><path d="M12 8v13"></path><path d="M19 8V6a2 2 0 0 0-2-2h-1.5a2.5 2.5 0 0 0-2.5 2.5V8"></path><path d="M5 8V6a2 2 0 0 1 2-2h1.5A2.5 2.5 0 0 1 11 6.5V8"></path></svg>`; }
function compassIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m16 8-2.6 7.4L6 18l2.6-7.4L16 8z"></path></svg>`; }
function wavesIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"></path><path d="M2 12c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"></path><path d="M2 18c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"></path></svg>`; }
function cameraIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`; }
function spaIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3c1.2 2.4 3 4 5 4 1.7 0 3-1 4-3 0 5.5-3.8 9-9 9S3 9.5 3 4c1 2 2.3 3 4 3 2 0 3.8-1.6 5-4Z"></path><path d="M12 13v8"></path></svg>`; }
function checkCircleIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`; }
function closeCircleIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>`; }

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

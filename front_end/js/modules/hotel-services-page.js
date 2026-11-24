/* ================================================================
   hotel-services-page.js — 100% Client-side (localStorage)
================================================================ */
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=900";

export async function renderServicesPage(containerId = "main") {
  const root =
    document.getElementById(containerId) || document.getElementById("main");
  if (!root) return;

  const hotels = fetchPartnerHotels();
  render(root, hotels);
}

function fetchPartnerHotels() {
  try {
    return JSON.parse(localStorage.getItem("hotels") || "[]");
  } catch {
    return [];
  }
}

function createPartnerHotel(payload) {
  const hotels = fetchPartnerHotels();
  const newHotel = { id: Date.now(), status: "active", ...payload };
  hotels.push(newHotel);
  localStorage.setItem("hotels", JSON.stringify(hotels));
  return newHotel;
}

function render(root, hotels) {
  root.innerHTML = `
    <div class="hotel-page-header hotel-flex-header">
      <div>
        <h1>Services</h1>
        <p>Manage your hotel offerings</p>
      </div>
      <button class="btn-blue" id="open-service-modal" type="button">+ Add Hotel</button>
    </div>

    <section class="hotel-content-card hotel-summary-strip">
      <div><span>Total Hotels</span><strong>${hotels.length}</strong></div>
      <div><span>Active</span><strong>${hotels.filter((hotel) => hotel.status === "active").length}</strong></div>
      <div><span>Total Bookable Rooms</span><strong>${hotels.length * 10}</strong></div>
    </section>

    <div id="service-grid">
      ${
        hotels.length
          ? hotels.map(renderHotelCard).join("")
          : `<div class="hotel-empty-state"><h2>No hotels yet</h2><p>Add your first hotel so travellers can find and book it.</p></div>`
      }
    </div>

    ${renderModal()}
  `;

  bindEvents(root);
}

function renderHotelCard(hotel) {
  return `
    <article class="hotel-service-card">
      <div class="hotel-service-header">
        <img src="${escapeHtmlAttr(hotel.image || DEFAULT_IMAGE)}" class="hotel-service-img" alt="${escapeHtmlAttr(hotel.name)}">
        <div>
          <h2>${escapeHtml(hotel.name)}</h2>
          <p>${escapeHtml(hotel.city)} · ${escapeHtml(hotel.location)}</p>
        </div>
        <span class="hotel-status">${escapeHtml(hotel.status)}</span>
      </div>
      <div class="hotel-service-info">
        <span>${Number(hotel.stars || 0)} star hotel</span>
        <span>₹${Number(hotel.pricePerNight || 0).toLocaleString()} / night</span>
        <span>₹${Number(hotel.taxesAndFees || 0).toLocaleString()} taxes & fees</span>
        <span>${(hotel.amenities || []).join(", ") || "No amenities listed"}</span>
      </div>
      <p class="hotel-service-desc">${escapeHtml(hotel.description || "")}</p>
    </article>
  `;
}

function renderModal() {
  return `
    <div id="add-service-modal" class="hotel-modal hidden">
      <div class="hotel-modal-box">
        <div class="hotel-modal-header">
          <h2>Add Hotel</h2>
          <button class="hotel-modal-close-btn" id="close-service-modal" type="button">x</button>
        </div>
        <form id="hotel-service-form" class="hotel-modal-body" novalidate>
          <div class="hotel-form-grid">
            ${field("hotelName", "Hotel Name", "Xploreo Beach Resort")}
            ${field("hotelCity", "City", "Goa")}
            ${field("hotelLocation", "Location", "Calangute Beach, Goa")}
            ${field("hotelStars", "Stars", "5", "number", "1", "5")}
            ${field("hotelPrice", "Price per Night", "4800", "number", "0")}
            ${field("hotelTaxes", "Taxes & Fees", "650", "number", "0")}
          </div>
          <label>Description</label>
          <textarea id="hotelDescription" placeholder="Beachfront hotel with pool, breakfast, and WiFi."></textarea>
          <label>Amenities</label>
          <input id="hotelAmenities" type="text" placeholder="Pool, Breakfast, WiFi">
          <label>Image URL</label>
          <input id="hotelImage" type="url" placeholder="${DEFAULT_IMAGE}">
          <p class="hotel-form-error" id="hotel-form-error"></p>
          <div class="hotel-modal-footer">
            <button class="btn-light" id="cancel-service-modal" type="button">Cancel</button>
            <button class="btn-blue" type="submit">Save Hotel</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function field(id, label, placeholder, type = "text", min = "", max = "") {
  return `
    <div>
      <label for="${id}">${escapeHtml(label)}</label>
      <input id="${id}" type="${type}" placeholder="${escapeHtmlAttr(placeholder)}" ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""}>
    </div>
  `;
}

function bindEvents(root) {
  const modal = root.querySelector("#add-service-modal");
  root.querySelector("#open-service-modal")?.addEventListener("click", () => {
    modal?.classList.remove("hidden");
  });
  root.querySelector("#close-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
  root.querySelector("#cancel-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  root
    .querySelector("#hotel-service-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const error = root.querySelector("#hotel-form-error");
      if (error) error.textContent = "";

      const payload = readHotelPayload();
      const validationError = validateHotelPayload(payload);
      if (validationError) {
        if (error) error.textContent = validationError;
        return;
      }

      try {
        createPartnerHotel(payload);
        const hotels = fetchPartnerHotels();
        render(root, hotels);
      } catch (err) {
        console.error("Create hotel failed:", err);
        if (error) error.textContent = err.message || "Unable to save hotel.";
      }
    });
}

function readHotelPayload() {
  return {
    name: value("hotelName"),
    city: value("hotelCity"),
    location: value("hotelLocation"),
    description: value("hotelDescription"),
    stars: Number(value("hotelStars")),
    pricePerNight: Number(value("hotelPrice")),
    taxesAndFees: Number(value("hotelTaxes") || 0),
    image: value("hotelImage") || DEFAULT_IMAGE,
    amenities: value("hotelAmenities")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function validateHotelPayload(payload) {
  if (!payload.name || !payload.city || !payload.location)
    return "Name, city, and location are required.";
  if (!payload.description) return "Description is required.";
  if (
    !Number.isInteger(payload.stars) ||
    payload.stars < 1 ||
    payload.stars > 5
  )
    return "Stars must be between 1 and 5.";
  if (!Number.isFinite(payload.pricePerNight) || payload.pricePerNight < 0)
    return "Price must be a valid number.";
  return "";
}

function value(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[ch],
  );
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

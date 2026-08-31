import { fetchPartnerHotels } from "../api/services.js?v=hotel-workflow-2";
import {
  getApiBaseUrl,
  getApiSession,
} from "../api/session.js?v=hotel-workflow-2";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=900";

let currentHotels = [];

export async function renderServicesPage(containerId = "main") {
  const root =
    document.getElementById(containerId) || document.getElementById("main");
  if (!root) return;

  root.innerHTML = renderShell("Loading hotel services...");
  const hotels = await fetchPartnerHotels().catch((error) => {
    console.error("Failed to load partner hotels:", error);
    return [];
  });
  currentHotels = hotels;

  render(root, hotels);
}

function render(root, hotels) {
  const activeHotels = hotels.filter((h) => h.status === "active" || h.status === "ACTIVE").length;
  const totalRooms = hotels.reduce((sum, h) => sum + (Number(h.totalRooms) || 10), 0);

  root.innerHTML = `
    <div class="hotel-page-header hotel-flex-header">
      <div>
        <h1>Services</h1>
        <p>Manage your hotel offerings from the backend catalogue</p>
      </div>
      <button class="btn-blue" id="open-service-modal" type="button">+ Add Hotel</button>
    </div>

    <section class="hotel-content-card hotel-summary-strip">
      <div><span>Total Hotels</span><strong>${hotels.length}</strong></div>
      <div><span>Active</span><strong>${activeHotels}</strong></div>
      <div><span>Total Bookable Rooms</span><strong>${totalRooms}</strong></div>
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

function renderShell(message) {
  return `
    <div class="hotel-page-header hotel-flex-header">
      <div>
        <h1>Services</h1>
        <p>Manage your hotel offerings</p>
      </div>
    </div>
    <div class="hotel-content-card">${escapeHtml(message)}</div>
  `;
}

function renderHotelCard(hotel) {
  const hotelId = hotel.id || hotel._id;
  return `
    <article class="hotel-service-card">
      <div class="hotel-service-header">
        <img src="${escapeHtmlAttr(hotel.image || DEFAULT_IMAGE)}" class="hotel-service-img" alt="${escapeHtmlAttr(hotel.name)}">
        <div>
          <h2>${escapeHtml(hotel.name)}</h2>
          <p>${escapeHtml(hotel.city)} · ${escapeHtml(hotel.location)}</p>
        </div>
        <div class="hotel-action-group">
          <button class="btn-edit edit-hotel-btn" data-id="${escapeHtmlAttr(hotelId)}">Edit</button>
          <span class="hotel-status">${escapeHtml(hotel.status || 'Active')}</span>
        </div>
      </div>
      <div class="hotel-service-info">
        <span>${Number(hotel.stars || 0)} star hotel</span>
        <span>₹${Number(hotel.pricePerNight || 0).toLocaleString()} / night</span>
        <span class="hotel-available-rooms">${hotel.availableRooms ?? hotel.totalRooms ?? 10} / ${hotel.totalRooms || 10} rooms available</span>
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
          <h2 id="modal-title">Add Hotel</h2>
          <button class="hotel-modal-close-btn" id="close-service-modal" type="button">x</button>
        </div>
        <form id="hotel-service-form" class="hotel-modal-body" data-hotel-id="" novalidate>
          <div class="hotel-form-grid">
            ${field("hotelName", "Hotel Name", "Xploreo Beach Resort")}
            ${field("hotelCity", "City", "Goa")}
            ${field("hotelLocation", "Location", "Calangute Beach, Goa")}
            ${field("hotelStars", "Stars", "5", "number", "1", "5")}
            ${field("hotelPrice", "Price per Night", "4800", "number", "0")}
            ${field("hotelTaxes", "Taxes & Fees", "650", "number", "0")}
            ${field("hotelRooms", "Total Bookable Rooms", "10", "number", "1")}
          </div>
          <label>Description</label>
          <textarea id="hotelDescription" placeholder="Beachfront hotel with pool, breakfast, and WiFi."></textarea>
          <label>Amenities</label>
          <input id="hotelAmenities" type="text" placeholder="Pool, Breakfast, WiFi" style="margin-bottom: 24px;">
          
          <label>Hotel Image</label>
          <label class="hotel-file-dropzone" for="hotelImage" id="hotelImageDropzone">
            <div class="dropzone-content" id="dropzoneContent">
              <span class="dropzone-icon">📁</span>
              <span class="dropzone-text">Click or drag & drop to upload</span>
              <span class="dropzone-subtext">SVG, PNG, JPG or GIF (max. 5MB)</span>
            </div>
            <input id="hotelImage" type="file" accept="image/*" class="hidden-file-input">
            <input id="hotelImageUrl" type="hidden">
            <img id="imagePreview" src="" style="display: none;">
            <div class="change-image-btn" id="changeImageBtn" style="display: none;">Change Image</div>
          </label>
          
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
  const form = root.querySelector("#hotel-service-form");
  const modalTitle = root.querySelector("#modal-title");
  
  const imageInput = root.querySelector("#hotelImage");
  const imageUrlHidden = root.querySelector("#hotelImageUrl");
  const imagePreview = root.querySelector("#imagePreview");
  const dropzoneContent = root.querySelector("#dropzoneContent");
  const dropzone = root.querySelector("#hotelImageDropzone");
  const changeImageBtn = root.querySelector("#changeImageBtn");

  const handleImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Str = ev.target.result;
        imageUrlHidden.value = base64Str;
        imagePreview.src = base64Str;
        imagePreview.style.display = "block";
        dropzoneContent.style.opacity = "0";
        changeImageBtn.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  };

  imageInput?.addEventListener("change", (e) => {
    handleImageFile(e.target.files[0]);
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    handleImageFile(e.dataTransfer.files[0]);
  });

  root.querySelector("#open-service-modal")?.addEventListener("click", () => {
    form.reset();
    form.dataset.hotelId = "";
    imageUrlHidden.value = "";
    imagePreview.style.display = "none";
    dropzoneContent.style.opacity = "1";
    changeImageBtn.style.display = "none";
    if(modalTitle) modalTitle.textContent = "Add Hotel";
    modal?.classList.remove("hidden");
  });

  root.querySelector("#close-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
  root.querySelector("#cancel-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  // Edit Button Event Listeners
  const editBtns = root.querySelectorAll(".edit-hotel-btn");
  editBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const hotel = currentHotels.find(h => (h.id === id || h._id === id));
      if(!hotel) return;

      document.getElementById("hotelName").value = hotel.name || "";
      document.getElementById("hotelCity").value = hotel.city || "";
      document.getElementById("hotelLocation").value = hotel.location || "";
      document.getElementById("hotelStars").value = hotel.stars || 0;
      document.getElementById("hotelPrice").value = hotel.pricePerNight || 0;
      document.getElementById("hotelTaxes").value = hotel.taxesAndFees || 0;
      document.getElementById("hotelRooms").value = hotel.totalRooms || 10;
      document.getElementById("hotelDescription").value = hotel.description || "";
      document.getElementById("hotelAmenities").value = (hotel.amenities || []).join(", ");
      
      document.getElementById("hotelImage").value = ""; // clear file input
      const img = hotel.image || "";
      imageUrlHidden.value = img;
      if (img) {
         imagePreview.src = img;
         imagePreview.style.display = "block";
         dropzoneContent.style.opacity = "0";
         changeImageBtn.style.display = "block";
      } else {
         imagePreview.style.display = "none";
         dropzoneContent.style.opacity = "1";
         changeImageBtn.style.display = "none";
      }

      form.dataset.hotelId = id;
      if(modalTitle) modalTitle.textContent = "Edit Hotel";
      modal?.classList.remove("hidden");
    });
  });

  form?.addEventListener("submit", async (event) => {
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
      const editingId = form.dataset.hotelId;
      if (editingId) {
        await updatePartnerHotel(editingId, payload);
      } else {
        await createPartnerHotel(payload);
      }
      const hotels = await fetchPartnerHotels();
      currentHotels = hotels;
      render(root, hotels);
    } catch (err) {
      console.error("Save hotel failed:", err);
      if (error) error.textContent = err.message || "Unable to save hotel.";
    }
  });
}

async function createPartnerHotel(payload) {
  const session = getApiSession();
  const userId =
    session?.headers?.["x-user-id"] ||
    session?.user?.userId ||
    session?.user?.id;
  const role =
    session?.user?.role === "PARTNER" || session?.user?.role === "hotel"
      ? "PARTNER"
      : session?.headers?.["x-user-role"];

  const response = await fetch(`${getApiBaseUrl()}/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": role || "PARTNER",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || body?.error || "Unable to save hotel.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
}

async function updatePartnerHotel(id, payload) {
  const session = getApiSession();
  const userId =
    session?.headers?.["x-user-id"] ||
    session?.user?.userId ||
    session?.user?.id;
  const role =
    session?.user?.role === "PARTNER" || session?.user?.role === "hotel"
      ? "PARTNER"
      : session?.headers?.["x-user-role"];

  const response = await fetch(`${getApiBaseUrl()}/hotels/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": role || "PARTNER",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || body?.error || "Unable to update hotel.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
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
    totalRooms: Number(value("hotelRooms") || 10),
    image: value("hotelImageUrl") || DEFAULT_IMAGE,
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

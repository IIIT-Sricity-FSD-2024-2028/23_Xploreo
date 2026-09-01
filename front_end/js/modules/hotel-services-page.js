import { fetchPartnerHotels } from "../api/services.js?v=hotel-workflow-2";
import {
  getApiBaseUrl,
  getApiSession,
  getCurrentUser,
} from "../api/session.js?v=hotel-workflow-2";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800";
const MAX_HOTELS = 100;
let currentHotels = [];
let uploadedHotelImages = [];

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
        <p>Assigned Region: <span style="display:inline-block; padding:2px 10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:9999px; font-weight:600; font-size:12px;">${getCurrentUser()?.location || getApiSession()?.user?.location || 'Goa'}</span> · Manage your hotel offerings from the backend catalogue</p>
      </div>
      <button class="btn-blue" id="open-service-modal" type="button">+ Add Hotel</button>
    </div>

    <section class="hotel-content-card hotel-summary-strip">
      <div><span>Total Hotels</span><strong>${hotels.length}</strong></div>
      <div><span>Active</span><strong>${activeHotels}</strong></div>
      <div><span>Total Bookable Rooms</span><strong>${totalRooms}</strong></div>
    </section>

    <div id="service-grid">
      ${hotels.length
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
        <p>Assigned Region: <span style="display:inline-block; padding:2px 10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:9999px; font-weight:600; font-size:12px;">${getCurrentUser()?.location || getApiSession()?.user?.location || 'Goa'}</span> · Manage your hotel offerings</p>
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
          <button class="delete-hotel-btn" data-id="${escapeHtmlAttr(hotelId)}" style="background: #fee2e2; color: #b91c1c; border: none; padding: 4px 12px; border-radius: 4px; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: background 0.2s; margin-left: 8px;">Delete</button>
          <span class="hotel-status">${escapeHtml(hotel.status || 'Active')}</span>
        </div>
      </div>
      <div class="hotel-service-info">
        <span>${Number(hotel.stars || 0)} star hotel</span>
        <span>₹${Number(hotel.pricePerNight || 0).toLocaleString()} / night</span>
        <span class="hotel-available-rooms">${hotel.availableRooms ?? hotel.totalRooms ?? 10} / ${hotel.totalRooms || 10} rooms available</span>
        <span>₹${Number((hotel.pricePerNight || 0) * 0.05).toLocaleString()} taxes & fees</span>
        <span>${(hotel.amenities || []).join(", ") || "No amenities listed"}</span>
      </div>
      <p class="hotel-service-desc">${escapeHtml(hotel.description || "")}</p>
    </article>
  `;
}

function renderModal() {
  const assignedLocation = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
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
            ${field("hotelCity", "Assigned Location (Fixed)", assignedLocation, "text", "", "", true)}
            ${field("hotelLocation", "Area / Landmark", "Calangute Beach")}
            ${field("hotelStars", "Stars", "5", "number", "1", "5")}
            ${field("hotelPrice", "Price per Night", "4800", "number", "0")}
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
            <input id="hotelImage" type="file" accept="image/*" class="hidden-file-input" multiple>
            <div id="imagePreviewGrid" class="hotel-image-preview-grid hidden" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; width: 100%; height: 100%; z-index: 10;"></div>
            <div class="change-image-btn" id="changeImageBtn" style="display: none; z-index: 20;">Add More</div>
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

function field(id, label, placeholder, type = "text", min = "", max = "", readonly = false) {
  return `
    <div>
      <label for="${id}">${escapeHtml(label)}</label>
      <input id="${id}" type="${type}" placeholder="${escapeHtmlAttr(placeholder)}" ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} ${readonly ? `readonly disabled style="background-color: #f1f5f9; cursor: not-allowed; font-weight: 600; color: #1e293b;"` : ""}>
    </div>
  `;
}

function bindEvents(root) {
  const modal = root.querySelector("#add-service-modal");
  const form = root.querySelector("#hotel-service-form");
  const modalTitle = root.querySelector("#modal-title");
  const errorElement = root.querySelector("#hotel-form-error");

  const imageInput = root.querySelector("#hotelImage");
  const imagePreviewGrid = root.querySelector("#imagePreviewGrid");
  const dropzoneContent = root.querySelector("#dropzoneContent");
  const dropzone = root.querySelector("#hotelImageDropzone");
  const changeImageBtn = root.querySelector("#changeImageBtn");

  const renderImagePreviewGrid = () => {
    if (uploadedHotelImages.length === 0) {
      if (imagePreviewGrid) {
        imagePreviewGrid.innerHTML = "";
        imagePreviewGrid.classList.add("hidden");
      }
      dropzoneContent.style.opacity = "1";
      changeImageBtn.style.display = "none";
      return;
    }

    if (imagePreviewGrid) {
      imagePreviewGrid.innerHTML = uploadedHotelImages.map((url, idx) => `
        <div style="position: relative; width: 60px; height: 60px; border-radius: 8px; overflow: hidden; border: 2px solid ${idx === 0 ? '#3b82f6' : 'transparent'};">
          <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
      `).join("");
      
      imagePreviewGrid.classList.remove("hidden");
    }
    dropzoneContent.style.opacity = "0";
    changeImageBtn.style.display = "block";
  };

  const handleImageFiles = (files) => {
    if (!files || files.length === 0) return;
    
    let loaded = 0;
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    if (errorElement) errorElement.textContent = "Loading images...";

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedHotelImages.push(e.target.result);
        loaded++;
        if (loaded === fileArray.length) {
          renderImagePreviewGrid();
          if (errorElement) errorElement.textContent = "";
        }
      };
      reader.onerror = () => {
        if (errorElement) errorElement.textContent = "Failed to load an image.";
      };
      reader.readAsDataURL(file);
    });
  };

  imageInput?.addEventListener("change", (e) => {
    handleImageFiles(e.target.files);
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
    handleImageFiles(e.dataTransfer.files);
  });

  root.querySelector("#open-service-modal")?.addEventListener("click", () => {
    form.reset();
    form.dataset.hotelId = "";
    const assignedLocation = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
    if (document.getElementById("hotelCity")) {
      document.getElementById("hotelCity").value = assignedLocation;
    }
    uploadedHotelImages = [];
    renderImagePreviewGrid();
    if (modalTitle) modalTitle.textContent = "Add Hotel";
    modal?.classList.remove("hidden");
  });

  root.querySelector("#close-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
  root.querySelector("#cancel-service-modal")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  const editBtns = root.querySelectorAll(".edit-hotel-btn");
  editBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const hotel = currentHotels.find(h => (h.id === id || h._id === id));
      if (!hotel) return;

      const assignedLocation = getCurrentUser()?.location || getApiSession()?.user?.location || hotel.city || "Goa";
      if (document.getElementById("hotelName")) document.getElementById("hotelName").value = hotel.name || "";
      if (document.getElementById("hotelCity")) document.getElementById("hotelCity").value = assignedLocation;
      if (document.getElementById("hotelLocation")) document.getElementById("hotelLocation").value = hotel.location || "";
      if (document.getElementById("hotelStars")) document.getElementById("hotelStars").value = hotel.stars || 0;
      if (document.getElementById("hotelPrice")) document.getElementById("hotelPrice").value = hotel.pricePerNight || 0;
      if (document.getElementById("hotelRooms")) document.getElementById("hotelRooms").value = hotel.totalRooms || 10;
      if (document.getElementById("hotelDescription")) document.getElementById("hotelDescription").value = hotel.description || "";
      if (document.getElementById("hotelAmenities")) document.getElementById("hotelAmenities").value = (hotel.amenities || []).join(", ");

      if (document.getElementById("hotelImage")) document.getElementById("hotelImage").value = ""; // clear file input
      uploadedHotelImages = hotel.images?.length ? [...hotel.images] : (hotel.image ? [hotel.image] : []);
      renderImagePreviewGrid();

      form.dataset.hotelId = id;
      if (modalTitle) modalTitle.textContent = "Edit Hotel";
      modal?.classList.remove("hidden");
    });
  });

  const deleteBtns = root.querySelectorAll(".delete-hotel-btn");
  deleteBtns.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (confirm("Are you sure you want to delete this hotel?")) {
        try {
          await deleteHotel(id);
          renderServicesPage(root.id);
        } catch (error) {
          console.error("Failed to delete hotel:", error);
          alert(error.message || "Failed to delete hotel");
        }
      }
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = root.querySelector("#hotel-form-error");
    error.textContent = "";

    const payload = readHotelPayload();
    const validationError = validateHotelPayload(payload);
    if (validationError) {
      error.textContent = validationError;
      return;
    }

    const hotelId = form.dataset.hotelId;
    try {
      if (hotelId) {
        await updateHotel(hotelId, payload);
      } else {
        await createHotel(payload);
      }
      modal?.classList.add("hidden");
      await renderServicesPage(root.id);
    } catch (err) {
      error.textContent = err.message || "Failed to save hotel.";
    }
  });
}

async function createHotel(payload) {
  const session = getApiSession();
  const res = await fetch(`${getApiBaseUrl()}/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": session?.headers?.["x-user-id"] || session?.user?.userId || session?.user?.id || "",
      "x-user-role": session?.headers?.["x-user-role"] || "PARTNER",
      "x-user-location": session?.headers?.["x-user-location"] || session?.user?.location || getCurrentUser()?.location || "Goa",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.error || "Unable to create hotel.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
}

async function updateHotel(id, payload) {
  const session = getApiSession();
  const res = await fetch(`${getApiBaseUrl()}/hotels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": session?.headers?.["x-user-id"] || session?.user?.userId || session?.user?.id || "",
      "x-user-role": session?.headers?.["x-user-role"] || "PARTNER",
      "x-user-location": session?.headers?.["x-user-location"] || session?.user?.location || getCurrentUser()?.location || "Goa",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.error || "Unable to update hotel.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
}

async function deleteHotel(id) {
  const session = getApiSession();
  const res = await fetch(`${getApiBaseUrl()}/hotels/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": session?.headers?.["x-user-id"] || session?.user?.userId || session?.user?.id || "",
      "x-user-role": session?.headers?.["x-user-role"] || "PARTNER",
      "x-user-location": session?.headers?.["x-user-location"] || session?.user?.location || getCurrentUser()?.location || "Goa",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.error || "Unable to delete hotel.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
}

function readHotelPayload() {
  const assignedLocation = getCurrentUser()?.location || getApiSession()?.user?.location || "Goa";
  return {
    name: value("hotelName"),
    city: value("hotelLocation") || assignedLocation,
    location: assignedLocation,
    description: value("hotelDescription"),
    stars: Number(value("hotelStars")),
    pricePerNight: Number(value("hotelPrice")),
    taxesAndFees: Math.round(Number(value("hotelPrice")) * 0.05),
    totalRooms: Number(value("hotelRooms") || 10),
    image: uploadedHotelImages.length > 0 ? uploadedHotelImages[0] : DEFAULT_IMAGE,
    images: uploadedHotelImages,
    amenities: value("hotelAmenities").split(",").map((a) => a.trim()).filter((a) => a),
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
  if (!Number.isInteger(payload.totalRooms) || payload.totalRooms < 1)
    return "Total Bookable Rooms must be a whole number (1 or greater).";
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

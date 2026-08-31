window.tracking = (() => {

let map, marker;
let watchId = null;
let currentTourId = "default_tour";
let isPaused = false;

// Base coordinates only used for plotting the itinerary stops roughly, since we lack a real backend geocoder
const BASE_COORDINATES = {
  "delhi": { lat: 48.8566, lng: 2.3522 },
  "kyoto": { lat: 35.0116, lng: 135.7681 },
  "santorini": { lat: 36.3932, lng: 25.4615 },
  "pondy": { lat: 11.9416, lng: 79.8083 },
  "pondicherry": { lat: 11.9416, lng: 79.8083 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "default": { lat: 12.9716, lng: 77.5946 }
};

let currentUserStr = localStorage.getItem("currentUser");
let role = currentUserStr ? JSON.parse(currentUserStr).role : (localStorage.getItem("role") || "guide");

let stops = [];
let lastMsgId = null, lastReqId = null;
let listenInterval = null;

function init(tour) {
  if (map) {
    map.remove();
    map = null;
  }
  
  if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
  }
  if (listenInterval) {
      clearInterval(listenInterval);
      listenInterval = null;
  }
  
  isPaused = false;

  if (tour) {
    currentTourId = String(tour.id || tour.bookingId || "default_tour");
    let destStr = String(tour.destination || tour.location || "").toLowerCase();
    
    let baseCoord = BASE_COORDINATES["default"];
    for (let city in BASE_COORDINATES) {
      if (destStr.includes(city)) {
        baseCoord = BASE_COORDINATES[city];
        break;
      }
    }

    let itinerary = tour.plan_iternary;
    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
      itinerary = ["Start Location", "Midway Point", "Final Destination"];
    }

    stops = itinerary.map((name, idx) => {
      return {
        name: name.trim(),
        lat: baseCoord.lat + (idx * 0.005),
        lng: baseCoord.lng + (idx * 0.005),
        completed: false,
        stay: 2000
      };
    });
  }

  // Restore state if exists
  let s = JSON.parse(localStorage.getItem("trackState_" + currentTourId));
  if (s && s.stops) {
    stops = s.stops;
  }

  map = L.map('trackingMap').setView([stops[0].lat, stops[0].lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  stops.forEach(s => {
    L.marker([s.lat, s.lng]).addTo(map);
  });

  // Set initial marker
  let startLat = s && s.lat ? s.lat : stops[0].lat;
  let startLng = s && s.lng ? s.lng : stops[0].lng;
  marker = L.marker([startLat, startLng]).addTo(map);

  renderStops();
  applyRoleUI();

  if (role === "traveller") {
      listen();
  } else {
      // Guide automatically enters listening mode until they click start
      listenForMessages();
  }

  setTimeout(() => map.invalidateSize(), 200);
}

function applyRoleUI() {
  const gCtrl = document.getElementById("guideControls");
  const tCtrl = document.getElementById("travellerControls");
  if (gCtrl) gCtrl.style.display = role === "guide" ? "block" : "none";
  if (tCtrl) tCtrl.style.display = role === "traveller" ? "block" : "none";
}

function listenForMessages() {
    listenInterval = setInterval(() => {
        let msg = JSON.parse(localStorage.getItem("trackMsg_" + currentTourId));
        if (msg && msg.id !== lastMsgId) {
            lastMsgId = msg.id;
            showMsg(msg.text, "guide");
        }

        let req = JSON.parse(localStorage.getItem("trackReq_" + currentTourId));
        if (req && req.id !== lastReqId) {
            lastReqId = req.id;
            showMsg(req.text, "request");
        }
    }, 800);
}

function listen() {
  listenInterval = setInterval(() => {
    let s = JSON.parse(localStorage.getItem("trackState_" + currentTourId));
    if (!s) return;

    marker.setLatLng([s.lat, s.lng]);
    map.panTo([s.lat, s.lng], {animate: true, duration: 0.5});

    stops = s.stops;
    renderStops();

    let msg = JSON.parse(localStorage.getItem("trackMsg_" + currentTourId));
    if (msg && msg.id !== lastMsgId) {
      lastMsgId = msg.id;
      showMsg(msg.text, "guide");
    }

    let req = JSON.parse(localStorage.getItem("trackReq_" + currentTourId));
    if (req && req.id !== lastReqId) {
      lastReqId = req.id;
      showMsg(req.text, "request");
    }

  }, 800);
}

function checkStops(lat, lng) {
  stops.forEach((s, i) => {
    if (!s.completed) {
      let d = Math.hypot(lat - s.lat, lng - s.lng);
      // Rough distance threshold for real GPS (~100 meters)
      if (d < 0.001) {
        s.completed = true;
        isPaused = true;

        let msg = { id: Date.now(), text: "📍 Arrived at " + s.name };
        localStorage.setItem("trackMsg_" + currentTourId, JSON.stringify(msg));
        showMsg(msg.text, "arrival");

        // Sync with global tours array
        let allTours = JSON.parse(localStorage.getItem("tours"));
        if (allTours) {
            let tourIndex = allTours.findIndex(t => String(t.id) === String(currentTourId));
            if (tourIndex !== -1) {
                allTours[tourIndex].currentloction = s.name;
                localStorage.setItem("tours", JSON.stringify(allTours));
            }
        }

        setTimeout(() => isPaused = false, s.stay || 2000);
      }
    }
  });
}

function renderStops() {
  let list = document.getElementById("trackingStops");
  if (!list) return;
  list.innerHTML = "";

  let cur = stops.findIndex(s => !s.completed);

  stops.forEach((s, i) => {
    let li = document.createElement("li");
    li.className = s.completed ? "completed" : i === cur ? "current" : "pending";
    li.innerText = s.name;
    list.appendChild(li);
  });
}

function showMsg(text, type) {
  let box = document.getElementById("trackingMessages");
  if (!box) return;
  let el = document.createElement("div");
  el.className = `tracking-msg msg-${type}`;
  el.innerText = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

return {
  init,
  start: () => {
      isPaused = false;
      if (!watchId && "geolocation" in navigator) {
          showMsg("GPS Tracking Started", "guide");
          watchId = navigator.geolocation.watchPosition((position) => {
              if (isPaused) return;
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              marker.setLatLng([lat, lng]);
              map.panTo([lat, lng], {animate: true, duration: 0.5});
              
              checkStops(lat, lng);
              localStorage.setItem("trackState_" + currentTourId, JSON.stringify({lat, lng, stops}));
          }, (err) => {
              console.error("GPS Error:", err);
              showMsg("GPS Error: Enable location", "request");
          }, { enableHighAccuracy: true });
      } else if (!("geolocation" in navigator)) {
          showMsg("Geolocation not supported", "request");
      }
  },
  pause: () => {
      isPaused = true;
      showMsg("Tracking Paused", "guide");
  },
  resume: () => {
      isPaused = false;
      showMsg("Tracking Resumed", "guide");
  },
  skip: () => {
    let i = stops.findIndex(s => !s.completed);
    if (i !== -1) {
        stops[i].completed = true;
        // Broadcast the skip so Traveller's view updates
        localStorage.setItem("trackState_" + currentTourId, JSON.stringify({
            lat: marker.getLatLng().lat, 
            lng: marker.getLatLng().lng, 
            stops
        }));
        
        // Sync global state
        let allTours = JSON.parse(localStorage.getItem("tours"));
        if (allTours) {
            let tourIndex = allTours.findIndex(t => String(t.id) === String(currentTourId));
            if (tourIndex !== -1) {
                allTours[tourIndex].currentloction = stops[i].name;
                localStorage.setItem("tours", JSON.stringify(allTours));
            }
        }
        renderStops();
    }
  },
  sendMessage: () => {
    let input = document.getElementById("trackingMsgInput");
    if (!input || !input.value) return;
    let msg = { id: Date.now(), text: "📢 " + input.value };
    localStorage.setItem("trackMsg_" + currentTourId, JSON.stringify(msg));
    showMsg(msg.text, "guide");
    input.value = "";
  },
  sendRequest: (text) => {
    let req = { id: Date.now(), text };
    localStorage.setItem("trackReq_" + currentTourId, JSON.stringify(req));
    showMsg(text, "request");
  }
};

})();

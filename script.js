let userLat, userLng;
let map;
let allPlaces = [];
let markers = [];
let currentType = "ALL";

const results = document.getElementById("results");
const btn = document.getElementById("getLocationBtn");
const cats = document.querySelectorAll(".cat");
const searchInput = document.getElementById("searchInput");

/* =======================
   LOCATION
======================= */
btn.onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    initMap();
    loadPlaces();
  });
};

/* =======================
   MAP
======================= */
function initMap() {
  map = L.map("map").setView([userLat, userLng], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([userLat, userLng]).addTo(map).bindPopup("📍 أنت هنا");
}

/* =======================
   LOAD PLACES
======================= */
function loadPlaces() {
  fetch("places.json")
    .then(res => res.json())
    .then(data => {
      allPlaces = data;

      allPlaces.forEach(p => {
        p.distance = calcDistance(userLat, userLng, p.lat, p.lng);
      });

      allPlaces.sort((a, b) => a.distance - b.distance);
      render();
    });
}

/* =======================
   RENDER
======================= */
function render() {
  results.innerHTML = "";
  clearMarkers();

  const searchText = searchInput.value.toLowerCase().trim();

  let filtered = allPlaces.filter(p => {
    if (searchText !== "") {
      return p.name.toLowerCase().includes(searchText);
    }
    return currentType === "ALL" || p.type === currentType;
  });

  showTodayTrip(filtered);
  showPlaces(searchText ? filtered : filtered.slice(0, 6));
}

/* =======================
   TODAY TRIP
======================= */
function showTodayTrip(places) {
  const allowed = ["Restaurant", "Cafe", "Park", "Gym"];
  const today = places.find(p => allowed.includes(p.type));
  if (!today) return;

  results.innerHTML += `
    <h2>⭐ رحلة اليوم</h2>
    <div class="place-card">
      <b>${today.name}</b><br>
      ${today.type} • ${today.distance.toFixed(2)} كم
    </div>
  `;

  addMarker(today, "⭐ رحلة اليوم");
}

/* =======================
   PLACES + ACCORDION
======================= */
function showPlaces(places) {
  results.innerHTML += "<h2>📍 الأماكن</h2>";

  places.forEach(p => {
    results.innerHTML += `
      <div class="place-card" onclick="toggleDetails('${p.id}')">
        <b>${p.name}</b><br>
        ${p.type} • ${p.distance.toFixed(2)} كم

        <div class="place-details" id="details-${p.id}" onclick="event.stopPropagation()">
          <button onclick="openReview('${p.id}')">⭐ قيّم المكان</button>

          <div id="review-form-${p.id}"></div>

          ${getReviewsHTML(p.id)}
        </div>
      </div>
    `;
    addMarker(p, p.name);
  });
}

/* =======================
   TOGGLE DETAILS
======================= */
function toggleDetails(placeId) {
  const card = document
    .querySelector(`#details-${placeId}`)
    .parentElement;

  card.classList.toggle("open");
}

/* =======================
   REVIEWS
======================= */
function openReview(placeId) {
  document.getElementById(`review-form-${placeId}`).innerHTML = `
    <div class="review">
      ⭐ <select id="stars-${placeId}">
        <option>5</option><option>4</option><option>3</option>
        <option>2</option><option>1</option>
      </select><br><br>

      💬 <textarea id="comment-${placeId}" rows="2"></textarea><br><br>

      🖼️ <input type="file" id="image-${placeId}" accept="image/*"><br><br>

      <button onclick="saveReview('${placeId}')">حفظ</button>
    </div>
  `;
}

function saveReview(placeId) {
  const stars = document.getElementById(`stars-${placeId}`).value;
  const comment = document.getElementById(`comment-${placeId}`).value;
  const imageInput = document.getElementById(`image-${placeId}`);

  const reader = new FileReader();
  reader.onload = () => {
    const review = { stars, comment, image: reader.result };

    let reviews = JSON.parse(localStorage.getItem("reviews")) || {};
    if (!reviews[placeId]) reviews[placeId] = [];
    reviews[placeId].push(review);

    localStorage.setItem("reviews", JSON.stringify(reviews));
    render(); // يرجّع الكروت مغلقة
  };

  if (imageInput.files[0]) reader.readAsDataURL(imageInput.files[0]);
  else reader.onload();
}

function getReviewsHTML(placeId) {
  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  if (!reviews[placeId]) return "";
  return reviews[placeId]
    .map(r => `
      <div class="review">
        ⭐ ${r.stars}<br>
        ${r.comment || ""}
        ${r.image ? `<img src="${r.image}">` : ""}
      </div>
    `)
    .join("");
}

/* =======================
   HELPERS
======================= */
function addMarker(p, label) {
  markers.push(L.marker([p.lat, p.lng]).addTo(map).bindPopup(label));
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* =======================
   EVENTS
======================= */
cats.forEach(btn => {
  btn.onclick = () => {
    cats.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.type;
    render();
  };
});

searchInput.addEventListener("input", render);

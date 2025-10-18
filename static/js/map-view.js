const socket = io();
const culturalLocations = [
	{ name: "Muzeul Olteniei", lat: 44.3148, lon: 23.7971 },
	{ name: "Muzeul de Artă Craiova", lat: 44.3165, lon: 23.8018 },
	{ name: "Catedrala Sfântul Dumitru", lat: 44.326, lon: 23.794 },
	{ name: "Stadionul Ion Oblemenco", lat: 44.3273, lon: 23.7986 },
	{ name: "Grădina Botanică Craiova", lat: 44.3278, lon: 23.7961 },
];
const visitedPoints = [];
const username = "Iustin";

const craiovaBounds = L.latLngBounds(
	[44.35745809206229, 23.733475785989047],
	[44.277779832389044, 23.86410630191919]
);

const userMarker = L.marker([44.3148, 23.7971]);
let map;
let positionWatchId;

init();

function init() {
	console.log("Initializing...");

	initMap();

	if (!navigator.geolocation) {
		alert("Acest browser nu suportă geolocația.");
		return;
	}

	positionWatchId = navigator.geolocation.watchPosition(
		(position) => {
			refreshLocation(position);
		},
		(error) => {
			console.error("Error watching position:", error.message);
		},
		{
			enableHighAccuracy: true,
			maximumAge: 0,
			timeout: 5000,
		}
	);
}

function initMap() {
	map = L.map("map", {
		zoomControl: false,
		maxBounds: craiovaBounds,
		maxBoundsViscosity: 0.5,
	}).setView([userMarker._latlng.lat, userMarker._latlng.lng], 13);

	L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
		minZoom: 13,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(map);

	userMarker.addTo(map);

	// Waypoints + cultural locations
	culturalLocations.forEach((loc) => {
		const marker = L.marker([loc.lat, loc.lon]).addTo(map);

		marker.on("click", () => {
			openChat(loc.name);
		});
	});
}

function updateScore() {
	const pct = Math.round((visitedPoints.length / culturalLocations.length) * 100);
	scoreDiv.innerText = `Acoperire: ${pct}%`;
}

function openChat(locationName) {
	if (document.getElementById(`chat-${locationName}`)) return;
	const chatBox = document.createElement("div");
	chatBox.className = "chatBox";
	chatBox.id = `chat-${locationName}`;
	chatBox.innerHTML = `
			        <div class="chatHeader">
			            Chat: ${locationName}
			            <span style="float:right; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">X</span>
			        </div>
			        <div class="chatContent" id="chatContent-${locationName}"></div>
			        <div class="chatInput">
			            <input type="text" id="msgInput-${locationName}" placeholder="Scrie mesaj..." />
			            <button onclick="sendMessage('${locationName}')">Trimite</button>
			        </div>
			    `;
	document.body.appendChild(chatBox);

	// Load mesaje salvate
	fetch(`/get_messages/${locationName}`)
		.then((r) => r.json())
		.then((data) => {
			const content = document.getElementById(`chatContent-${locationName}`);
			data.messages.forEach((msg) => {
				const div = document.createElement("div");
				div.textContent = msg;
				content.appendChild(div);
			});
			content.scrollTop = content.scrollHeight;
		});
}

function sendMessage(locationName) {
	const input = document.getElementById(`msgInput-${locationName}`);
	const msg = input.value.trim();
	if (!msg) return;
	socket.emit("send_message", { location: locationName, user: username, message: msg });
	input.value = "";
}

socket.on("receive_message", (data) => {
	const content = document.getElementById(`chatContent-${data.location}`);
	if (content) {
		const div = document.createElement("div");
		div.textContent = data.message;
		content.appendChild(div);
		content.scrollTop = content.scrollHeight;
	}
});

function refreshLocation(pos) {
	userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
	map.setView([userMarker._latlng.lat, userMarker._latlng.lng], map.getZoom());
	console.log("Location updated:", pos.coords.latitude, pos.coords.longitude);
}

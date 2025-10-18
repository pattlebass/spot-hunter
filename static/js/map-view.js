const mapButton = document.getElementById("tab-map");
const leaderboardButton = document.getElementById("tab-leaderboard");
const profileButton = document.getElementById("tab-you");

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

// Icons
var markerIcon = L.icon({
	iconUrl: "/static/images/spot-icon.png",
	shadowUrl: "/static/images/spot-shadow.png",

	iconSize: [48, 48], // size of the icon
	iconAnchor: [24, 48], // point of the icon which will correspond to marker's location
	shadowSize: [41, 41], // size of the shadow
	shadowAnchor: [10, 40], // the same for the shadow
	// popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
});
var userMarkerIcon = L.icon({
	iconUrl: "/static/images/user-marker-icon.png",
	// shadowUrl: "/static/images/spot-shadow.png",

	iconSize: [24, 24], // size of the icon
	iconAnchor: [12, 12], // point of the icon which will correspond to marker's location
	shadowSize: [41, 41], // size of the shadow
	shadowAnchor: [10, 40], // the same for the shadow
	// popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
});

const userMarker = L.marker([44.3148, 23.7971], { icon: userMarkerIcon });
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

	mapButton.addEventListener("change", openMap);
	leaderboardButton.addEventListener("change", openLeaderboard);
	profileButton.addEventListener("change", openProfile);
}

function initMap() {
	map = L.map("map", {
		zoomControl: false,
		maxBounds: craiovaBounds,
		maxBoundsViscosity: 0.5,
	}).setView([userMarker._latlng.lat, userMarker._latlng.lng], 14);

	L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		minZoom: 13,
	}).addTo(map);

	userMarker.addTo(map);

	// Waypoints + cultural locations
	culturalLocations.forEach((loc) => {
		const marker = L.marker([loc.lat, loc.lon], { icon: markerIcon }).addTo(map);

		marker.on("click", () => {
			openChat(loc.name);
		});
	});
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
	// map.setView([userMarker._latlng.lat, userMarker._latlng.lng], map.getZoom());
	console.log("Location updated:", pos.coords.latitude, pos.coords.longitude);
}

function openMap() {
	console.log("Map opened");
	map.setView([userMarker._latlng.lat, userMarker._latlng.lng], 14);
}

function openProfile() {
	console.log("Profile opened");
}

function openLeaderboard() {
	console.log("Leaderboard opened");
}

const mapContainer = document.getElementsByClassName("map-container")[0];
const navbar = document.getElementsByClassName("navbar")[0];
const mapButton = document.getElementById("tab-map");
const leaderboardButton = document.getElementById("tab-leaderboard");
const profileButton = document.getElementById("tab-you");

const culturalLocations = [];
let userData = {};

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
var unknownMarkerIcon = L.icon({
	iconUrl: "/static/images/spot-unknown-icon.png",
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

async function init() {
	console.log("Initializing...");

	await loadUserData();
	await loadSpots();
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

	mapButton.checked = true;

	mapButton.addEventListener("change", openMap);
	leaderboardButton.addEventListener("change", openLeaderboard);
	profileButton.addEventListener("change", openProfile);
}

async function loadSpots() {
	const spotIdsResponse = await fetch("/api/all-spot-ids");
	const spotIds = (await spotIdsResponse.json()).spots;
	for (const spotId of spotIds) {
		const infoResponse = await fetch(`/api/spot?spot-id=${spotId}`);
		const spot = (await infoResponse.json()).spot;

		spot["visited"] = userData.unlocked_spots.includes(spotId);

		culturalLocations.push(spot);
	}
}

async function loadUserData() {
	const userResponse = await fetch(`/api/user?user-id=${encodeURIComponent("foo@bar.com")}`);
	userData = (await userResponse.json()).user;
}

function initMap() {
	map = L.map("map", {
		zoomControl: false,
		maxBounds: craiovaBounds,
		maxBoundsViscosity: 0.5,
		attributionControl: false,
	}).setView([userMarker._latlng.lat, userMarker._latlng.lng], 14);

	L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		minZoom: 13,
	}).addTo(map);

	L.control
		.attribution({
			position: "topright",
		})
		.addTo(map);

	userMarker.addTo(map);

	culturalLocations.forEach((loc) => {
		const icon = loc.visited ? markerIcon : unknownMarkerIcon;
		const marker = L.marker([loc.y_coordinate, loc.x_coordinate], { icon: icon }).addTo(map);

		marker.on("click", () => {
			openSpot(loc);
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
	fetch(`/api/spot-messages?spot-id=${encodeURIComponent(locationName)}`)
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
	input.value = "";
}

function refreshLocation(pos) {
	console.log("Location updated:", pos.coords.latitude, pos.coords.longitude);
	userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
	// map.setView([userMarker._latlng.lat, userMarker._latlng.lng], map.getZoom());
}

function openMap() {
	closeAllPopups();
	map.setView([userMarker._latlng.lat, userMarker._latlng.lng], 14);
}

function openSpot(spot) {
	closeAllPopups();
	if (document.getElementById(`popup-spot`)) return;
	const profilePopup = document.createElement("div");
	profilePopup.className = "popup";
	profilePopup.id = `popup-spot`;
	let html = `
		<span class="popup-close" onclick="closeAllPopups()">x</span>
		<div class="popup-header">
			<img class="spot-picture" src="/static/images/landmark.svg" width="200" height="200" alt="profile picture">
			<div class="spot-name">${spot.name}</div>
	`;
	if (spot.visited) {
		html += `Visited`;
	} else {
		html += `Not visited yet`;
	}
	html += `</div>`;
	profilePopup.innerHTML = html;
	document.body.insertBefore(profilePopup, navbar);
}

function openProfile() {
	closeAllPopups();
	if (document.getElementById(`popup-profile`)) return;

	const progressPercent =
		Math.floor((userData.unlocked_spots.length / culturalLocations.length) * 100) + "%";
	const profilePopup = document.createElement("div");
	profilePopup.className = "popup";
	profilePopup.id = `popup-profile`;
	profilePopup.innerHTML = `
		<div class="popup-header">
			<img class="profile-picture" src="/static/images/profile.svg" width="200" height="200" alt="profile picture">
			<div class="profile-username">${userData.name}</div>
			<hr class="profile-separator">
			<div class="profile-label">Points</div>
			<div class="profile-points">
				${userData.total_points}
				<img src="/static/images/point.svg" width="24" height="24" alt="points icon" class="points-icon" />
			</div>
			<hr class="profile-separator">
			<div class="profile-label">${userData.unlocked_spots.length}/${culturalLocations.length} Spots Discovered</div>
			<div class="profile-progress-bar">
  			<div class="profile-progress-fill" style="width: ${progressPercent}">
					${progressPercent}
					<div class="bubble-container">
						<span class="bubble bubble1"></span>
						<span class="bubble bubble2"></span>
						<span class="bubble bubble3"></span>
					</div>
				</div>
			</div>
		</div>
	`;
	document.body.insertBefore(profilePopup, navbar);
}

async function openLeaderboard() {
	closeAllPopups();
	if (document.getElementById(`popup-leaderboard`)) return;

	const leaderboardPopup = document.createElement("div");
	leaderboardPopup.className = "popup";
	leaderboardPopup.id = `popup-leaderboard`;
	let html = `
		<div class="popup-header">
			<div class="leaderboard-title">Leaderboard</div>
			<ol class="leaderboard-list">
	`;
	const userResponse = await fetch(`/api/leaderboard`);
	const users = (await userResponse.json()).leaderboard;
	for (const user of users) {
		html += `
			<li>
				<img src="/static/images/profile.svg" width="32" height="32" alt="profile picture" class="leaderboard-profile-picture" />
				<span class="leaderboard-username">${truncate(user.name, 11)}</span>
				<span class="leaderboard-points-container">
					${user.total_points}
					<img src="/static/images/point.svg" width="32" height="32" alt="points" class="points-icon" />
				</span>
			</li>
		`;
	}
	html += `<div style="height:${navbar.offsetHeight}px"></div>`; // spacer for navbar
	html += `</ol></div>`;
	leaderboardPopup.innerHTML = html;
	document.body.insertBefore(leaderboardPopup, navbar);
}

function closeAllPopups() {
	const popups = document.getElementsByClassName("popup");
	while (popups.length > 0) {
		popups[0].remove();
	}
}

function truncate(str, maxLength) {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 1) + "…";
}

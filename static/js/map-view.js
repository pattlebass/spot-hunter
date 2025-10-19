const UNLOCK_RANGE = 50; // meters

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
	const spotResponse = await fetch("/api/all-spots");
	const spots = (await spotResponse.json()).spots;
	for (const spot of spots) {
		spot["visited"] = userData.unlocked_spots.includes(spot.id);
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

		loc["marker"] = marker;
		marker.on("click", () => {
			openSpot(loc);
		});
	});
}

async function unlockSpot(spotId) {
	// Hugely inefficient but I guess it's called a hackathon for a reason
	const spot = culturalLocations.find((s) => s.id === spotId);

	const visitResponse = await fetch(
		`/api/visit-spot?user-id=${userData.email}&spot-id=${spotId}`,
		{}
	);
	const pointsGiven = (await visitResponse.json()).points_given;

	if (pointsGiven > 0) {
		spot.visited = true;
		spot.marker.setIcon(markerIcon);
		loadUserData();
		await openSpot(spot); // Should not mess with UI here, but oh well
		console.log("Passed openSpot() after unlocking spot.");
		// animation
		const spotPicture = document.querySelector(".spot-icon");
		spotPicture.classList.add("spot-unlock-animation");
		// score
		setTimeout(() => {
			const pointsContainer = document.createElement("div");
			pointsContainer.classList.add("spot-points-given");
			pointsContainer.innerHTML = `
				+${pointsGiven}
				<img src="/static/images/point.svg" width="40" height="40" alt="points icon" class="points-icon" />
			`;
			spotPicture.parentElement.appendChild(pointsContainer);
		}, 1000);
	}
}

function refreshLocation(pos) {
	console.log("Location updated:", pos.coords.latitude, pos.coords.longitude);
	userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
}

function openMap() {
	closeAllPopups();
	map.setView([userMarker._latlng.lat, userMarker._latlng.lng], 14);
}

async function openSpot(spot) {
	const profilePopup = document.createElement("div");
	profilePopup.className = "popup";
	profilePopup.id = `popup-spot`;

	const iconClasses = spot.visited ? "spot-icon" : "spot-icon spot-undiscovered";
	let html = `
		<span class="popup-close" onclick="closeAllPopups()">x</span>
		<div class="popup-header">
			<img class="${iconClasses}" src="/static/images/landmark.svg" width="200" height="200" alt="profile picture">
			<div class="spot-name">${spot.name}</div>
	`;

	// strong candidate for worst code ever written
	if (userMarker.getLatLng().distanceTo(spot.marker.getLatLng()) <= UNLOCK_RANGE) {
		if (spot.visited) {
			html += `Leave a message for the next visitors!`;
			// Chat box
			html += await getChatBox(spot);
		} else {
			html += `
				<button class="primary-button" onclick="unlockSpot(${spot.id});">Discover</button>
			`;
		}
	} else {
		if (spot.visited) {
			html += `You have already discovered this spot.`;
		} else {
			html += `Move closer to this spot to discover it!`;
		}
	}
	html += getNavbarSpacer();
	html += `</div>`;
	profilePopup.innerHTML = html;

	const popupsToClose = getAllPopups();
	closePopups(popupsToClose);
	document.body.insertBefore(profilePopup, navbar);
	console.log("Opened spot:", spot.name);
}

async function getChatBox(spot) {
	let html = `
		<div class="spot-chat-container">
		<div class="spot-chat-title">The Wall of Messages</div>
	`;

	const messagesResponse = await fetch(`/api/spot-messages?spot-id=${encodeURIComponent(spot.id)}`);
	const messages = (await messagesResponse.json()).messages;
	for (const message of messages) {
		html += `<div class="spot-chat-message">${message}</div>`;
	}

	html += `
		<div class="spot-chat-input-container">
			<input type="text" id="spot-chat-content-${spot.id}" placeholder="I was here..." />
			<button class="primary-button" onclick="sendMessage(${spot.id})">➤</button>
		</div>
	`;

	html += `</div>`;

	return html;
}

async function sendMessage(spotId) {
	const input = document.getElementById(`spot-chat-content-${spotId}`);
	const msg = input.value.trim();
	if (!msg) return;
	await fetch(
		`/api/spot-leave-message?user-id=${encodeURIComponent(
			userData.email
		)}&spot-id=${encodeURIComponent(spotId)}&message=${encodeURIComponent(msg)}`
	);
	input.value = "";
	openSpot(culturalLocations.find((s) => s.id === spotId));
}

function openProfile() {
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

	const popupsToClose = getAllPopups();
	document.body.insertBefore(profilePopup, navbar);
	closePopups(popupsToClose);
}

async function openLeaderboard() {
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
	html += getNavbarSpacer();
	html += `</ol></div>`;
	leaderboardPopup.innerHTML = html;

	const popupsToClose = getAllPopups();
	document.body.insertBefore(leaderboardPopup, navbar);
	closePopups(popupsToClose);
}

function getAllPopups() {
	return document.querySelectorAll(".popup");
}

function closePopups(popups) {
	for (const popup of popups) {
		popup.remove();
	}
}

function closeAllPopups() {
	closePopups(getAllPopups());
}

function getNavbarSpacer() {
	return `<div style="height:${navbar.offsetHeight * 2}px"></div>`;
}

function truncate(str, maxLength) {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 1) + "…";
}

var L = require('leaflet');
var C = require('chance').Chance();

import "./ui/volume.js";
import "./ui/message.js";
import "./ui/defaultextent.js";
// import "./lib/leaflet-providers.js";

import LandMap from "./map.js";
import Population from "./population.js";
import AudioManager from "./audio.js";
import SidebarContainer from "./sidebar.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';

import { B_STARTZOOM, B_CSS } from "./settings.js";

// ----------------------------------------
// Shadow DOM??
// ----------------------------------------
let container = document.querySelector("#shorebirds-container");
let shadow = container.attachShadow({mode: 'open'});

let mapdiv = document.createElement('div');
mapdiv.setAttribute("id", "shorebirds-map");
let innards = B_CSS;

mapdiv.innerHTML = innards;
shadow.appendChild(mapdiv);

// ----------------------------------------
// Map setup
// ----------------------------------------
L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';

let useData = cobb_data;
let map = L.map(mapdiv, {
	zoomSnap: 0.25,
	zoomControl: false,
}).on("load", function() {
	console.log("map loaded!");
	setTimeout(function(){
		map.invalidateSize();
	}, 1000);
}).setView(useData.center, B_STARTZOOM);

let base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Layers
let habitatLayer = L.layerGroup();
let birdMarkers = L.layerGroup().addTo(map);

let baseMaps = {
	"Abstract": base
};

let overlays = {
	"Birds": birdMarkers,
	"Habitats": habitatLayer
};

// Controls
let pos = (L.Browser.mobile) ? "topright" : "topleft";
let layers = L.control.layers(baseMaps, overlays, {hideSingleBase: true}).addTo(map);
let zoom = L.control.zoom({position: pos}).addTo(map);
let home = L.control.defaultExtent({
	position: pos,
	text: "Center of island",
	title: "Jump to island center",
}).setCenter(useData.center).addTo(map);
let sc = new SidebarContainer(map, shadow, useData);
sc.init(changeIsland, changeDate);


// ----------------------------------------
// Data
// ----------------------------------------

let tiles = new LandMap(map, useData, habitatLayer);
let pop = new Population(map, birdMarkers, shadow);

// Sound stuff that should be missing in most cases
let sfx, volume, audioStatus;
if (!L.Browser.mobile) {
	sfx = new AudioManager();
	sfx.load();

	volume = L.control.range().addTo(map);
	volume.on("input change click", function(e) {
		console.log("master volume to "+e.value);
		if (sfx) {
			sfx.master(parseFloat(e.value));
		}
	});

	audioStatus = L.control.messagebox({position: "bottomright"}).addTo(map);
}

// ----------------------------------------
// Listeners
// ----------------------------------------

map.on("movestart", function(e){
	shadow.querySelector("#shorebirds-map").classList.add("no-text-select");
})

// update the map when it pans
map.on("move", function(e){
	let sq = tiles.getSquareAtMapCenter();
	pop.update();
	if (!L.Browser.mobile) {
		sfx.update(pop.getVisibleBirds(), pop.getBirds(), sq);
	}
});

map.on("moveend", function(e) {
	map.invalidateSize();
	shadow.querySelector("#shorebirds-map").classList.remove("no-text-select");
});

// update the latlng of the center when we resize
map.on("resize", function(e){
	pop.recenter();
});

map.on("click", function(e) {
	sc.sidebar.close();
});

// Click on "view more" link in popup to open the sidebar pane
map.on("popupopen", function(e){
	sc.sidebar.enablePanel("shorebirds-bird-data");
	// sc.replaceWikiPane(e.popup.options.species, soloListener);
	console.log("it open");

	setTimeout(function() {
		console.log("adding timer");
		shadow.querySelector(".openInfo").addEventListener("click", wikiFromPopup)
	}, 800);
	
});

// map.on("popupclose", function(e){
// 	console.log("it close");
// 	shadow.querySelector(".openInfo").removeEventListener("click", wikiFromPopup);
// });

function wikiFromPopup(e) {
	console.log("calling wiki popups??");
	let b = this.value;
	sc.replaceWikiPane(b, soloListener);
	sc.sidebar.open('shorebirds-bird-data');
	map.closePopup();

	e.target.removeEventListener("click", wikiFromPopup);
}

function changeIsland(i) {
	useData = (i == 0) ? cobb_data : hog_data;
	birdMarkers.clearLayers();
	habitatLayer.clearLayers();
	tiles = new LandMap(map, useData, habitatLayer);
	map.flyTo(useData.center);
	home.setCenter(useData.center);
}

function changeDate(date) {
	console.log("changing the date!");
	if (date == -1) {
		return;
	}
	if (!L.Browser.mobile && sfx.audioLoaded) {
		console.log("resetting audio nodes because it's loaded");
		sfx.reset(pop.getBirds());
	}
	pop.clearBirds().then(() => pop.generateBirds(useData, date, tiles));
	
	sc.popTable(date, pop.colorList, muteListener, listenSpeciesRow);

	if (!L.Browser.mobile) {
		sfx.setup(useData.birds_and_days[date].count, bird_data);
		sfx.update(pop.getVisibleBirds(), pop.getBirds());	
	}
}

// when the solo toggle in the wiki is clicked
let soloState = 0;
function soloListener(e) {
	console.log("clicking on solo play");
	let elem = e.target.closest(".solo-play-wrap");
	let species = elem.attributes.species.value;
	soloState = (soloState == 0) ? 1 : 0;
	sfx.toggleSolo(soloState, species);

	sc.toggleSoloButton(soloState, elem);
}

// when the mute checkbox is clicked
function muteListener(e) {
	console.log(`species ${this.value}, muting? ${this.checked}`);
	e.stopPropagation();
	sfx.muteSpecies(this.value, this.checked, pop.getBirds());
	sfx.update(pop.getVisibleBirds(), pop.getBirds());
}

// when row in the chart has been clicked
function listenSpeciesRow(e) {
	console.log("clicked on a row");
	let prev = shadow.querySelectorAll(".row-active");
	if (this == prev[0]) { // deselecting
		this.classList.remove("row-active");
		pop.cancelHighlight();
		return;
	}
	for (let item of prev) {
		item.classList.remove("row-active");
	};
	this.classList.add("row-active");
	let b = parseInt(this.attributes["species-index"].value);
	let s = pop.highlightSpecies(b);
	map.setView(s.getLatLng());
	sc.replaceWikiPane(b);

	sc.sidebar.enablePanel("shorebirds-bird-data");
}

let soundStart = function() {
	let val = sfx.hasAudioLoaded();
	if (val >= 0 && val < 1) {
		audioStatus.show("sounds loading...", "progress-bar", val);
		setTimeout(soundStart, 100);
	}
	else if (val === 1) {
		audioStatus.show("sounds decoding...", "progress-wait");
		setTimeout(soundStart, 1000);
	}
	else if (val === true) {
		if (L.Browser.safari) {
			audioStatus.show("sounds loaded! click me to enable audio.", "sounds-loaded-click-dismiss");
			shadow.querySelector('.sounds-loaded-click-dismiss').addEventListener("click", startSafari);
		}
		else {
			audioStatus.show("sounds loaded! move the map around to start audio playback.", "sounds-loaded-hide");
		}
	}
	else {
		audioStatus.show("file load issue! try reloading this page.");
	}
};

if (!L.Browser.mobile) {
	soundStart();
}

function startSafari() {
	console.log("clicked the thing");
	sfx.safariHack();
	shadow.querySelector('.sounds-loaded-click-dismiss').removeEventListener("click", startSafari);
	audioStatus.show("sounds playing! if you don't hear anything, move the map around.", "sounds-loaded-hide");
}


// ----------------------------------------
// Assorted Polyfills
// ----------------------------------------
if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest =
    function(s) {
        var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i,
            el = this;
        do {
            i = matches.length;
            while (--i >= 0 && matches.item(i) !== el) {};
        } while ((i < 0) && (el = el.parentElement));
        return el;
    };
}

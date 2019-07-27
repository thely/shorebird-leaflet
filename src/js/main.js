var L = require('leaflet');
var C = require('chance').Chance();
import "./ui/island.js";
import "./ui/date.js";

import LandMap from "./map.js";
import Population from "./population.js";
import AudioManager from "./audio.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';
import pixelColors from './data/colorlist.js';

// ----------------------------------------
// Map setup
// ----------------------------------------
L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';

let useData = cobb_data;
let map = L.map('map', {zoomSnap: 0.25}).setView(useData.center, 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// ----------------------------------------
// Map/Base
// ----------------------------------------

let tiles = new LandMap(map, useData);
// tiles.show();
let birdMarkers = L.layerGroup().addTo(map);
let pop = new Population(map, birdMarkers);
let sfx = new AudioManager();

// ----------------------------------------
// UI
// ----------------------------------------

// Pick/change island
let island_sel = new L.IslandSel({islands: ["Cobb Island", "Hog Island"]}).addTo(map);

island_sel.on('change', function(e) {
	useData = (e.island == "Cobb Island") ? cobb_data : hog_data;
	map.flyTo(useData.center);
	mark.setLatLng(useData.origin);
});

// Pick/change day
let days = [];
for (let i = 0; i < useData["birds_and_days"].length; i++) {
	days.push(useData["birds_and_days"][i]["date"]);
}

let date_sel = new L.DateSel({dates: days}).addTo(map);

date_sel.on('change', function(e) {
	if (sfx.audioLoaded) {
		console.log("resetting audio nodes because it's loaded");
		sfx.reset(pop.getBirds());
	}
	birdMarkers.clearLayers();
	pop.generateBirds(useData, e.selDate, tiles);
	sfx.setup(useData.birds_and_days[e.selDate].count, bird_data);
	// tryAudio();
});

// ----------------------------------------
// Audio??
// ----------------------------------------


// ----------------------------------------
// Listeners
// ----------------------------------------

// mark.on("click", function(e) {
// 	console.log(e.latlng);
// });

// map.on("click", function(e) {
// 	console.log(e.latlng);
// });

map.on("move", function(e){
	pop.update();
	sfx.update(pop.getVisibleBirds(), pop.getBirds());
	// console.log(pop.getVisibleBirds());
});


// map.addLayer( L.gridLayer.debugCoords() );





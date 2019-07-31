var L = require('leaflet');
var C = require('chance').Chance();
var tablesort = require('tablesort');
import "leaflet-sidebar-v2/js/leaflet-sidebar.min.js";
import "tablesort/src/sorts/tablesort.number.js";
import "./ui/island.js";
import "./ui/date.js";

import LandMap from "./map.js";
import Population from "./population.js";
import AudioManager from "./audio.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';
import pixelColors from './data/colorlist.js';

import { B_POPSCALE } from "./settings.js";

// ----------------------------------------
// Map setup
// ----------------------------------------
L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images/';

let useData = cobb_data;
let map = L.map('map', {
	zoomSnap: 0.25,
	zoomControl: false,
}).setView(useData.center, 14);

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

let zoom = L.control.zoom({position: "bottomright"}).addTo(map);

// ----------------------------------------
// UI
// ----------------------------------------

// Pick/change island
let island_sel = new L.IslandSel({
	islands: ["Cobb Island", "Hog Island"],
	position: "topright",
}).addTo(map);

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

let date_sel = new L.DateSel({
	dates: days,
	position: "topright"
}).addTo(map);

date_sel.on('change', function(e) {
	if (sfx.audioLoaded) {
		console.log("resetting audio nodes because it's loaded");
		sfx.reset(pop.getBirds());
	}
	birdMarkers.clearLayers();
	pop.generateBirds(useData, e.selDate, tiles);
	sfx.setup(useData.birds_and_days[e.selDate].count, bird_data);
	popTable(e.selDate);
});

// ----------------------------------------
// UI - Sidebar
// ----------------------------------------

let sidebar = L.control.sidebar({
	position: 'left',
	container: 'sidebar'
}).addTo(map);

sidebar.addPanel({
	id: "home",
	tab: "<i class='fas fa-bars'></i>",
	title: "Home",
	pane: "<p>Would you like to know more about birds?</p>",
}).open('home');

sidebar.addPanel({
	id: "pop-table",
	tab: "<i class='fas fa-chart-bar'></i>",
	title: "Total Birds",
	pane: "<p>Select a day to view population data.</p><table id='bird-table'></table>",
});

sidebar.addPanel({
	id: "bird-data",
	tab: "<i class='fas fa-feather'></i>",
	title: "Species Data",
	pane: "<p>lorem ipsum etc</p>",
});

// ----------------------------------------
// Helpers
// ----------------------------------------

function popTable(day) {
	let today = useData.birds_and_days[day];
	let p = `<p>Population data for ${today.date}. Sort by species, population all day, and population visible right now.</p>`;
	let content = `<thead><tr>
		<th role="columnheader">Species</th>
		<th role="columnheader">All Day</th>
		<th role="columnheader">Scaled</th>
		<th role="columnheader" data-sort-method="none">Color</th>
		<th role="columnheader" data-sort-method="none">Mute</th>
		</tr></thead><tbody>`;
	for (let i = 0; i < today.count.length; i++) {
		if (today.count[i] > 0) {
			content += `<tr class="species-row" id="table-species-${i}" species-index="${i}">
			<td data="${i}">${bird_data[i].common_name}</td>
			<td>${today.count[i]}</td>
			<td>${Math.ceil(today.count[i] * B_POPSCALE)}</td>
			<td class="bird-shade" style="background-color: ${pop.getColor(i)};">&nbsp;</td>
			<td><input type="checkbox" id="species-mute-${i}" value="${i}" /></td>
			</tr>`;
		}
	}
	content += "</tbody>";

	document.getElementById("bird-table").innerHTML = content;
	tablesort(document.getElementById("bird-table"));
	
	// if name is clicked in panel, show on map
	for (let i = 0; i < today.count.length; i++) {
		if (today.count[i] > 0) {
			// full row listener
			document.getElementById("table-species-"+i).addEventListener('click', function(){
				let prev = document.getElementsByClassName("row-active");
				while (prev.length) {
					prev[0].classList.remove("row-active");
				};
				this.classList.add("row-active");
				let b = parseInt(this.attributes["species-index"].value);
				let s = pop.highlightSpecies(b);
				map.setView(s.getLatLng());
			});
			// checkbox mute listeners
			document.getElementById("species-mute-"+i).addEventListener('change click', function(e){
				// sfx.muteSpecies(this.value);
				e.stopPropagation();
			});
		}
	}
}


// ----------------------------------------
// Listeners
// ----------------------------------------

// mark.on("click", function(e) {
// 	console.log(e.latlng);
// });

map.on("move", function(e){
	pop.update();
	sfx.update(pop.getVisibleBirds(), pop.getBirds());
	// console.log(pop.getVisibleBirds());
});

map.on("resize", function(e){
	pop.recenter();
});



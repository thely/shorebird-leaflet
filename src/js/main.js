var L = require('leaflet');
var C = require('chance').Chance();
var tablesort = require('tablesort');
import "leaflet-sidebar-v2/js/leaflet-sidebar.min.js";
import "tablesort/src/sorts/tablesort.number.js";
import "./ui/volume.js";

import LandMap from "./map.js";
import Population from "./population.js";
import AudioManager from "./audio.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';
import wiki_data from "./data/bird_wiki_data.js";
import pixelColors from './data/colorlist.js';
import land_types from './data/land_types.js';

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

let base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Layers
let habitatLayer = L.layerGroup();
let birdMarkers = L.layerGroup().addTo(map);

let baseMaps = {
	"Abstract": base,
};
let overlays = {
	"Birds": birdMarkers,
	"Habitats": habitatLayer
};

// Controls
let layers = L.control.layers(baseMaps, overlays).addTo(map);
let zoom = L.control.zoom({position: "topleft"}).addTo(map);
let volume = L.control.range().addTo(map);

volume.on("input change click", function(e) {
	console.log("master volume to "+e.value);
	if (sfx) {
		sfx.master(parseFloat(e.value));
	}
});

// ----------------------------------------
// Data
// ----------------------------------------

let tiles = new LandMap(map, useData, habitatLayer);
let pop = new Population(map, birdMarkers);
let sfx = new AudioManager();


// ----------------------------------------
// UI - Sidebar
// ----------------------------------------

let sidebar = L.control.sidebar({
	position: 'left',
	container: 'sidebar',
	autoPan: true
}).addTo(map);

sidebar.addPanel({
	id: "home",
	tab: "<i class='fas fa-bars'></i>",
	title: "Home",
	pane: 	`<p>Select and island and a date from the list to get started. Picking a date
				will spatialize birds on the map that were present on that day, on that island.
				For more information about how this works, see the about tab.</p>
			 <h4>Island</h4>
			 <div class="select-controls"><select class="island-select">
				 <option value="0">Cobb Island</option>
				 <option value="1">Hog Island</option>
			 </select>
			 <h4>Dates</h4>
			 <select class="date-select">
			 	${genDateOptions(useData)}
			 </select>
			 </div>`,
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
	pane: "<div id='bird-wiki'><p>Select a bird on the map to see more information.</p></div>",
});

sidebar.addPanel({
	id: "land-pane",
	tab: "<i class='fas fa-map'></i>",
	title: "Land Types",
	pane: `<p>A land use map breaks up a region into square segments of a given real-world size.
	 The most dominant habitat
	 type defines the region. Below are the habitats present on Cobb and Hog islands.</p>
	 <p>To see the land use map as an overlay, enable it via the layers control.</p>
	 ${generateLandUseLegend()}`,
});

function generateLandUseLegend() {
	let content = "<ul>";
	for (let i = 0; i < land_types.length; i++) {
		content += `<li><i class='fas fa-square-full' 
			style='color: ${pixelColors[i]};'></i>
			<span>${land_types[i]}</span></li>`;
	}
	content += "</ul>";
	return content;
}

// ----------------------------------------
// Opening Pane
// ----------------------------------------

let island_sel = document.querySelector("select.island-select")
	.addEventListener("change", e => changeIsland(e.srcElement.value));

let date_sel = document.querySelector("select.date-select")
	.addEventListener("change", e => changeDate(e.srcElement.value));

function changeIsland(i) {
	useData = (i == 0) ? cobb_data : hog_data;
	let d = document.querySelector("select.date-select").innerHTML = genDateOptions(useData);
	map.flyTo(useData.center);
}

function changeDate(date) {
	console.log("changing the date!");
	console.log(date);
	if (sfx.audioLoaded) {
		console.log("resetting audio nodes because it's loaded");
		sfx.reset(pop.getBirds());
	}
	birdMarkers.clearLayers();
	pop.generateBirds(useData, date, tiles);
	sfx.setup(useData.birds_and_days[date].count, bird_data);
	popTable(date);
}

function genDateOptions(useData) {
	let content = "";
	for (let i = 0; i < useData.birds_and_days.length; i++) {
		content += `<option value='${i}'>${useData.birds_and_days[i].date}</option>`;
	}
	return content;
}

// ----------------------------------------
// Population Table Pane
// ----------------------------------------

function popTable(day) {
	let today = useData.birds_and_days[day];
	let p = `<p>Population data for ${today.date}. Sort by species, population all day, and population visible right now.</p>`;
	let content = `<thead><tr>
		<th data-sort-default>Species</th>
		<th>All Day</th>
		<th>Scaled</th>
		<th data-sort-method="none">Color</th>
		<th data-sort-method="none">Mute</th>
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
			let check = document.querySelector("input#species-mute-"+i);

			// checkbox mute listeners
			"click".split(" ")
			    .map(name => check.addEventListener(name, function(e) {
			    	console.log(`species ${this.value}, muting? ${this.checked}`);
					e.stopPropagation();
					sfx.muteSpecies(this.value, this.checked, pop.getBirds());
					sfx.update(pop.getVisibleBirds(), pop.getBirds());
			    }, false));

			// full row listener
			document.getElementById("table-species-"+i)
				.addEventListener('click', listenSpeciesRow);
		}
	}
}

let soloState = 0;
function listenSpeciesRow() {
	let prev = document.getElementsByClassName("row-active");
	while (prev.length) {
		prev[0].classList.remove("row-active");
	};
	this.classList.add("row-active");
	let b = parseInt(this.attributes["species-index"].value);
	let s = pop.highlightSpecies(b);
	map.setView(s.getLatLng());
	replaceWikiPane(b);
	// sidebar.open('bird-data');
}

// ----------------------------------------
// Wiki Pane
// ----------------------------------------

function replaceWikiPane(b) {
	document.getElementById("bird-wiki").innerHTML = wikiSidebarContent(b);

	document.querySelector(".solo-play").addEventListener("click", function(e) {
		e.target.classList.toggle("fa-play-circle");
		e.target.classList.toggle("fa-pause-circle");
		soloState = (soloState == 0) ? 1 : 0;
		let spec = e.target.attributes.species.value;
		sfx.toggleSolo(soloState, spec);
	});
}

function wikiSidebarContent(species) {
	let content = 
		`
		<h3 class="birdName">${bird_data[species].common_name} 
			<span class="science">(${bird_data[species].scientific_name})</span>
		</h3>
		<p class="birdImage"><img src="${wiki_data[species].image}" /></p>
		<blockquote class="birdSummary">${wiki_data[species].summary}</blockquote>
		<a href="${wiki_data[species].url}"><p>View full Wikipedia article</p></a>
		`;

	content += `<div class="clear"></div>
		<h3>Listen</h3>
		<div class="solo-play-wrap">
			<i class="fas fa-play-circle solo-play" value="0" species="${species}"></i>
		</div>
		<p>Click play to hear only this species' call. The sonification on the map
		will be muted until you pause.</p>`;

	// stats across all days and islands
	content += "<h3>Appearances</h3>";
	content += speciesAppearancesTable("Cobb Island", cobb_data, species);
	content += speciesAppearancesTable("Hog Island", hog_data, species);
	
	return content;
}

// table of one species' population on all days, for one island
function speciesAppearancesTable(island, data, species) {
	let content = `<div class="bird-all-days">
		<h4>${island}</h4><table><thead><tr>
		<td>Date</td>
		<td>Population</td>
		</tr></thead><tbody>`;
	for (let i = 0; i < data.birds_and_days.length; i++) {
		content += `<tr>
			<td>${data.birds_and_days[i].date}
			<td>${data.birds_and_days[i].count[species]}</td>
			</tr>`;
	}
	content += `</tbody></table></div>`;
	return content;
}

// ----------------------------------------
// Listeners
// ----------------------------------------

// update the map when it pans
map.on("move", function(e){
	let sq = tiles.getSquareAtMapCenter();
	// console.log(sq);

	pop.update();
	sfx.update(pop.getVisibleBirds(), pop.getBirds(), sq);
});

// update the latlng of the center when we resize
map.on("resize", function(e){
	pop.recenter();
});

// Click on "view more" link in popup to open the sidebar pane
map.on("popupopen", function(e){
	document.querySelector(".openInfo").addEventListener("click", function(q){
		let b = e.popup.options.species;
		replaceWikiPane(b);
		sidebar.open('bird-data');
		map.closePopup();
	})
});




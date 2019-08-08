var L = require('leaflet');
var C = require('chance').Chance();
var tablesort = require('tablesort');
import "leaflet-sidebar-v2/js/leaflet-sidebar.min.js";
import "tablesort/src/sorts/tablesort.number.js";
import "./ui/volume.js";
import "./ui/message.js";
import "./ui/defaultextent.js";

import LandMap from "./map.js";
import Population from "./population.js";
import AudioManager from "./audio.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';
import wiki_data from "./data/bird_wiki_data.js";
import pixelColors from './data/colorlist.js';
import land_types from './data/land_types.js';

import { library, icon } from '@fortawesome/fontawesome-svg-core';
import { faBars, faChartBar, faFeather, faMap, faPlayCircle, faPauseCircle, faCaretLeft, faSquareFull } from '@fortawesome/free-solid-svg-icons';

library.add(faBars, faChartBar, faFeather, faMap, faPlayCircle, faPauseCircle, faSquareFull, faCaretLeft);

import { B_POPSCALE, B_STARTZOOM, B_CSS } from "./settings.js";

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
let home = L.control.defaultExtent().setCenter(useData.center).addTo(map);

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
	autopan: true
}).addTo(map);

sidebar.addPanel({
	id: "shorebirds-side-home",
	tab: icon(faBars).html,
	title: "Home",
	pane: 	`<p>Select an island and a date from the list to get started. Picking a date
				will spatialize birds on the map that were present on that day, on that island.
				For more information about how this works, see the about tab.</p>
			 <div class="select-controls">
			 <h4>Island</h4>
			 <select class="island-select">
				 <option value="0">Cobb Island</option>
				 <option value="1">Hog Island</option>
			 </select>
			 <div class="clear"></div>
			 <h4>Dates</h4>
			 <select class="date-select drop-glow">
			 	${genDateOptions(useData)}
			 </select>
			 </div>`,
}).open('shorebirds-side-home');

sidebar.addPanel({
	id: "shorebirds-pop-table",
	tab: icon(faChartBar).html,
	title: "Population Data",
	pane: "<div class='pop-desc'><p>Select a day to view population data.</p></div><table id='bird-table'></table>",
});

sidebar.addPanel({
	id: "shorebirds-bird-data",
	tab: icon(faFeather).html,
	title: "Species Detail",
	pane: "<div id='bird-wiki'><p>Select a bird on the map to see more information.</p></div>",
});

sidebar.addPanel({
	id: "shorebirds-land-pane",
	tab: icon(faMap).html,
	title: "Land Types",
	pane: `<p>A land use map breaks up a region into square segments of a given real-world size.
	 The most dominant habitat
	 type defines the region. Below are the habitats present on Cobb and Hog islands.</p>
	 <p>To see the land use map as an overlay, enable it via the layers control.</p>
	 ${generateLandUseLegend()}`,
});

let closetabs = shadow.querySelectorAll('span.leaflet-sidebar-close');
for (let i = 0; i < closetabs.length; i++) {
	closetabs[i].innerHTML = icon(faCaretLeft).html;
}

function generateLandUseLegend() {
	let content = "<ul>";
	for (let i = 0; i < land_types.length; i++) {
		content += `<li>${icon(faSquareFull, { 
			styles: { 'color': pixelColors[i] }
		}).html}
		<span>${land_types[i]}</span></li>`;
	}
	content += "</ul>";
	return content;
}

// ----------------------------------------
// Opening Pane
// ----------------------------------------

let island_sel = shadow.querySelector("select.island-select")
	.addEventListener("change", e => changeIsland(e.srcElement.value));

let date_sel = shadow.querySelector("select.date-select")
	.addEventListener("change", e => changeDate(e.srcElement.value));

function changeIsland(i) {
	useData = (i == 0) ? cobb_data : hog_data;
	birdMarkers.clearLayers();
	habitatLayer.clearLayers();
	tiles = new LandMap(map, useData, habitatLayer);
	let d = shadow.querySelector("select.date-select").innerHTML = genDateOptions(useData);
	map.flyTo(useData.center);
	home.setCenter(useData.center);
	shadow.querySelector("select.date-select").classList.add("drop-glow");
}

function changeDate(date) {
	console.log("changing the date!");
	console.log(date);
	if (date == -1) {
		return;
	}
	if (sfx.audioLoaded) {
		console.log("resetting audio nodes because it's loaded");
		sfx.reset(pop.getBirds());
	}
	birdMarkers.clearLayers();
	pop.generateBirds(useData, date, tiles);
	sfx.setup(useData.birds_and_days[date].count, bird_data);
	sfx.update(pop.getVisibleBirds(), pop.getBirds());
	popTable(date);

	shadow.querySelector("select.date-select").classList.remove("drop-glow");
}

function genDateOptions(useData) {
	let content = "<option value='-1'>--Pick a date--</option>";
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
	let p = `<p>The table below shows all population data for birds on ${today.date} 
			 at ${useData.name}.</p><ul>
			 <li><strong>All Day vs Scaled.</strong> All Day numbers represent the total number
			 of birds surveyed on ${today.date}; the Scaled number is what's displayed, scaled by 1/24.</li>
			 <li><strong>Select a species.</strong> Selecting a row from this list will highlight all
			 its members on the map. More information on that species is then visible in the
			 <span class="link-away">${icon(faFeather).html} Species Data</span> tab.</li>
			 <li><strong>Mute a species.</strong> Muting a species frees up audio channels for other
			 birds. This is best used on a high-population species.</li>`;
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

	shadow.querySelector('.pop-desc').innerHTML = p;
	shadow.getElementById("bird-table").innerHTML = content;
	tablesort(shadow.getElementById("bird-table"));
	
	// if name is clicked in panel, show on map
	for (let i = 0; i < today.count.length; i++) {
		if (today.count[i] > 0) {
			let check = shadow.querySelector("input#species-mute-"+i);

			// checkbox mute listeners
			"click".split(" ")
			    .map(name => check.addEventListener(name, function(e) {
			    	console.log(`species ${this.value}, muting? ${this.checked}`);
					e.stopPropagation();
					sfx.muteSpecies(this.value, this.checked, pop.getBirds());
					sfx.update(pop.getVisibleBirds(), pop.getBirds());
			    }, false));

			// full row listener
			shadow.getElementById("table-species-"+i)
				.addEventListener('click', listenSpeciesRow);
		}
	}
}

let soloState = 0;
function listenSpeciesRow() {
	console.log("clicked on a row");
	let prev = shadow.querySelectorAll(".row-active");
	for (let item of prev) {
		console.log(item);
		item.classList.remove("row-active");
	};
	this.classList.add("row-active");
	let b = parseInt(this.attributes["species-index"].value);
	let s = pop.highlightSpecies(shadow, b);
	map.setView(s.getLatLng());
	replaceWikiPane(b);
}

// ----------------------------------------
// Wiki Pane
// ----------------------------------------

function replaceWikiPane(b) {
	shadow.getElementById("bird-wiki").innerHTML = wikiSidebarContent(b);

	shadow.querySelector(".solo-play-wrap").addEventListener("click", function(e) {
		console.log("clicking on solo play");
		let elem = e.target.closest(".solo-play-wrap");
		soloState = (soloState == 0) ? 1 : 0;
		
		let ico = (soloState == 0) ? faPlayCircle : faPauseCircle;
		let spec = elem.attributes.species.value;
		sfx.toggleSolo(soloState, spec);
		elem.innerHTML = icon(ico, {
			classes: ['solo-play'],
			// attributes: { 'value': 0, 'species': spec }
		}).html;
	});
}

function wikiSidebarContent(species) {
	let content = 
		`<div class="wiki-section wiki-section-main">
		<h3 class="birdName">${bird_data[species].common_name} 
			<span class="science">(${bird_data[species].scientific_name})</span>
		</h3>
		<p class="birdImage"><img src="${wiki_data[species].image}" /></p>
		<blockquote class="birdSummary">${wiki_data[species].summary}</blockquote>
		<a href="${wiki_data[species].url}"><p>View full Wikipedia article</p></a>
		</div>`;

	content += `<div class="clear"></div>
		<div class="wiki-section wiki-section-listen">
		<h3>Listen</h3>
		<div class="solo-play-wrap" species=${species}>
			${icon(faPlayCircle, {
				classes: ['solo-play'],
				// attributes: { 'value': 0, 'species': species }
			}).html}
		</div>
		<p>Click play to hear only this species' call. The sonification on the map
		will be muted until you pause.</p>
		<div class="clear"></div></div>`;

	// stats across all days and islands
	content += 
		`<div class="wiki-section wiki-section-appearances">
		<h3>Appearances</h3>
		<p>The tables below show the population for this bird on every day polled
		between the two islands. This number is the total birds seen all day, not
		the scaled population shown on the map.</p>`;
	content += speciesAppearancesTable("Cobb Island", cobb_data, species);
	content += speciesAppearancesTable("Hog Island", hog_data, species);
	content += "</div>";
	
	return content;
}

// table of one species' population on all days, for one island
function speciesAppearancesTable(island, data, species) {
	let content = `<div class="bird-all-days">
		<h5>${island}</h5><table><thead><tr>
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

map.on("movestart", function(e){
	shadow.querySelector("#shorebirds-map").classList.add("no-text-select");
})

// update the map when it pans
map.on("move", function(e){
	let sq = tiles.getSquareAtMapCenter();
	pop.update();
	sfx.update(pop.getVisibleBirds(), pop.getBirds(), sq);
});

map.on("moveend", function(e) {
	console.log("move has ended");
	map.invalidateSize();
	shadow.querySelector("#shorebirds-map").classList.remove("no-text-select");
});

// update the latlng of the center when we resize
map.on("resize", function(e){
	pop.recenter();
});

// Click on "view more" link in popup to open the sidebar pane
map.on("popupopen", function(e){
	shadow.querySelector(".openInfo").addEventListener("click", function(q){
		let b = e.popup.options.species;
		replaceWikiPane(b);
		sidebar.open('shorebirds-bird-data');
		map.closePopup();
	})
});

map.on("click", function(e){
	// if (L.Browser.safari) {
	// 	console.log("safari click");
	// 	sfx.safariHack();
	// }
});


let audioStatus = L.control.messagebox({position: "bottomright"}).addTo(map);

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
soundStart();

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

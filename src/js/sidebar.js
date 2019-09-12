var L = require("leaflet");
import "leaflet-sidebar-v2/js/leaflet-sidebar.min.js";
var tablesort = require('tablesort');
import "tablesort/src/sorts/tablesort.number.js";

import cobb_data from './data/cobb_data.js';
import hog_data  from './data/hog_data.js';
import bird_data  from './data/all_bird_data.js';
import wiki_data from "./data/bird_wiki_data.js";
import pixelColors from './data/colorlist.js';
import land_types from './data/land_types.js';
import { B_POPSCALE } from "./settings.js";

import { library, icon, layer } from '@fortawesome/fontawesome-svg-core';
import { faBars, faChartBar, faSearch, faMap, faPlayCircle, faPauseCircle, faCaretLeft, faHeadphones, faSlash, faQuestionCircle, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

library.add(faBars, faChartBar, faSearch, faMap, faPlayCircle, faPauseCircle, faCaretLeft, faHeadphones, faSlash, faQuestionCircle, faLayerGroup);

// land types, usedata
function SidebarContainer(map, shadow, useData) {
	this.sidebar = L.control.sidebar({
		position: 'left',
		container: 'sidebar'
		// autopan: true
	}).addTo(map);

	function toTopOfPane() {
		shadow.querySelector(".leaflet-sidebar-content").scrollTop = 0;
	}

	this.init = function(islandCallback, dateCallback) {
		this.sidebar.addPanel({
			id: "shorebirds-side-home",
			tab: icon(faBars).html,
			title: "Listening to the VA Barrier Islands",
			pane: 	`
					${generateAudioAlert()}
					<p>Select an island and a date from the list to get started. Picking a date
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

		this.sidebar.addPanel({
			id: "shorebirds-pop-table",
			tab: icon(faChartBar).html,
			title: "Population Data",
			pane: "<div class='pop-summary'>Select a day to view population data.</div><table id='bird-table'></table><div class='pop-desc'></div>",
		}).disablePanel("shorebirds-pop-table");

		this.sidebar.addPanel({
			id: "shorebirds-bird-data",
			tab: icon(faSearch).html,
			title: "Species Detail",
			pane: "<div id='bird-wiki'><p>Select a bird on the map to see more information.</p></div>",
		}).disablePanel("shorebirds-bird-data");

		this.sidebar.addPanel({
			id: "shorebirds-land-pane",
			tab: icon(faMap).html,
			title: "Land Types",
			pane: `<p>A land use map breaks up a region into square segments of a given real-world size.
			 The most dominant habitat
			 type defines the region. Below are the habitats present on Cobb and Hog islands.</p>
			 <p>To see the land use map as an overlay, enable it via the <span class="link-away">
			 ${icon(faLayerGroup).html}</span> layers control in the upper right of the map.</p>
			 ${generateLandUseLegend()}`,
		});

		this.sidebar.addPanel({
			id: "shorebirds-about",
			tab: icon(faQuestionCircle).html,
			title: "About",
			pane:
				`<p>Off the coast of Virginia are fourteen undeveloped islands, the Barrier Islands, which
				not only protect the Eastern Shore’s coastline from storm damage but also contain an
				incredible diversity of coastal wildlife. Among the wildlife that make these islands home
				are shorebirds and seabirds, over 100,000 of which visit the Barrier Islands each
				spring, either as a pit stop or to breed, as they migrate across the Atlantic coast.</p>

				<p>This project takes a seabird census database from the Environmental Data Initiative (EDI)
				created by a research team at the the University of Virginia, which describes
				the populations of 95 species of seabirds and shorebirds on Cobb and Hog Islands over multiple
				days in 1990. The actual positions of birds on the map are chosen based on their species' habitat 
				preferences, which are chosen based on the islands' land use maps (hidden by default, but can be enabled in the
				layers panel).</p>

				<p>Some of the audio sources for the 95 bird species were recorded by Eli Stine, and the rest
				are from the Xeno-Canto wild bird recording database. Bird sounds are positioned binaurally using
				the Web Audio API and IRCAM's binaural FIR node.</p>

				<h5>Credits</h5>
				<p>Original Max/MSP version of this project by <a href="https://elistine.com/">Eli Stine</a> as part of his dissertation, 
					<a href="https://elistine.com/diss">"Modeling Natural Systems in Immersive Electroacoustic Sound."</a></p>
				<p>Javascript version of this project (current) by <a href="https://becky-brown.org">Becky Brown</a>, with support
					by The Conservatory: Listening for Coastal Futures. Full source for this project is 
					<a href="https://github.com/thely/shorebird-leaflet">available on Github.</a></p>
				<p>Special thanks to University of Virginia Ph.D. candidate Alice Besterman for her GIS assistance 
				and the Anheuser-Busch Coastal Research Center for island access.</p>


				`

				// <h4>Why don't the land use maps match up with the shape and size of the islands?</h4>
				// <p>From virginiaplaces.org: "all barrier islands on Virginia's Eastern Shore are migrating towards the west.
				//  As sea level rises, the islands are 'rolling over' as sand is eroded from the ocean side and redeposited on 
				//  the bay side during storms."</p>
		});

// ----------------------------------------
// Basic/Select Toggles
// ----------------------------------------

		// give close tabs the right svg
		let closetabs = shadow.querySelectorAll('span.leaflet-sidebar-close');
		for (let i = 0; i < closetabs.length; i++) {
			closetabs[i].innerHTML = icon(faCaretLeft).html;
		}

		// island/date selector callbacks
		let island_sel = shadow.querySelector("select.island-select");
		let date_sel = shadow.querySelector("select.date-select");
		
		island_sel.addEventListener("change", e => {
			islandCallback(e.srcElement.value);
			this.sidebar.disablePanel("shorebirds-pop-table");
			this.sidebar.disablePanel("shorebirds-bird-data");
			date_sel.innerHTML = genDateOptions(useData);
			date_sel.classList.add("drop-glow");
		});

		date_sel.addEventListener("change", e => {
			dateCallback(e.srcElement.value);
			this.sidebar.enablePanel("shorebirds-pop-table");
			this.sidebar.close();
			date_sel.classList.remove("drop-glow");
		});

		this.sidebar.on("content", function(e) {
			toTopOfPane();
		})
	}

	// alert the user to no audio if they're on mobile
	function generateAudioAlert() {
		if (!L.Browser.mobile) {
			return `<p class="home-alert">${icon(faHeadphones).html} This is a binaural experience; it sounds best in headphones.</p>`	
		}
		
		return `<p class="home-alert no-sound">
			${layer((push) => {
				push(icon(faHeadphones))
				push(icon(faSlash))
			}).html}
			Head's up! This webapp is too audio-intensive to run from your phone. You can still
			view the map, but no sound will play. For the best experience, view this from a computer.
		</p>`;
	}

	// build the date options for the given island
	function genDateOptions(useData) {
		let content = "<option value='-1'>--Pick a date--</option>";
		for (let i = 0; i < useData.birds_and_days.length; i++) {
			content += `<option value='${i}'>${useData.birds_and_days[i].date}</option>`;
		}
		return content;
	}

// ----------------------------------------
// Wiki
// ----------------------------------------
	
	this.replaceWikiPane = function(b, soloCallback) {
		shadow.getElementById("bird-wiki").innerHTML = wikiSidebarContent(b);

		if (!L.Browser.mobile) {
			shadow.querySelector(".solo-play-wrap").addEventListener("click", e => {
				soloCallback(e);
			});
		}

		toTopOfPane();
	}

	this.toggleSoloButton = function(soloState, elem) {
		let ico = (soloState == 0) ? faPlayCircle : faPauseCircle;
		
		elem.innerHTML = icon(ico, {
			classes: ['solo-play'],
		}).html;
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
// Chart
// ----------------------------------------

	this.popTable = function(day, colorList, muteCallback, muteAllCallback, rowCallback) {
		let today = useData.birds_and_days[day];
		let p = `<p>The table below shows all population data for birds on ${today.date} 
				 at ${useData.name}. Hover over the table headers for more information; if you are on mobile,
				 a brief explanation of each is below the table.</p>
				 <p class="mute-all-wrap"><input type="checkbox" class="mute-all" id="species-mute-all">
				 	<label for="species-mute-all">Mute all species</label></p>`;
		let list = `
				 <p><strong>All Day vs Scaled.</strong> All Day numbers represent the total number
				 of birds surveyed on ${today.date}; the Scaled number is what's displayed, scaled by 1/24.</p>
				 <p><strong>Select a species.</strong> Selecting a row from this list will highlight all
				 its members on the map. More information on that species is then visible in the
				 <span class="link-away">${icon(faSearch).html} Species Data</span> tab.</p>
				 <p><strong>Mute a species.</strong> Muting a species frees up audio channels for other
				 birds. This is best used on a high-population species.</p>`;
		let hasMute = (L.Browser.mobile) ? "" : `<th data-sort-method="none">Mute
				<span class="tooltiptext">Click to mute the audio for all displayed birds of this species.
				Muting a species will free up audio channels for other birds, if one species is dominating
				the soundscape.</span></th>`;
		let content = `<thead><tr>
			<th data-sort-default>Species
				<span class="tooltiptext">The common name for this species. For more information, click on a
				row in the table, or click on a bird on the map.</span>
			</th>
			<th>All Day
				<span class="tooltiptext">The total population, per species, seen on ${today.date}.</span>
			</th>
			<th>Scaled
				<span class="tooltiptext">The all-day population scaled down by 1/24 for readability.</span>
			</th>
			<th data-sort-method="none">Color
				<span class="tooltiptext">The color of this species' icon on the map.</span>
			</th>
			${hasMute}
			</tr></thead><tbody>`;
		for (let i = 0; i < today.count.length; i++) {
			if (today.count[i] > 0) {
				content += `<tr class="species-row" id="table-species-${i}" species-index="${i}">
				<td data="${i}"><span class="magnify">${icon(faSearch).html}</span>${bird_data[i].common_name}</td>
				<td>${today.count[i]}</td>
				<td>${Math.ceil(today.count[i] * B_POPSCALE)}</td>
				<td class="bird-shade" style="background-color: ${colorList[i]};">&nbsp;</td>`;

				if (!L.Browser.mobile) {
					content += `<td><input type="checkbox" id="species-mute-${i}" value="${i}" class="species-mute" /></td>`;	
				}
				
				content += `</tr>`;
			}
		}
		content += "</tbody>";

		shadow.querySelector(".pop-summary").innerHTML = p;
		shadow.querySelector(".pop-desc").innerHTML = list;
		shadow.getElementById("bird-table").innerHTML = content;
		tablesort(shadow.getElementById("bird-table"));
		
		// if name is clicked in panel, show on map
		for (let i = 0; i < today.count.length; i++) {
			if (today.count[i] > 0) {
				if (!L.Browser.mobile) {
					let check = shadow.querySelector("input#species-mute-"+i);
					check.addEventListener("click", muteCallback);
				}
				// full row listener
				shadow.getElementById("table-species-"+i)
					.addEventListener("click", rowCallback);
			}
		}

		shadow.querySelector("input.mute-all").addEventListener("click", muteAllCallback);

		toTopOfPane();
	}

	this.changeHighlight = function(species) {
		shadow.querySelector("#shorebirds-bird-wiki .highlight-toggle").innerHTML = "This species is higlighted. Click to undo.";
	}

// ----------------------------------------
// Land Legend
// ----------------------------------------

	// land types color and name
	function generateLandUseLegend() {
		let content = "<ul>";
		for (let i = 0; i < land_types.length; i++) {
			content += `<li>
			<span class='land-color' style='background-color: ${pixelColors[i]};'></span>
			<span class='land-name'>${land_types[i]}</span></li>`;
		}
		content += "</ul>";
		return content;
	}
}

export default SidebarContainer;


/*
	http://www.virginiaplaces.org/geology/barrier.html
	Xeno-Canto
	All of Wikipedia
*/


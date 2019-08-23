// Generates and updates bird data off of defaults from globals.js, and eventually
// from the JSON bird data.

var L = require("leaflet");
var C = require('chance').Chance();

import bird_data from "./data/all_bird_data.js";
import wiki_data from "./data/bird_wiki_data.js";
import "./bird.js";
import { B_POPSCALE } from "./settings.js";

import "./ui/popups.js";

function Population(map, layer, shadow) {
	this.birds = [];
	this.visibleBirds = [];
	let dayIndex = 0;
	var useData = {};
	var tiles = {};
	let center = map.getSize().divideBy(2);
	this.colorList = [];
	for (let i = 0; i < bird_data.length; i++) {
		this.colorList[i] = C.color({format: "hex"});
	}
	let popupIndex = 0;

	this.getBirds = function() {
		return this.birds;
	}

	this.getVisibleBirds = function() {
		return this.visibleBirds;
	}

	this.clearBirds = function() {
		let pop = this.birds.length;
		return new Promise(function(resolve, reject) {
			if (layer.getLayers().length == 0) {
				resolve();
			}
			Array.from(layer.getLayers()).forEach(bird => {
				bird.fadeOut(map).then(() => {
					console.log("bird finished at dead");
					pop--;
					layer.removeLayer(bird);
					if (pop == 0) {
						resolve();
					}
					else {
						console.log(pop);
					}
				}).catch(() => { 
					console.log("what happened??"); 
				});
			});
		});
		
	}

	this.cancelHighlight = function() {
		let prev = shadow.querySelectorAll(".species-active");
		for (let item of prev) {
			item.classList.toggle("species-active");
			item.classList.add("species-inactive");
		};

		this.birds[popupIndex].closePopup();
	}

	this.highlightSpecies = function(species) {
		this.cancelHighlight();

		let next = shadow.querySelectorAll(".bird-icon-"+species);
		for (let item of next) {
			item.classList.add("species-active");
			item.classList.remove("species-inactive");
		};

		for (let i = 0; i < this.birds.length; i++) {
			if (this.birds[i].options.species == species) {
				let formatted = this.birds[i].displayWikiData(popData(species));
				let popup = L.eventPopup({
					className: "birdPopup",
					maxHeight: 300,
					species: this.birds[i].options.species
				}).setContent(formatted);
				// console.log(popup);

				popupIndex = i;
				this.birds[i].unbindPopup().bindPopup(popup).openPopup();
				return this.birds[i];
				// ret.push(this.birds[i]);
			}
		}
	}

	this.getColor = function(species) {
		return this.colorList[species];
	}

	this.recenter = function() {
		for (let i = 0; i < this.birds.length; i++) {
			this.birds[i].options.center = map.getSize().divideBy(2);
		}
	}

	this.generateBirds = function(data, day, t) {
		useData = data;
		tiles = t;

		this.birds = [];
		let bCount = 0;
		dayIndex = day;

		let today = useData["birds_and_days"][day].count;
		for (let i = 0; i < today.length; i++) { // species loop
			if (today[i] > 0) {
				let pop = Math.ceil(today[i] * B_POPSCALE);
				let baseClass = "bird-icon bird-icon-"+i; 

				for (let j = 0; j < pop; j++) { // single bird loop
					let icon = L.divIcon({
						className: baseClass + " bird-id-"+bCount,
						html: makeMarkerIcon(this.colorList[i], bird_data[i].common_name, "bird-id-"+bCount),
						iconSize: [16, 16],
						iconAnchor: [8, 15],
						popupAnchor: [0, -15],
						tooltipAnchor: [5, -7]
					});
					let b = makeBird.call(this, i, icon, bCount);
					this.birds.push(b);
					bCount++;
				}
			}
		}
	}

	this.update = function(event) {
		this.visibleBirds = [];
		for (let i = 0; i < this.birds.length; i++) {
			this.birds[i].options.visible.then = this.birds[i].options.visible.now;
			if (map.getBounds().contains(this.birds[i].getLatLng())) {
				this.birds[i].audioPosition(map.latLngToContainerPoint(this.birds[i].getLatLng()));
				this.visibleBirds.push(this.birds[i]);
				this.birds[i].options.visible.now = true;
			}
			else {
				this.birds[i].options.visible.now = false;
			}
		}
	}

	function makeBird(species, icon, id) {
		let t = pickHabitatTile(species);
		let lat = tiles.getTile(t.tile).getLatLngs()[0][0];
		let birdCoord = makeBirdPos(lat, useData.scaling);
		let bird = L.birdMarker(birdCoord.latlng, {
			icon: icon, 
			// iconSize: 70,
			id: id,
			center: center,
			species: species,
			info: bird_data[species],
			wiki: wiki_data[species],
			habitat: t.habitat,
			shadow: shadow
		})
		.bindTooltip(bird_data[species].common_name).openTooltip()
		.on("click", function(e) {
			let formatted = bird.displayWikiData(popData(species));
			let popup = L.eventPopup({
				className: "birdPopup",
				maxHeight: 300,
				species: species
			}).setContent(formatted);

			bird.unbindPopup().bindPopup(popup).openPopup();
		})
		.addTo(layer);

		return bird;
	}

	// population for a single species
	function popData(species) {
		let totalPop = useData.birds_and_days[dayIndex].count[species];
		let showPop = Math.ceil(totalPop * B_POPSCALE);
		return { total: totalPop, shown: showPop };
	}

	// returns a random tile (from list) based on random habitat
	function pickHabitatTile(b) {
		let hab = C.pickone(bird_data[b].land_preference);
		while (!(hab.toString() in useData.habitats_in_pixels)) {
			hab = C.pickone(bird_data[b].land_preference);
		}
		return {
			habitat: hab,
			tile: C.pickone(useData.habitats_in_pixels[hab]) - 2 // TODO: why is -2 necessary??
		};
	}

	// determine marker start position from tile position
	function makeBirdPos(pos, scale) {
		let start = map.latLngToContainerPoint(pos);
		let pt = L.point(
			C.floating({min: start.x, max: start.x + scale}),
			C.floating({min: start.y, max: start.y + scale})
		);

		return {
			pixel: pt,
			latlng: map.containerPointToLatLng(pt)
		};
	}

	function makeMarkerIcon(color, name, id) {
		if (!color) color = "#000000";
		
		var svg = `<svg version="1.1" id="${id}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
		 viewBox="0 0 356.139 356.139" xml:space="preserve">
		<path d="M354.793,104.763c-2.511-1.906-9.18-6.971-12.648-19.905c-2.417-9.015-18.19-35.172-45.009-35.172 
		c-4.276,0-8.707,0.663-13.17,1.97c-23.156,6.782-34.079,23.085-43.717,37.469c-3.076,4.591-5.981,8.927-9.078,12.604 
		c-2.93,3.479-18.62,16.172-35.23,29.612c-14.98,12.119-30.471,24.651-38.267,31.771c-2.794,2.553-5.597,5.077-8.392,7.594
		c-10.199,9.186-20.745,18.684-30.307,29.165c-6.033,6.611-13.015,11.184-20.406,16.025c-1.046,0.685-2.099,1.374-3.155,2.074
		c-3.544,2.346-7.655,3.474-11.631,4.564c-3.587,0.984-7.295,2.001-10.652,3.909c-0.741,0.423-1.237,1.266-1.296,2.198
		c-0.056,0.881,0.298,1.697,0.943,2.183c3.731,2.816,8.505,5.093,13.915,6.649c-0.673,0.396-1.269,0.757-1.829,1.109
		c-2.369,1.486-6.843,3.971-12.506,7.116C48.966,258.69,5.423,282.874,0.144,297.743c-0.267,0.751-0.16,1.522,0.299,2.172
		c0.785,1.109,2.501,1.557,3.763,0.943c9.223-4.484,12.948-5.694,14.419-5.852c-1.072,1.774-5.936,5.97-7.885,7.652
		c-2.707,2.336-2.813,2.403-2.537,3.148l0.261,0.635h0.694l0.177,0.011c18.825-3.094,39.333-10.661,59.167-17.991
		c20.744-7.667,40.339-14.901,57.724-17.219c0.507-0.067,1.288-0.098,2.324-0.098c2.382,0,5.938,0.174,10.438,0.394
		c7.484,0.365,17.735,0.865,29.219,0.865c33.646,0,60.675-4.46,80.335-13.257c26.452-11.835,43.276-24.514,54.553-41.111
		c13.366-19.672,18.459-45.152,15.569-77.895c-0.178-2.009,2.17-5.031,4.888-8.532c3.783-4.871,8.472-10.908,10.544-18.781
		c2.347-0.872,6.162-1.731,10.187-2.637c3.687-0.83,7.498-1.688,11.026-2.716c0.431-0.125,0.733-0.447,0.81-0.861
		C356.255,105.873,355.736,105.479,354.793,104.763z" fill="${color}" /></svg>
		
		`; 
		// <span class="marker-bird-name">${name}</span>

		return svg;
	}
}

export default Population;


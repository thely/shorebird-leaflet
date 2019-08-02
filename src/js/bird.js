var L = require("leaflet");
var C = require("chance").Chance();
var Victor = require("victor");

import land_types from './data/land_types.js';

L.BirdMarker = L.Marker.extend({
	options: {
		id: -1,
		hasAudioNode: false,
		visible: {
			now: false,
			then: false
		},
		info: {},
		wiki: {},
		center: {},
		azimuth: 0,
		distance: 0,
		species: 0,
		habitat: 0
	},
	// onAdd: function(map) {
	// 	L.DomEvent.on(this, 'click', function(e) {
	// 		console.log("clicked on the popup");
	// 		console.log(e);
	// 	});
	// },
	audioPosition: function(position) {
		// pos is the passed in latlng converted to px
		let center = new Victor(this.options.center.x, this.options.center.y);
		let pos = new Victor(position.x, position.y);

		let angle = center.clone().subtract(pos).rotate(Math.PI / -2).angleDeg();
		let dist = center.subtract(pos).length() / 8;
		
		this.options.azimuth = angle;
		this.options.distance = dist;

		return { azimuth: angle, distance: dist };
	},
	displayWikiData: function(speciesData) {
		let content = 
			`	
			<h4 class="birdName">${this.options.info.common_name} 
				<span class="science">(${this.options.info.scientific_name})</span>
			</h4>
			<p class="birdImage"><img src="${this.options.wiki.image}" /></p>
			<ul>
			<li><i class="fas fa-map-marker-alt"></i> ${land_types[this.options.habitat]}</li>
			<li><i class="fas fa-crow"></i> 1 of ${speciesData.total} seen today</li>
			<li class="openInfo" value=${this.options.species}>
				<i class="fas fa-info"></i>View species information in sidebar
			</li>
			</ul>
			`

		return content;
	}
});

L.birdMarker = function(id, options) {
	return new L.BirdMarker(id, options);
}

export default L.BirdMarker;
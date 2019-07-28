var L = require("leaflet");
var C = require("chance").Chance();
var Victor = require("victor");

import wiki from "wikijs";

L.BirdMarker = L.Marker.extend({
	options: {
		id: -1,
		hasAudioNode: false,
		visible: {
			now: false,
			then: false
		},
		info: {},
		center: {},
		azimuth: 0,
		distance: 0,
		species: 0
	},
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
		console.log("checking out bird "+this.options.id);
		wiki().page(this.options.info.scientific_name).then(page => {
			Promise.all([page.summary(), page.mainImage(), page.url()]).then(c => {
				let summary = c[0].split(" ").splice(0,75).join(" ") + "...";
				let content = 
					`<a href="${c[2]}">
					<h4 class="birdName">${this.options.info.common_name} 
						<span class="science">(${this.options.info.scientific_name})</span>
					</h4></a>
					<p class="birdImage"><img src="${c[1]}" /></p>
					<p class="birdSummary">${summary}</p>
					<p class="popData">${speciesData.total} seen all day; ${speciesData.shown} currently on map</p>`;
				this.bindPopup(content, {
					className: "birdPopup",
					maxHeight: 300
				}).openPopup();
			}, (err) => {
				console.log(err);
			})
		});
	}
});

L.birdMarker = function(id, options) {
	return new L.BirdMarker(id, options);
}

export default L.BirdMarker;
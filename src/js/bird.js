var L = require("leaflet");
var C = require("chance").Chance();
var Victor = require("victor");

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
});

L.birdMarker = function(id, options) {
	return new L.BirdMarker(id, options);
}

export default L.BirdMarker;
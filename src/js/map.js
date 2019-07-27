var L = require("leaflet");
import pixelColors from './data/colorlist.js';

function LandMap(map, useData) {
	let size = useData.scaling;
	let prev = map.latLngToContainerPoint(useData.origin);
	let tiles = [];

	for (let i = 0; i < useData.pixel_cover_list.length; i++) {
		let start = L.point((Math.floor(i / useData.pixel_dim.rows) * size) + prev.x,
				((i % useData.pixel_dim.rows) * size) + prev.y);
		let stop = start.add([size,size]);
		let bounds = [map.containerPointToLatLng(start), map.containerPointToLatLng(stop)];
		let color = pixelColors[useData.pixel_cover_list[i]];

		tiles[i] = L.rectangle(bounds, {
			color: color, 
			stroke: false, 
			fill: true, 
			fillOpacity: 0.2}
		);

		// tiles[i].bindTooltip(i.toString()).openTooltip();
	}

	this.getTiles = function() {
		return tiles;
	}

	this.getTile = function(t) {
		return tiles[t];
	}

	this.show = function() {
		for (let i = 0; i < tiles.length; i++) {
			tiles[i].addTo(map);
		}
	}
}

export default LandMap;
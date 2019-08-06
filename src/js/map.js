var L = require("leaflet");
import pixelColors from './data/colorlist.js';
import land_types from './data/land_types.js';
import { B_STARTZOOM } from './settings.js';

function LandMap(map, useData, layer) {
	let oldZoom = map.getZoom();
	map.setZoom(B_STARTZOOM, { animate: false });
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
		).bindTooltip(land_types[useData.pixel_cover_list[i]]).openTooltip();

		tiles[i].addTo(layer);
	}

	map.setZoom(oldZoom, { animate: false });

	this.getTiles = function() {
		return tiles;
	}

	this.getTile = function(t) {
		return tiles[t];
	}

	this.getTileAtMapCenter = function() {
		let center = map.containerPointToLatLng(map.getSize().divideBy(2));
		for (let i = 0; i < tiles.length; i++) {
			if (tiles[i].getBounds().contains(center)) {
				return useData.pixel_cover_list[i];
			}
		}
	}

	this.getSquareAtMapCenter = function() {
		let center = map.containerPointToLatLng(map.getSize().divideBy(2));
		for (let i = 0; i < tiles.length; i++) {
			if (tiles[i].getBounds().contains(center)) {
				return tileSquare(i);
			}
		}
	}

	function tileSquare(i) {
		let col = useData.pixel_dim.rows;
		
		let sq = [
			useData.pixel_cover_list[i - col - 1],
			useData.pixel_cover_list[i - 1],
			useData.pixel_cover_list[i + col - 1],
			useData.pixel_cover_list[i - col],
			useData.pixel_cover_list[i],
			useData.pixel_cover_list[i + col],
			useData.pixel_cover_list[i - col + 1],
			useData.pixel_cover_list[i + 1],
			useData.pixel_cover_list[i + col + 1]
		];
		return sq;
	}
}

export default LandMap;
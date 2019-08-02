var L = require("leaflet");

L.EventPopup = L.Popup.extend({
	options: {
		species: 0,
	},
});

L.eventPopup = function(id, options) {
	return new L.EventPopup(id, options);
}

export default L.EventPopup;
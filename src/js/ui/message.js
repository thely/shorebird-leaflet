// Adapted version of https://github.com/tinuzz/leaflet-messagebox
// that removes the timer

var L = require("leaflet");

L.Control.Messagebox = L.Control.extend({
    options: {
        position: 'topright',
        timeout: 3000
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-messagebox leaflet-bar');
        //L.DomEvent.disableClickPropagation(this._container);
        return this._container;
    },

    show: function(message) {
        var elem = this._container;
        elem.innerHTML = message;
        elem.style.display = 'block';
    },

    showTimed: function (message, timeout) {
        var elem = this._container;
        elem.innerHTML = message;
        elem.style.display = 'block';

        this._container.classList.add('sounds-loaded-hide');
    },

    hide: function() {
        this._container.classList.add('sounds-loaded-hide');
    }
});

L.Map.mergeOptions({
    messagebox: false
});

L.Map.addInitHook(function () {
    if (this.options.messagebox) {
        this.messagebox = new L.Control.Messagebox();
        this.addControl(this.messagebox);
    }
});

L.control.messagebox = function (options) {
    return new L.Control.Messagebox(options);
};
// Adapted version of https://github.com/tinuzz/leaflet-messagebox
// that removes the timer in favor of adding classes

var L = require("leaflet");

L.Control.Messagebox = L.Control.extend({
    options: {
        position: 'topright',
        timeout: 3000
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-messagebox leaflet-bar');
        this._text = L.DomUtil.create('div', 'message-text', this._container);
        //L.DomEvent.disableClickPropagation(this._container);
        this.oldClass = "";
        return this._container;
    },

    show: function(message, className, val) {
        // var elem = this._text;
        this._text.innerHTML = message;
        // this._container.style.display = 'block';

        if (this.oldClass != "") {
            this._container.classList.remove(this.oldClass);    
        }
        this._container.classList.add(className);
        this.oldClass = className;

        if (className == "progress-bar") {
            this._container.dataset.progress = val;
            this._container.style.setProperty("--progress-val", `${val * this._container.offsetWidth}px`);
        }
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
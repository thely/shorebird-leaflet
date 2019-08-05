var L = require("leaflet");
import { library, icon } from '@fortawesome/fontawesome-svg-core';
import { faVolumeUp, faVolumeDown } from '@fortawesome/free-solid-svg-icons';

library.add(faVolumeUp, faVolumeDown);

L.Control.Range = L.Control.extend({
    options: {
        position: 'topright',
        min: 0,
        max: 1,
        value: 0.5,
        step: 0.05,
        orient: 'vertical',
        iconClass: 'leaflet-range-icon',
        icon: true
    },
    
    onAdd: function(map) {
        var container = L.DomUtil.create('div', 'volume-control leaflet-range-control leaflet-bar ' + this.options.orient);
        
        let volUp = L.DomUtil.create('div', "volume-mute", container);
        volUp.setAttribute('value', 1);
        volUp.innerHTML = icon(faVolumeUp).html;
        
        var slider = L.DomUtil.create('input', 'volume', container);
        slider.type = 'range';
        slider.setAttribute('orient', this.options.orient);
        slider.min = this.options.min;
        slider.max = this.options.max;
        slider.step = this.options.step;
        slider.value = this.options.value;

        // let volDown = L.DomUtil.create('i', "fas fa-volume-down", container);

        L.DomEvent.on(slider, 'mousedown mouseup click touchstart', L.DomEvent.stopPropagation);

        /* IE11 seems to process events in the wrong order, so the only way to prevent map movement while dragging the
         * slider is to disable map dragging when the cursor enters the slider (by the time the mousedown event fires
         * it's too late becuase the event seems to go to the map first, which results in any subsequent motion
         * resulting in map movement even after map.dragging.disable() is called.
         */
        L.DomEvent.on(slider, 'mouseenter', function(e) {
            map.dragging.disable()
        });
        L.DomEvent.on(slider, 'mouseleave', function(e) {
            map.dragging.enable();
        });

        L.DomEvent.on(slider, 'change', function(e) {
            this.fire('change', {value: e.target.value});

        }.bind(this));

        L.DomEvent.on(slider, 'input', function(e) {
            this.fire('input', {value: e.target.value});
        }.bind(this));

        L.DomEvent.on(volUp, 'click', function(e) {
        	console.log("clicking ye mute");
        	let next = (volUp.getAttribute("value") == 1) ? 0 : 1;
        	volUp.setAttribute("value", next);

        	let svg = (next) ? icon(faVolumeUp).html : icon(faVolumeDown).html;
        	// L.DomUtil.setClass(volUp, cl);
            volUp.innerHTML = svg;
        	next = (next) ? slider.value : 0;
        	this.fire('click', {value: next});
        }.bind(this));

        this._slider = slider;
        this._container = container;

        return this._container;
    },

    setValue: function(value) {
        this.options.value = value;
        this._slider.value = value;
    },

});

L.Control.Range.include(L.Evented.prototype)

L.control.range = function (options) {
  return new L.Control.Range(options);
};

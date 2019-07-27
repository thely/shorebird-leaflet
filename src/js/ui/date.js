var L = require("leaflet");

L.DateSel = L.Control.extend({
	options: {
		position: 'topright',
		dates: []
	},
	onAdd: function(map) {
		this.div = L.DomUtil.create("div", "date-select-container");
		this.select = L.DomUtil.create("select", "date-select", this.div);

		let content = "";
		for (let i = 0; i < this.options.dates.length; i++) {
			content += `<option value='${i}'>${this.options.dates[i]}</option>`;
		}

		this.select.innerHTML = content;
		this.select.onmousedown = L.DomEvent.stopPropagation;

		return this.div;
	},
	on: function(type, handler) {
		if (type == 'change') {
			this.onChange = handler;
			L.DomEvent.addListener(this.select, 'change', this._onChange, this);
		}
	},
	_onChange: function(e){
		let i = this.select.selectedIndex;
		e.selDate = i;
		this.onChange(e);
	}
});

L.dateSel = function(id, options) {
	return new L.DateSel(id, options);
}

export default L.DateSel;
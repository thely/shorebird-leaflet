var L = require("leaflet");

L.IslandSel = L.Control.extend({
	options: {
		position: 'topright',
		islands: []
	},
	onAdd: function(map) {
		this.div = L.DomUtil.create("div", "island-select-container");
		this.select = L.DomUtil.create("select", "island-select", this.div);
		
		let content = "";
		for (let i = 0; i < this.options.islands.length; i++) {
			content += "<option>"+this.options.islands[i]+"</option>";	
		}

		this.select.innerHTML = content;
		this.select.onmousedown = L.DomEvent.stopPropagation;

		return this.div;
	},
	on: function(type, handler) {
		if (type == 'change') {
			this.onChange = handler;
			L.DomEvent.addListener(this.select,'change',this._onChange,this);
		}
	},
	_onChange: function(e) {
		let i = this.select.options[this.select.selectedIndex].value;
		e.island = this.options.islands[this.select.selectedIndex];
		this.onChange(e);
	}

});

L.islandSel = function(id, options) {
	return new L.IslandSel(id, options);
}

export default L.IslandSel;
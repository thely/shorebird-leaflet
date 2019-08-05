// A collection of three nodes: a source node, a binaural FIR panner node,
// and a gain node.

var L = require("leaflet");
var C = require('chance').Chance();
import BinauralFIR from 'binauralfir';

function AudioNode(ctx, hrtf, source) {
	this.active = false;
	this.fadeout = false;
	this.birdID = null;
	this.ctx = ctx;
	this.source = source;
	this.species = -1;

	this.SoundSource = ctx.createBufferSource(); 
	this.SoundSource.buffer = source;
	this.SoundSource.loop = true;

	this.BinPan = new BinauralFIR({
		audioContext: ctx
	});
	this.BinPan.HRTFDataset = hrtf;
	this.BinPan.setCrossfadeDuration(200);

	this.GainNode = ctx.createGain();
	// this.GainNode.gain.value = __gainFromDistance(dist, 0.4);
	this.GainNode.gain.value = 0;

	this.SoundSource.connect(this.GainNode);
	this.GainNode.connect(this.BinPan.input);

	// this.BinPan.setPosition(azi, 0, dist);
}

AudioNode.prototype.connect = function(out) {
	this.BinPan.connect(out);
}

AudioNode.prototype.play = function(loopInfo) {
	this.SoundSource = this.ctx.createBufferSource(); 
	this.SoundSource.buffer = this.source;
	this.SoundSource.loop = true;
	this.SoundSource.loopStart = loopInfo.start;
	this.SoundSource.loopEnd = loopInfo.end;
	this.SoundSource.playbackRate.value = C.floating({min: 0.85, max: 1.15});

	var fileStartWhen = C.floating({min: 0, max: 2});
	var fileStartPos = C.floating({min: loopInfo.start, max: loopInfo.end});
	this.SoundSource.connect(this.GainNode);
	this.SoundSource.start(fileStartWhen, fileStartPos);
}

AudioNode.prototype.stop = function() {
	this.SoundSource.stop();
}

AudioNode.prototype.gain = function(val) {
	if (!val) {
		return this.GainNode.gain.value;
	}
	else if (val != 0) { 
		this.GainNode.gain.linearRampToValueAtTime(val, this.ctx.currentTime + 0.5);
		this.active = true;
	}
	else {
		this.GainNode.gain.value = 0;
		this.active = false;
	}
}

AudioNode.prototype.pan = function(azi, dist) {
	this.BinPan.setPosition(azi, 0, dist);
}

AudioNode.prototype.file = function(file) {
	if (file) {
		this.SoundSource.buffer = file;
	}
	return this.SoundSource.buffer;
}

export default AudioNode;

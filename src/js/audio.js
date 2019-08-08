
var L = require("leaflet");
var C = require('chance').Chance();

import { AudioContext } from 'standardized-audio-context';
import { loadAudioBuffer } from 'audiobuffer-loader';
import SampleManager from 'sample-manager';
import AudioNode from './audionode.js';
import { B_SOUNDFILE, B_SOUNDFOLDER, B_MAXNODES } from "./settings.js";
import bird_data from "./data/all_bird_data.js";
import ambience from './data/ambient_sound.js';

function AudioManager() {
	this.ctx = new AudioContext();

	let type = (L.Browser.gecko) ? "ogg" : "mp3";
	console.log("our type is " + type);
	this.mng = new SampleManager(this.ctx, B_SOUNDFOLDER, type);
	this.max = B_MAXNODES;
	console.log("max nodes: "+B_MAXNODES);

	// various buses
	this.birdBus = this.ctx.createGain();
	this.birdBus.gain.value = 1;

	this.ambiBus = this.ctx.createGain();
	this.ambiBus.gain.value = 0.4;
	
	this.masterGain = this.ctx.createGain();
	this.masterGain.gain.value = 0.5;

	// connecting buses
	this.birdBus.connect(this.masterGain);
	this.ambiBus.connect(this.masterGain);
	this.masterGain.connect(this.ctx.destination);

	this.nodes = {
		active: [],
		inactive: []
	};

	this.ambiNodes = {
		source: [],
		gains: []
	};

	this.flags = {
		soundsLoaded: false,
		sceneChanged: false
	};

	this.hrtf = __getHRTF.call(this);
	__loadFiles.call(this);

	this.lastAmbi = -1;

	this.audioLoaded = false;
	this.muteList = [];
	this.isMuted = false;

	this.soloNode = {};
}

// ----------------------------------------
// Setup/Build
// ----------------------------------------
AudioManager.prototype.setup = function(today, birdData) {
	this.setDate(today, birdData);
}

// call when the date changes to refigure the files needed
AudioManager.prototype.setDate = function(today, birdData) {
	this.sounds = [];

	this.sounds = __getSoundLoopPoints.call(this, today, birdData);
	console.log(this.sounds);
}

// build the nodes out when the player is created
AudioManager.prototype.makeNodes = function() {
	this.nodes.active = [];
	var buffer = this.mng.getAllSamples()[0].audioBuffer;

	for (var i = 0; i < this.max; i++) {
		this.nodes.inactive[i] = new AudioNode(this.ctx, this.hrtf, buffer);
		this.nodes.inactive[i].connect(this.birdBus);
	}

	this.ambienceInit();
}

AudioManager.prototype.reset = function(allBirds) {
	for (var i = this.nodes.active.length - 1; i >= 0; i--) {
		disableNode.call(this, i, allBirds);
	}

	this.muteList = [];
}

AudioManager.prototype.hasAudioLoaded = function() {
	return this.audioLoaded;
}

// ----------------------------------------
// Update
// ----------------------------------------
AudioManager.prototype.update = function(birds, allBirds, habitat) {
	if (!this.audioLoaded) {
		return;
	}
	if (habitat) {
		this.playBackground(habitat);
	}

	birds = C.shuffle(birds); // shuffle the visible birds

	for (var i = this.nodes.active.length - 1; i >= 0; i--) {

		// check if the bird we know is in the visible list
		var b = __birdFromId(birds, this.nodes.active[i].birdID);
		if (b.length > 0) {
			// console.log("moving "+b[0].options.id);
			this.moveVisibleNode(b[0], this.nodes.active[i]);
		}
		else { // fully faded out
			if (this.nodes.active[i].gain() <= 0.0001) {
				// console.log("fully gone");
				disableNode.call(this, i, allBirds);
			}
			
			else { //currently fading out
				console.log("starting fadeout");
				// this.nodes.active[i].fadeout = true;
				this.nodes.active[i].gain(0.00001);
			}
		}
	}

	// all our nodes are presently in use
	if (this.nodes.inactive.length <= 0) {
		console.log("all the inactive nodes are taken!");
		return;
	}

	// adding new birds if they don't have nodes
	for (let i = 0; i < birds.length; i++) {
		// if we weren't visible last frame, we haven't been added yet
		if (!birds[i].options.hasAudioNode 
				&& this.nodes.inactive.length > 0
				&& this.muteList.indexOf(birds[i].options.species) == -1) {
			enableNode.call(this, birds[i]);
		}
	}
}

function disableNode(i, allBirds) {
	// console.log("disable "+this.nodes.active[i].birdID);
	this.nodes.active[i].stop();
	this.nodes.active[i].fadeout = false;
	let b1 = __birdFromId(allBirds, this.nodes.active[i].birdID);
	b1[0].options.hasAudioNode = false; // this should be illegal!!!
	this.nodes.active[i].birdID = null;
	this.nodes.active[i].species = -1;
	let n = this.nodes.active.splice(i, 1);
	this.nodes.inactive.push(n[0]);
}

function enableNode(bird) {
	// console.log("enable "+bird.options.id);
	let n = this.nodes.inactive.pop();
	n.birdID = bird.options.id;
	bird.options.hasAudioNode = true;
	n.species = bird.options.species;
	n.fadeout = false;

	// let file = __getFile.call(this, birds[i].name);
	let loopInfo = this.sounds[bird.options.species];
	this.nodes.active.unshift(n);
	this.moveVisibleNode(bird, this.nodes.active[0]);
	this.nodes.active[0].play(loopInfo);
}

AudioManager.prototype.moveVisibleNode = function(b, n) {
	n.pan(b.options.azimuth, b.options.distance);	
	var x = __gainFromDistance(b.options.distance, 0.4);
	// console.log("gain will be: "+ x);
	n.gain(x);
	// if (b.options.visible.now) {
	// 	// console.log("in view");
	// }
}

// ----------------------------------------
// Volume: Mute/Solo/Master
// ----------------------------------------
AudioManager.prototype.muteSpecies = function(spec, muted, allBirds) {
	let species = parseInt(spec);
	if (muted && this.muteList.indexOf(species) == -1) {
		this.muteList.push(species);
		for (let i = this.nodes.active.length - 1; i >= 0; i--){
			if (this.nodes.active[i].species == species) {
				disableNode.call(this, i, allBirds);
			}
		}		
	}
	else if (!muted) {
		this.muteList.splice(this.muteList.indexOf(species), 1);
	}

}

AudioManager.prototype.toggleSolo = function(play, species) {
	if (play) {
		console.log("playing the solo node");
		this.soloNode = this.ctx.createBufferSource(); 
		this.soloNode.buffer = this.mng.getAllSamples()[0].audioBuffer;
		this.soloNode.loopStart = bird_data[species].start;
		this.soloNode.loopEnd = bird_data[species].end;
		this.soloNode.loop = true;

		this.birdBus.gain.value = 0;
		this.ambiBus.gain.value = 0;
		this.soloNode.connect(this.masterGain);
		this.soloNode.start(0, bird_data[species].start);
	}
	else {
		console.log("muting the solo node");
		this.soloNode.stop();
		this.birdBus.gain.value = 1;
		this.ambiBus.gain.value = 0.5;
	}
}

AudioManager.prototype.master = function(val) {
	if (val != 0 && !this.isMuted) { //changing gain
		this.masterGain.gain.exponentialRampToValueAtTime(val, this.ctx.currentTime + 0.5);
	}
	else if (val != 0 && this.isMuted) { //unmuting
		this.masterGain.gain.value = val;
		this.isMuted = false;
	}
	else { //muting
		this.masterGain.gain.value = 0;
		this.isMuted = true;
	}
}

// ----------------------------------------
// Ambient BG Sound
// ----------------------------------------
AudioManager.prototype.ambienceInit = function() {
	for (let i = 0; i < ambience.length; i++) {
		let x = this.ctx.createBufferSource();
		x.buffer = this.mng.getAllSamples()[0].audioBuffer;
		x.loop = true;
		x.loopStart = ambience[i].start;
		x.loopEnd = ambience[i].end;

		let q = this.ctx.createGain();
		q.gain.value = 0;

		let fileStartPos = C.floating({min: x.loopStart, max: x.loopEnd});
		this.ambiNodes.source[i] = x;
		this.ambiNodes.gains[i] = q;
		// console.log(this.ambiNodes.source[i]);
		// console.log(this.ambiNodes.gains[i]);
		
		this.ambiNodes.source[i].connect(this.ambiNodes.gains[i]);
		this.ambiNodes.gains[i].connect(this.ambiBus);
		this.ambiNodes.source[i].start(0, fileStartPos);
	}
}

function habitatSquareAverage(sq) {
	let total = { blue: 0, green: 0, brown: 0 };
	for (let i = 0; i < sq.length; i++) {
		if ([0,1,20,-80].includes(sq[i])) { //ocean/blue
			total.blue++;
		}
		else if ([17,18].includes(sq[i])) { //forest/green
			total.green++;
		}
		else if ([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,19].includes(sq[i])) { //brown/beach
			total.brown++;
		}
	}

	let scale = 3;
	let pi = Math.PI / 3;
	total.blue = (total.blue / (9*scale)) * pi;
	total.green = (total.green / (9*scale)) * pi;
	total.brown = (total.brown / (9*1.5)) * pi;

	console.log(total);

	return total;
}

AudioManager.prototype.playBackground = function(hab) {
	let total = habitatSquareAverage(hab);

	this.ambiNodes.gains[0].gain.linearRampToValueAtTime(total.blue, this.ctx.currentTime + 0.1);
	this.ambiNodes.gains[1].gain.linearRampToValueAtTime(total.brown, this.ctx.currentTime + 0.1);
	this.ambiNodes.gains[2].gain.linearRampToValueAtTime(total.green, this.ctx.currentTime + 0.1);
}

// ----------------------------------------
// Helpers
// ----------------------------------------
function __loadFiles() {
	let samps = [{ name: B_SOUNDFILE }];
	this.mng.addSamples(samps);
	this.mng.loadAllSamples(progress => {
		console.log(progress);
	}).then(() => {
		console.log("sounds loaded!");
		this.audioLoaded = true;
		if (this.nodes.active.length == 0 && this.nodes.inactive.length == 0) {
			this.makeNodes();
		}
	}).catch(e => {
		console.log("audio problem!");
		console.log(e);
	});
}

// get just the names of new files to be added
function __getSoundFilenames(today, birdData) {
	this.sounds.needToLoad = [];
	this.sounds.needForScene = [];

	for (var i = 0; i < today.length; i++) {
		if (today[i] > 0) {
			this.sounds.needForScene.push(birdData[i].name);
			if (this.sounds.loadedTotal && !this.sounds.loadedTotal.includes(birdData[i].name)) {
				this.sounds.needToLoad.push(birdData[i].name);	
			}
		}
	}
}

function __getSoundLoopPoints(today, birdData) {
	let sounds = [];
	for (let i = 0; i < today.length; i++) {
		if (today[i] > 0) {
			sounds[i] = birdData[i];
		}
	}

	return sounds;
}

function __getFile(species) {
	return this.mng.getSampleByName(species).audioBuffer;
}

// Recreate a buffer file for the HRTF out of the numeric data in hrtfs.js
function __getHRTF() {
	for (var i = 0; i < hrtfs.length; i++) {
		var buffer = this.ctx.createBuffer(2, 512, 44100);
		var buffLeft = buffer.getChannelData(0);
		var buffRight = buffer.getChannelData(1);
		for (var e = 0; e < hrtfs[i].fir_coeffs_left.length; e++) {
			buffLeft[e] = hrtfs[i].fir_coeffs_left[e];
			buffRight[e] = hrtfs[i].fir_coeffs_right[e];
		}
		hrtfs[i].buffer = buffer;
	}

	return hrtfs;
}

function __birdFromId(arr, birdId) {
	return arr.filter(function(el) {
		return el.options.id == birdId;
	});
}

function __gainFromDistance(dist, max) {
	// var x = Math.min(1 / (0.5 * Math.PI * Math.pow(dist, 2) + 1), max);
	var x = Math.min(1 / (0.5 * dist), max);
	// console.log("dist: "+dist+", x: "+x);
	return x;
}

const fillRange = (start, end) => {
  return Array(end - start + 1).fill().map((item, index) => start + index);
};


export default AudioManager;



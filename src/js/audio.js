
var L = require("leaflet");
var C = require('chance').Chance();

import { AudioContext } from 'standardized-audio-context';
import { loadAudioBuffer } from 'audiobuffer-loader';
import SampleManager from 'sample-manager';
import AudioNode from './audionode.js';
import { B_SOUNDFILE, B_MAXNODES } from "./settings.js";
import { ambience } from './data/ambient_sound.js';

function AudioManager() {
	this.ctx = new AudioContext();

	let type = (L.Browser.gecko) ? "ogg" : "mp3";
	console.log("our type is " + type);
	this.mng = new SampleManager(this.ctx, 'assets/audio/', type);
	this.max = B_MAXNODES;
	console.log("max nodes: "+B_MAXNODES);

	this.masterGain = this.ctx.createGain();
	this.masterGain.gain.value = 0.5;
	this.masterGain.connect(this.ctx.destination);

	this.nodes = {
		active: [],
		inactive: []
	};
	this.flags = {
		soundsLoaded: false,
		sceneChanged: false
	};

	this.hrtf = __getHRTF.call(this);
	__loadFiles.call(this);

	this.ambiNodes = {
		next: {},
		prev: {}
	};

	this.lastAmbi = -1;
	this.audioLoaded = false;
}

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
		this.nodes.inactive[i].connect(this.masterGain);
	}
}

AudioManager.prototype.reset = function(allBirds) {
	for (var i = this.nodes.active.length - 1; i >= 0; i--) {
		disableNode.call(this, i, allBirds);
	}
	console.log("Here's our status after resetting: ");
	console.log(this.nodes.active);
	console.log(this.nodes.inactive);
}

AudioManager.prototype.update = function(birds, allBirds, habitat) {
	// this.playBackground(habitat);

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
		if (!birds[i].options.hasAudioNode && this.nodes.inactive.length > 0) {
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
	let n = this.nodes.active.splice(i, 1);
	this.nodes.inactive.push(n[0]);
}

function enableNode(bird) {
	// console.log("enable "+bird.options.id);
	let n = this.nodes.inactive.pop();
	n.birdID = bird.options.id;
	bird.options.hasAudioNode = true;
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

AudioManager.prototype.master = function(val) {
	if (val != 0) { 
		this.masterGain.gain.exponentialRampToValueAtTime(val, this.context.currentTime + 0.5);
	}
	else {
		this.masterGain.gain.value = 0;	
	}
}

// Play the atmospheric sounds
AudioManager.prototype.playBackground = function(hab) {
	let pick = -1;

	// console.log(hab);
	if ([0,1,20,-80].includes(hab)) {
		pick = 0;
		// console.log("ocean/blue");
	}
	else if ([17,18].includes(hab)) {
		pick = 1;
		// console.log("forest");
	}
	else if ([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,19].includes(hab)) {
		pick = 2;
		// console.log("beach");
	}

	console.log("pick: "+pick+", lastAmbi: "+this.lastAmbi);
	if (pick != this.lastAmbi) {
		console.log(this.ambiData[pick]);
		console.log(this.mng.getAllSamples());
		this.ambiNodes.next = this.ctx.createBufferSource(); 
		this.ambiNodes.next.buffer = this.mng.getAllSamples().audioBuffer;
		this.ambiNodes.next.loop = true;
		this.ambiNodes.next.loopStart = this.ambiData[pick].start;
		this.ambiNodes.next.loopEnd = this.ambiData[pick].end;

		let fileStartPos = C.floating(this.ambiData[pick].start, this.ambiData[pick].end);
		this.ambiNodes.next.connect(this.ctx.destination);
		this.ambiNodes.next.start(0, fileStartPos);

		console.log(this.ambiNodes.next);
	}

	this.lastAmbi = pick;
}

// Load files in as needed
function __loadFiles() {
	let samps = [{ name: B_SOUNDFILE }];
	this.mng.addSamples(samps);
	this.mng.loadAllSamples(progress => {
		console.log("loading...");
	}).then(() => {
		console.log("sounds loaded!");
		this.audioLoaded = true;
		if (this.nodes.active.length == 0 && this.nodes.inactive.length == 0) {
			this.makeNodes();
		}
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



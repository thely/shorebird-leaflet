/*
Generates wiki information for birds as a json file off of their scientific names.
Info includes its main image, truncated summary, and URL. This doesn't always work 
for all fields, so it's usually necessary to go back and check some of them. This
tool will fail if a page is not found, which is useful for determining spelling errors.
*/

import bird_data from '../data/all_bird_data.js';
import wiki from 'wikijs';
const fs = require('fs');

let birds = [];
let count = 0;

for (let i = 0; i < bird_data.length; i++) {
	getOneBird(i);
}

// getOneBird(0);

function getOneBird(i) {
	birds[i] = {};
	birds[i].count = 0;

	wiki().page(bird_data[i].scientific_name)
		.then(page => page.summary())
		.then(sum => {
			// console.log(sum);
			birds[i].summary = sum.split(" ").splice(0,75).join(" ") + "..."
			birds[i].count++;
			checkDone();
		})
		.catch(err => {
			console.log(err);
			console.log("The bird: "+birds[i].name);
			birds[i].summary = "NO_SUMMARY";
		});

	wiki().page(bird_data[i].scientific_name)
		.then(page => page.mainImage())
		.then(image => {
			// console.log(image);
			birds[i].image = image;
			birds[i].count++;
			checkDone();
		})
		.catch(err => { 
			console.log(err);
			console.log("The bird: "+birds[i].name);
			birds[i].image = "NO_IMAGE";
		});

	wiki().page(bird_data[i].scientific_name)
		.then(page => page.url())
		.then(url => { 
			// console.log(url);
			birds[i].url = url;
			birds[i].count++;
			checkDone();
		})
		.catch(err => {
			birds[i].summary = "NO_URL";
			console.log("The bird: "+birds[i].name);
			console.log(err);
		});

	birds[i].name = bird_data[i].name;
	birds[i].title = bird_data[i].common_name;

	// console.log(birds[i]);
}

function checkDone() {
	let count = 0;
	// console.log(birds);
	for (let i = 0; i < birds.length; i++) {
		// console.log("this bird state: " + birds[i].count);
		if (birds[i].count == 3) {
			count++;
		}
	}

	// console.log("birds done: "+count);

	if (count > 0) {
		console.log(`${count} birds complete`);
	}

	if (count == 95) {
		let obj = JSON.stringify(birds);
		fs.writeFile('bird_wiki_data.json', obj, (err) => {
			if (err) throw err;
			console.log("We did it!");
		})
	}
}

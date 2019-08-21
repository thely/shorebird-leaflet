import { B_SOUNDSTITCH, B_SOUNDFOLDER } from "./settings.js";

function AudioStitcher(ctx, ftype) {
	let bufferList = [];
	let progressVals = [];
	let urlList = buildUrlList();

	this.loadAllFiles = function(onProgress) {
		console.time("fileLoad");
		return new Promise((resolve, reject) => {
			let fileCount = 0;
			let fileSize = 0;

			for (let i = 0; i < urlList.length; i++) {
				loadFileXML(urlList[i], onProgress, i).then(e => {
					bufferList[i] = e.buf;
					fileSize += e.size;
					fileCount++;

					if (fileCount == bufferList.length) {
						let b = concatBufferList(bufferList, fileSize);
						ctx.decodeAudioData(b).then(audioBuffer => {
							this.buffer = audioBuffer;
							console.timeEnd("fileLoad");
							resolve();
						}).catch(error => {
							console.log(error);
							reject();
						});
					}
				}).catch(e => {
					console.log("an error!");
					console.log(e);
				});
			}
		});
	}

	// adapted from petervdn's audiobuffer-load on npm
	function loadFileXML(url, onProgress, index) {
		return new Promise((resolve, reject) => {
			const request = new XMLHttpRequest();

			request.open('GET', url, true);
			request.responseType = 'arraybuffer';

			if (onProgress) {
				request.onprogress = event => {
					onProgress(allProgress(event.loaded / event.total, index));
				};
			}

			request.onload = () => {
				if (request.status === 200) {
					const fileSize = request.response.byteLength;
					resolve({
						buf: request.response,
						size: fileSize
					});
				}
				else {
					reject(`Error loading '${url}' (${request.status})`);
				}
			};

			request.onerror = error => {
				reject(error);
			};

			request.send();
		});
	}

	// concatenates all the buffers into one collected ArrayBuffer
	function concatBufferList(buflist, len) {
		let tmp = new Uint8Array(len);
		let pos = 0;
		for (let i = 0; i < buflist.length; i++) {
			tmp.set(new Uint8Array(buflist[i]), pos);
			pos += buflist[i].byteLength;
		}
		return tmp.buffer;
	}

	function buildUrlList() {
		let l = [];
		for (let i = 0; i < B_SOUNDSTITCH.length; i++) {
			l[i] = `${B_SOUNDFOLDER}${B_SOUNDSTITCH[i]}.${ftype}`;
		}
		console.log(l);
		return l;
	}

	function allProgress(amount, index) {
		let total = 0;
		progressVals[index] = amount;
		for (let i = 0; i < progressVals.length; i++) {
			total += progressVals[i];
		}

		return total / progressVals.length;
	}

	function play(audioBuffer) {
		const source = context.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(context.destination);
		source.start();
	}

}

export default AudioStitcher;
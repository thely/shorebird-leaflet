var fs = require('fs');
var archiver = require('archiver');
var output = fs.createWriteStream('./shorebirds-leaflet.zip');
var archive = archiver('zip', {
	zlib: { level: 9 }
});

archive.on('error', function(err) {
	throw err;
});

archive.pipe(output);

archive.file('shorebirds-leaflet.php');
archive.file('index.html');
archive.file('assets/js/bundle.js');
archive.file('assets/js/hrtf.js');
archive.file('assets/css/style.css');
archive.file('assets/audio/allbirds.ogg');

archive.finalize();
/* global Gallery */
function Thumbnail (path, square, token) {
	this.token = token;
	this.square = square;
	this.path = path;
	this.image = null;
	this.loadingDeferred = new $.Deferred();
	this.ratio = null;
}

Thumbnail.map = {};
Thumbnail.squareMap = {};
Thumbnail.height = 200;
Thumbnail.width = 400;

Thumbnail.get = function (path, square, token) {
	var map = (square) ? Thumbnail.squareMap : Thumbnail.map;
	if (!map[path]) {
		map[path] = new Thumbnail(path, square, token);
	}
	return map[path];
};

Thumbnail.loadBatch = function (paths, square, token) {
	var map = (square) ? Thumbnail.squareMap : Thumbnail.map;
	paths = paths.filter(function (path) {
		return !map[path];
	});
	var thumbnails = {};
	if (paths.length) {
		paths.forEach(function (path) {
			var thumb = new Thumbnail(path, square, token);
			thumb.image = new Image();
			map[path] = thumbnails[path] = thumb;
		});

		var url = OC.generateUrl(
			'apps/gallery/ajax/thumbnail/batch?token={token}&image={images}&scale={scale}&square={square}', {
			images: paths.map(encodeURIComponent).join(';'),
			scale: window.devicePixelRatio,
			square: (square) ? 1 : 0,
			token: (token) ? token : ''
		});

		var eventSource = new OC.EventSource(url);
		eventSource.listen('preview', function (data) {
			var path = data.image;
			var thumb = thumbnails[path];
			thumb.image.onload = function () {
				Thumbnail.loadingCount--;
				thumb.image.ratio = thumb.image.width / thumb.image.height;
				thumb.image.originalWidth = 200 * thumb.image.ratio;
				thumb.loadingDeferred.resolve(thumb.image);
			};
			thumb.image.src = 'data:' + data.mimetype + ';base64,' + data.preview;
		});
	}
	return thumbnails;
};

Thumbnail.queue = [];
Thumbnail.loadingCount = 0;
Thumbnail.concurrent = 3;
Thumbnail.paused = false;

Thumbnail.processQueue = function () {
	if (!Thumbnail.paused && Thumbnail.queue.length && Thumbnail.loadingCount < Thumbnail.concurrent) {
		var next = Thumbnail.queue.shift();
		next.load();
		Thumbnail.processQueue();
	}
};

Thumbnail.prototype.queue = function () {
	if (!this.image) {
		Thumbnail.queue.push(this);
	}
	Thumbnail.processQueue();
	return this.loadingDeferred;
};

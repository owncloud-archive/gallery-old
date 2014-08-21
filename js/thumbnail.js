function Thumbnail (path, square, scaleRatio) {
	this.square = square;
	this.path = path;
	this.url = Thumbnail.getUrl(path, square);
	this.image = null;
	this.loadingDeferred = new $.Deferred();
	this.ratio = null;
}

Thumbnail.map = {};
Thumbnail.squareMap = {};

Thumbnail.get = function (path, square) {
	var map = {};
	if(square == 1){
		map = Thumbnail.squareMap;
		square = 1;
	}else if(square == 2){//needed Album thumbnail preview if 2 or 3 pics
		map = Thumbnail.squareMap;
		square = 0;
	}else{
		map = Thumbnail.map;
		square = 0;
	}
	if (!map[path]) {
		map[path] = new Thumbnail(path, square);
	}
	return map[path];
};

Thumbnail.getUrl = function (path, square) {
	if (path.substr(path.length - 4) === '.svg' || path.substr(path.length - 5) === '.svgz') {
		return Gallery.getImage(path);
	}
	return OC.generateUrl('apps/gallery/ajax/thumbnail?file={file}&scale={scale}&square={square}', {
		file: encodeURIComponent(path),
		scale: window.devicePixelRatio,
		square: (square) ? 1 : 0
	});
};

Thumbnail.prototype.load = function () {
	var that = this;
	if (!this.image) {
		this.image = new Image();
		this.image.onload = function () {
			Thumbnail.loadingCount--;
			that.image.ratio = that.image.width / that.image.height;
			that.image.originalWidth = that.image.width / window.devicePixelRatio;
			that.loadingDeferred.resolve(that.image);
			Thumbnail.processQueue();
		};
		this.image.onerror = function () {
			Thumbnail.loadingCount--;
			that.loadingDeferred.reject(that.image);
			Thumbnail.processQueue();
		};
		Thumbnail.loadingCount++;
		this.image.src = this.url;
	}
	return this.loadingDeferred;
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

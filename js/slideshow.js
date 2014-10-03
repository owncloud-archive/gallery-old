/* global Gallery, Thumbnail */

/**
 *
 * @param {jQuery} container
 * @param {{name:string, url: string, path: string}[]} images
 * @param {int} interval
 * @param {int} maxScale
 * @constructor
 */
var SlideShow = function (container, images, interval, maxScale) {
	this.container = container;
	this.images = images;
	this.interval = interval | 5000;
	this.maxScale = maxScale | 2;
	this.playTimeout = 0;
	this.current = 0;
	this.imageCache = {};
	this.playing = false;
	this.progressBar = container.find('.progress');
	this.currentImage = null;
	this.onStop = null;
	this.active = false;
	this.zoomable = null;
	this.fullScreen = null;
	this.canFullScreen = false;
};

SlideShow.prototype.init = function (play) {
	this.active = true;
	this.container.children('img').remove();
	
	// detect fullscreen capability (mobile)
	var e = this.container.get(0);
	this.canFullScreen = e.requestFullscreen !== undefined
		|| e.mozRequestFullScreen !== undefined
		|| e.webkitRequestFullscreen !== undefined
		|| e.msRequestFullscreen !== undefined;
	
	// makes UI controls work in mobile version
	var browser = new bigshot.Browser();
	this.container.children('input').each(function(i, e) {
		browser.registerListener(e, 'click', browser.stopEventBubblingHandler(), false);
		browser.registerListener(e, 'touchstart', browser.stopEventBubblingHandler(), false);
		browser.registerListener(e, 'touchend', browser.stopEventBubblingHandler(), false);
	});
	
	// hide arrows and play/pause when only one pic
	this.container.find('.next, .previous').toggle(this.images.length > 1);
	if (this.images.length === 1) {
		this.container.find('.play, .pause').hide();
	}

	var makeCallBack = function (handler) {
		return function (evt) {
			if (!this.active) {
				return;
			}
			evt.stopPropagation();
			handler.call(this);
		}.bind(this);
	}.bind(this);

	this.container.children('.next').click(makeCallBack(this.next));
	this.container.children('.previous').click(makeCallBack(this.previous));
	this.container.children('.exit').click(makeCallBack(this.stop));
	this.container.children('.pause').click(makeCallBack(this.pause));
	this.container.children('.play').click(makeCallBack(this.play));
	
	$(document).keyup(function (evt) {
		if (evt.keyCode === 27) { // esc
			makeCallBack(this.stop)(evt);
		} else if (evt.keyCode === 37) { // left
			makeCallBack(this.previous)(evt);
		} else if (evt.keyCode === 39) { // right
			makeCallBack(this.next)(evt);
		} else if (evt.keyCode === 32) { // space
			makeCallBack(this.play)(evt);
		} else if (evt.keyCode === 70) { // f (fullscreen)
			makeCallBack(this.fullScreenToggle)(evt);
		} else if (evt.keyCode === 48 || evt.keyCode === 96) { // zero
			makeCallBack(this.zoomToFit)(evt);
		}
	}.bind(this));

	jQuery(window).resize(function () {
		this.zoomToFit();
	}.bind(this));

	if (play) {
		this.play();
	} else {
		this.pause();
	}
};

SlideShow.prototype.zoomToFit = function() {
	if (this.zoomable !== null) {
		this.zoomable.flyZoomToFit();
	}
};

SlideShow.prototype.fullScreenStart = function () {
	if (!this.canFullScreen) {
		return;
	}
	this.fullScreen = new bigshot.FullScreen(this.container.get(0));
	this.fullScreen.open();
	this.fullScreen.addOnClose(function(evt){
		this.fullScreenExit();
	}.bind(this));
};

SlideShow.prototype.fullScreenExit = function () {
	if (this.fullScreen === null) {
		return;
	}
	this.fullScreen.close();
	this.fullScreen = null;
};

SlideShow.prototype.fullScreenToggle = function() {
	if (this.zoomable === null) {
		return;
	}
	if (this.fullScreen !== null) {
		this.fullScreenExit();
	} else {
		this.fullScreenStart();
	}
};

SlideShow.prototype.onKeyUp = function (e) {

};

SlideShow.prototype.show = function (index) {
	this.container.show();
	this.current = index;
	this.container.css('background-position', 'center');
	return this.loadImage(this.images[index].url).then(function (image) {
		this.container.css('background-position', '-10000px 0');

		// check if we moved along while we were loading
		if (this.current === index) {
			this.currentImage = image;
			if (this.zoomable !== null) {
				this.zoomable.dispose();
				this.zoomable = null;
			}
			this.container.children('img').remove();
			this.container.append(image);
			jQuery(image).css('position', 'absolute');
			
			this.zoomable = new bigshot.SimpleImage(new bigshot.ImageParameters({
				container: this.container.get(0),
				maxZoom: 2,
				minZoom: -5,
				touchUI: false,
				width: image.width,
				height: image.height
			}), image);
			
			// prevent zoom-on-doubleClick
			this.zoomable.addEventListener('dblclick', function(ie) {
				ie.preventDefault();
			}.bind(this));
			
			this.setUrl(this.images[index].path);
			if (this.playing) {
				this.setTimeout();
			}
		}
	}.bind(this));
};

SlideShow.prototype.setUrl = function (path) {
	if (history && history.replaceState) {
		history.replaceState('', '', '#' + encodeURI(path));
	}
};

SlideShow.prototype.loadImage = function (url) {
	if (!this.imageCache[url]) {
		this.imageCache[url] = new jQuery.Deferred();
		var image = new Image();

		image.onload = function () {
			if (image) {
				image.natWidth = image.width;
				image.natHeight = image.height;
			}
			if (this.imageCache[url]) {
				this.imageCache[url].resolve(image);
			}
		}.bind(this);
		image.onerror = function () {
			if (this.imageCache.cache[url]) {
				this.imageCache.cache[url].reject(url);
			}
		}.bind(this);
		image.src = url;
	}
	return this.imageCache[url];
};

SlideShow.prototype.setTimeout = function () {
	this.clearTimeout();
	this.playTimeout = setTimeout(this.next.bind(this), this.interval);
	this.progressBar.stop();
	this.progressBar.css('height', '6px');
	this.progressBar.animate({'height': '26px'}, this.interval, 'linear');
};

SlideShow.prototype.clearTimeout = function () {
	if (this.playTimeout) {
		clearTimeout(this.playTimeout);
	}
	this.progressBar.stop();
	this.progressBar.css('height', '6px');
	this.playTimeout = 0;
};

SlideShow.prototype.play = function () {
	this.playing = true;
	this.container.find('.pause').show();
	this.container.find('.play').hide();
	this.setTimeout();
};

SlideShow.prototype.pause = function () {
	this.playing = false;
	this.container.find('.pause').hide();
	this.container.find('.play').show();
	this.clearTimeout();
};

SlideShow.prototype.next = function () {
	if (this.zoomable !== null) {
		this.zoomable.stopFlying();
	}
	this.current = (this.current + 1) % this.images.length;
	var next = (this.current + 1) % this.images.length;
	this.show(this.current).then(function () {
		// preload the next image
		this.loadImage(this.images[next].url);
	}.bind(this));
};

SlideShow.prototype.previous = function () {
	if (this.zoomable !== null) {
		this.zoomable.stopFlying();
	}
	this.current = (this.current - 1 + this.images.length) % this.images.length;
	var previous = (this.current - 1 + this.images.length) % this.images.length;
	this.show(this.current).then(function () {
		// preload the next image
		this.loadImage(this.images[previous].url);
	}.bind(this));
};

SlideShow.prototype.stop = function () {
	if(this.fullScreen !== null) {
		this.fullScreenExit();
	}
	this.clearTimeout();
	this.container.hide();
	if (this.zoomable !== null) {
		this.zoomable.dispose();
		this.zoomable = null;
	}
	this.active = false;
	if (this.onStop) {
		this.onStop();
	}
};

SlideShow.prototype.hideImage = function () {
	this.container.children('img').remove();
};

SlideShow.prototype.togglePlay = function () {
	if (this.playing) {
		this.pause();
	} else {
		this.play();
	}
};

SlideShow._getSlideshowTemplate = function () {
	var defer = $.Deferred();
	if (!this.$slideshowTemplate) {
		var self = this;
		$.get(OC.filePath('gallery', 'templates', 'slideshow.html'), function (tmpl) {
			self.$slideshowTemplate = $(tmpl);
			defer.resolve(self.$slideshowTemplate);
		})
			.fail(function () {
				defer.reject();
			});
	} else {
		defer.resolve(this.$slideshowTemplate);
	}
	return defer.promise();
};

$(document).ready(function () {
	if ($('#body-login').length > 0) {
		return true; //deactivate slideshow on login page
	}

	$.when(SlideShow._getSlideshowTemplate()).then(function ($tmpl) {
		$('body').append($tmpl); //move the slideshow outside the content so we can hide the content

		var inactiveCallback = function () {
			$('#slideshow').addClass('inactive');
		};
		var inactiveTimeout = setTimeout(inactiveCallback, 3000);

		$('#slideshow').mousemove(function () {
			$('#slideshow').removeClass('inactive');
			clearTimeout(inactiveTimeout);
			inactiveTimeout = setTimeout(inactiveCallback, 3000);
		});

		if (!SVGSupport()) { //replace all svg images with png images for browser that dont support svg
			OC.Util.replaceSVG();
		}
	})
		.fail(function () {
			OC.Notification.show(t('core', 'Error loading slideshow template'));
		});


	if (OCA.Files && OCA.Files.fileActions) {
		OCA.Files.fileActions.register('image', 'View', OC.PERMISSION_READ, '', function (filename, context) {
			var imageUrl, files = context.fileList.files;
			var start = 0;
			var images = [];
			var dir = context.dir + '/';
			var user = OC.currentUser;
			var width = $(document).width() * window.devicePixelRatio;
			var height = $(document).height() * window.devicePixelRatio;
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				if (file.mimetype && file.mimetype.indexOf('image') >= 0) {
					if (file.mimetype === 'image/svg+xml') {
						imageUrl = OCA.Files.Files.getDownloadUrl(file.name, dir);
					} else {
						imageUrl = OC.generateUrl('/core/preview.png?file={file}&x={x}&y={y}&a=true&scalingup=0', {
							x: width,
							y: height,
							file: encodeURIComponent(dir + file.name)
						});
						if (!user) {
							imageUrl = OC.generateUrl(
								'/apps/files_sharing/publicpreview?file={file}&x={x}&y={y}&a=true&t={t}&scalingup=0', {
									file: encodeURIComponent(dir + file.name),
									x: width,
									y: height,
									t: $('#sharingToken').val()
								});
						}
					}

					images.push({
						name: file.name,
						path: dir + file.name,
						url: imageUrl
					});
				}
			}
			for (i = 0; i < images.length; i++) {
				if (images[i].name === filename) {
					start = i;
				}
			}
			var slideShow = new SlideShow($('#slideshow'), images);
			slideShow.init();
			slideShow.show(start);
		});
		OCA.Files.fileActions.setDefault('image', 'View');
	}
});

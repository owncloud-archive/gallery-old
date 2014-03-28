var Gallery = {};
Gallery.albums = {};
Gallery.images = [];
Gallery.currentAlbum = '';
Gallery.subAlbums = {};
Gallery.users = [];
Gallery.displayNames = [];
Gallery.seamlessGallery = new SeamlessGallery('#gallery', 175);
Gallery.resizeTriggered = false;

$(window).resize(function() {
	if(!Gallery.resizeTriggered) {
		Gallery.resizeTriggered = true;
		var delay = setInterval(function() {
			Gallery.seamlessGallery.redraw();
			clearInterval(delay);
			Gallery.resizeTriggered = false;
		}, 500);
	}
});

Gallery.sortFunction = function (a, b) {
	return a.toLowerCase().localeCompare(b.toLowerCase());
};

// fill the albums from Gallery.images
Gallery.fillAlbums = function () {
	var def = new $.Deferred();
	var token = $('#gallery').data('token');
	$.getJSON(OC.filePath('gallery', 'ajax', 'getimages.php'), {token: token}).then(function (data) {
		Gallery.users = data.users;
		Gallery.displayNames = data.displayNames;
		for (var i = 0; i < data.images.length; i++) {
			Gallery.images.push(data.images[i]);
		}
		Gallery.fillAlbums.fill(Gallery.albums, Gallery.images);
		Gallery.fillAlbums.fillSubAlbums(Gallery.subAlbums, Gallery.albums);

		Gallery.fillAlbums.sortAlbums(Gallery.subAlbums);
		def.resolve();
	});
	return def;
};
Gallery.fillAlbums.fill = function (albums, images) {
	var i, imagePath, albumPath, parent, albumPathParts;
	images.sort();
	for (i = 0; i < images.length; i++) {
		imagePath = images[i];
		albumPath = OC.dirname(imagePath);
		albumPathParts = albumPath.split('/');
		//group single share images in a single album
		if (OC.currentUser && albumPathParts.length === 1 && albumPathParts[0] !== OC.currentUser) {
			albumPath = albumPathParts[0];
		}
		if (!albums[albumPath]) {
			albums[albumPath] = [];
		}
		parent = OC.dirname(albumPath);
		while (parent && !albums[parent] && parent !== albumPath) {
			albums[parent] = [];
			parent = OC.dirname(parent);
		}
		albums[albumPath].push(imagePath);
	}
};
Gallery.fillAlbums.fillSubAlbums = function (subAlbums, albums) {
	var albumPath, parent;
	for (albumPath in albums) {
		if (albums.hasOwnProperty(albumPath)) {
			if (albumPath !== '') {
				parent = OC.dirname(albumPath);
				if (albumPath !== parent) {
					if (!subAlbums[parent]) {
						subAlbums[parent] = [];
					}
					subAlbums[parent].push(albumPath);
				}
			}
		}
	}
};
Gallery.fillAlbums.sortAlbums = function (albums) {
	var path;
	for (path in albums) {
		if (albums.hasOwnProperty(path)) {
			albums[path].sort(Gallery.sortFunction);
		}
	}
};

Gallery.getAlbumInfo = function (album) {
	if (album === $('#gallery').data('token')) {
		return [];
	}
	if (!Gallery.getAlbumInfo.cache[album]) {
		var def = new $.Deferred();
		Gallery.getAlbumInfo.cache[album] = def;
		$.getJSON(OC.filePath('gallery', 'ajax', 'gallery.php'), {gallery: album}, function (data) {
			def.resolve(data);
		});
	}
	return Gallery.getAlbumInfo.cache[album];
};
Gallery.getAlbumInfo.cache = {};
Gallery.getImage = function (image) {
	return OC.filePath('gallery', 'ajax', 'image.php') + '?file=' + encodeURIComponent(image);
};
Gallery.getAlbumThumbnailPaths = function (album) {
	var paths = [];
	if (Gallery.albums[album].length) {
		paths = Gallery.albums[album].slice(0, 10);
	}
	if (Gallery.subAlbums[album]) {
		for (var i = 0; i < Gallery.subAlbums[album].length; i++) {
			if (paths.length < 10) {
				paths = paths.concat(Gallery.getAlbumThumbnailPaths(Gallery.subAlbums[album][i]));
			}
		}
	}
	return paths;
};
Gallery.share = function (event) {
	if (!OC.Share.droppedDown) {
		event.preventDefault();
		event.stopPropagation();

		(function () {
			var target = OC.Share.showLink;
			OC.Share.showLink = function () {
				var r = target.apply(this, arguments);
				$('#linkText').val($('#linkText').val().replace('service=files', 'service=gallery'));
				return r;
			};
		})();

		Gallery.getAlbumInfo(Gallery.currentAlbum).then(function (info) {
			$('a.share').data('item', info.fileid).data('link', true)
				.data('possible-permissions', info.permissions).
				click();
			if (!$('#linkCheckbox').is(':checked')) {
				$('#linkText').hide();
			}
		});
	}
};
Gallery.view = {};
Gallery.view.element = null;
Gallery.view.clear = function () {
	Thumbnail.clearQueue();
	Gallery.seamlessGallery.clear();
	Gallery.view.element.empty();
	$(gallery).css('width', $(gallery).parent().width());
};
Gallery.view.cache = {};

Gallery.view.addImage = function (image) {
	var thumb;
	if (Gallery.view.cache[image]) {
		Gallery.seamlessGallery.add(Gallery.view.cache[image]);
	} else {
		Gallery.view.cache[image] = null;
		thumb = Thumbnail.get(image);
		thumb.queue().then(function (thumb) {
			if($.inArray(image, Gallery.albums[Gallery.currentAlbum]) === -1) return; // filter out images removed from queue but already loading
			var seamlessImage = new SeamlessImage(thumb, image, Gallery.getImage(image), null);
			Gallery.seamlessGallery.add(seamlessImage);
			Gallery.view.cache[image] = seamlessImage;
		});

	}
};

Gallery.view.addAlbum = function (path, name) {
	var link, label, thumbs, thumb;
	name = name || OC.basename(path);
	if (Gallery.view.cache[path]) {
		Gallery.seamlessGallery.addAlbum(Gallery.view.cache[path]);
	} else {
		thumbs = Gallery.getAlbumThumbnailPaths(path);
		thumb = Thumbnail.get(thumbs[0], true);
		thumb.queue().then(function(thumb) {
//			if ($.inArray(image, Gallery.albums[Gallery.currentAlbum]) === -1) return; // filter out images removed from queue but already loading
			var seamlessImage = new SeamlessImage(thumb, image, '#' + path, name);
			Gallery.seamlessGallery.addAlbum(seamlessImage);
			Gallery.view.cache[path] = seamlessImage;
		});
	}
};
Gallery.view.addAlbum.thumbs = {};

Gallery.view.viewAlbum = function (albumPath) {
	if (!albumPath) {
		albumPath = $('#gallery').data('token');
	}
	Gallery.view.clear();
	Gallery.currentAlbum = albumPath;

	var i, album, subAlbums, crumbs, path;
	subAlbums = Gallery.subAlbums[albumPath];
	if (subAlbums) {
		Gallery.seamlessGallery.setAlbumLength(subAlbums.length);
		for (i = 0; i < subAlbums.length; i++) {
			Gallery.view.addAlbum(subAlbums[i]);
		}
	}

	album = Gallery.albums[albumPath];
	if (album) {
		Gallery.seamlessGallery.setLength(album.length);
		for (i = 0; i < album.length; i++) {
			Gallery.view.addImage(album[i]);
		}
	}
	Gallery.seamlessGallery.run();

	if (albumPath === OC.currentUser) {
		$('button.share').hide();
	} else {
		$('button.share').show();
	}

	OC.Breadcrumb.clear();
	var albumName = $('#content').data('albumname');
	if (!albumName) {
		albumName = t('gallery', 'Pictures');
	}
	OC.Breadcrumb.push(albumName, '#').click(function () {
		Gallery.view.viewAlbum(OC.currentUser);
	});
	crumbs = albumPath.split('/');
	//first entry is username
	path = crumbs.splice(0, 1);
	for (i = 0; i < crumbs.length; i++) {
		if (crumbs[i]) {
			path += '/' + crumbs[i];
			Gallery.view.pushBreadCrumb(crumbs[i], path);
		}
	}

	if (albumPath === OC.currentUser) {
		Gallery.view.showUsers();
	}

	Gallery.getAlbumInfo(Gallery.currentAlbum); //preload album info
};

Gallery.view.pushBreadCrumb = function (text, path) {
	OC.Breadcrumb.push(text, '#' + path).click(function () {
		Gallery.view.viewAlbum(path);
	});
};

Gallery.view.showUsers = function () {
	var i, j, user, head, subAlbums, album, singleImages;
	console.log('asdasdasd');
	for (i = 0; i < Gallery.users.length; i++) {
		singleImages = [];
		user = Gallery.users[i];
		console.log('asd');
		console.log(user);
		subAlbums = Gallery.subAlbums[user];
		if (subAlbums) {
			if (subAlbums.length > 0) {
				head = $('<h2/>');
				head.text(t('gallery', 'Shared by') + ' ' + Gallery.displayNames[user]);
				$('#gallery').append(head);
				for (j = 0; j < subAlbums.length; j++) {
					album = subAlbums[j];
					Gallery.view.addAlbum(album);
				}
			}
		}
		for (j = 0; j < Gallery.albums[user].length; j++) {
			Gallery.view.addImage(Gallery.albums[user][j]);
		}
	}
};

$(document).ready(function () {
	Gallery.fillAlbums().then(function () {
		Gallery.view.element = $('#gallery');
		OC.Breadcrumb.container = $('#breadcrumbs');
		window.onhashchange();
		$('button.share').click(Gallery.share);
	});

	$('#gallery').on('click', 'a.image', function (event) {
		var $this = $(this);
		var user = $this.data('path').split('/').shift();
		var images = Gallery.view.element.find('a.image').filter(function(i){
			// only show images from the same user in the slideshow
			return $(this).data('path').split('/').shift() === user;
		});
		var i = images.index(this),
			image = $this.data('path');
		event.preventDefault();
		if (location.hash !== image) {
			location.hash = image;
			Thumbnail.paused = true;
			Slideshow.start(images, i);
		}
	});

	$('#openAsFileListButton').click(function (event) {
		window.location.href = window.location.href.replace('service=gallery', 'service=files');
	});

	jQuery.fn.slideShow.onstop = function () {
		Thumbnail.paused = false;
		var albumParts = Gallery.currentAlbum.split('/');
		//not an album bit a single shared image, go back to the root
		if (OC.currentUser && albumParts.length === 1 && albumParts[0] !== OC.currentUser) {
			Gallery.currentAlbum = OC.currentUser;
		}
		location.hash = Gallery.currentAlbum;
	};
});

window.onhashchange = function () {
	var album = location.hash.substr(1);
	if (!album) {
		album = OC.currentUser;
	}
	if (!album) {
		album = $('#gallery').data('token');
	}
	if (Gallery.images.indexOf(album) === -1) {
		Slideshow.end();
		Gallery.view.viewAlbum(decodeURIComponent(album));
	} else {
		Gallery.view.viewAlbum(OC.dirname(album));
		$('#gallery').find('a.image[data-path="' + album + '"]').click();
	}
};

/* Copyright (c) 2014, Jan ten Bokkel
 * This file is licensed under the Affero General Public License version 3
 * or later. See the COPYING-README file. */

function SeamlessImage(image, dataPath, href, name) {
	this.image = image;
	this.dataPath = dataPath;
	this.href = href;
	this.name = name;
	this._height = image.height;
	this._width = image.width;
	this.padding = 1;
}

SeamlessImage.prototype.render = function(scale) {
	var link = $('<a/>');
	link.addClass('image');
	link.attr('data-path', this.dataPath);
	link.attr('href', this.href);
	link.css('height', (Math.floor(this.height() * scale * 10) / 10) - this.padding*2);
	link.css('width', (Math.floor(this.width() * scale * 10) / 10) - this.padding*2);
	var image = $(this.image);
	image.css('height', (Math.floor(this.height() * scale * 10) / 10) - this.padding*2);
	image.css('width', (Math.floor(this.width() * scale * 10) / 10) - this.padding*2);
	link.append(image);
	return link;
};

SeamlessImage.prototype.scaleToHeight = function(height) {
	var factor = height / this.image.height;
	this._height = this.image.height * factor;
	this._width = this.image.width * factor;
};

SeamlessImage.prototype.scaleToWidth = function(width) {
	var factor = width / this.image.width;
	this._height = this.image.height * factor;
	this._width = this.image.width * factor;
};

SeamlessImage.prototype.width = function() {
	return this._width;
};

SeamlessImage.prototype.height = function() {
	return this._height;
};
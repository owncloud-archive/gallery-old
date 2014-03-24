/* Copyright (c) 2014, Jan ten Bokkel
 * This file is licensed under the Affero General Public License version 3
 * or later. See the COPYING-README file. */

function SeamlessGallery(gallery, lineHeight) {
	this.gallery = gallery;
	this.lineHeight = lineHeight;
	this.images = new Array();
	this.currentElement = 0;
	this.maxScaleLastRow = 1.3;
	this.fadeInTime = 500;
}

SeamlessGallery.prototype.setLength = function(length) {
	this.length = length;
};

SeamlessGallery.prototype.queueRowWidth = function(start, end) {
	var width = 0;
	for(var i = start; i < end; i++) {
		width += this.images[i].width();
	}
	return width;
};

SeamlessGallery.prototype.queueRowElements = function() {
	var width = 0;
	var i = 0;
	for(i = this.currentElement; i < this.images.length; i++) {
		width += this.images[i].width();
		if(width >= $(this.gallery).width()) break;
	}
	return (width < $(this.gallery).width()) ? false : (i-this.currentElement);
};

SeamlessGallery.prototype.add = function(seamlessImage) {
	seamlessImage.scaleToHeight(this.lineHeight);
	this.images.push(seamlessImage);
	this.draw();
};

SeamlessGallery.prototype.draw = function() {
	while(this.queueRowElements()) {
		// Draw rows
		this.drawRow(this.currentElement, this.currentElement+this.queueRowElements());
	}
	if((this.length === this.images.length) && (this.currentElement < this.images.length)) {
		// Draw last row
		this.drawRow(this.currentElement, this.images.length, true);
		$('#loading').hide();
	}
};

SeamlessGallery.prototype.drawRow = function(start, end, lastRow) {
	var scale = $(this.gallery).width() / this.queueRowWidth(start, end);
	if(lastRow === true) scale = Math.min(scale, this.maxScaleLastRow);
	var row = $('<div/>');
	row.addClass('row');
	for(var i = start; i < end; i++) {
		row.append(this.images[i].render(scale)).fadeTo(this.fadeInTime, 1);
	}
	$(this.gallery).append(row);
	this.currentElement += end - start;
};

SeamlessGallery.prototype.redraw = function() {
	$(this.gallery).css('width', $(this.gallery).parent().width());
	$(this.gallery).empty();
	this.currentElement = 0;
	this.draw();
};

SeamlessGallery.prototype.clear = function() {
	this.images = new Array();
	this.currentElement = 0;
};
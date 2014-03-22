/* Copyright (c) 2014, Jan ten Bokkel
 * This file is licensed under the Affero General Public License version 3
 * or later. See the COPYING-README file. */

function SeamlessGallery(gallery, lineHeight) {
	this.gallery = gallery;
	this.lineHeight = lineHeight;
	this.images = new Array();
	this.currentElement = 0;
}

SeamlessGallery.prototype.queueRowWidth = function() {
	var width = 0;
	var i = 0;
	for(i = this.currentElement; i < this.images.length; i++) {
		width += this.images[i].width();
		if(width >= $(this.gallery).width()) break;
	}
	return (width < $(this.gallery).width()) ? false : (width - this.images[i].width());
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
		// Queue width exceeds gallery width so let's render the next line
		scale = $(this.gallery).width() / this.queueRowWidth();
		var row = $('<div/>');
		row.addClass('row');
		for(var i = 0; i < this.queueRowElements(); i++) {
			row.append(this.images[this.currentElement + i].render(scale));
		}
		$(this.gallery).append(row);
		this.currentElement += this.queueRowElements();
	}
};

SeamlessGallery.prototype.redraw = function() {
	$(this.gallery).css('width', $(this.gallery).parent().width());
	$(this.gallery).empty();
	this.currentElement = 0;
	this.draw();
};
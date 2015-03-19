<?php

/**
 * ownCloud - gallery application
 *
 * @author Bartek Przybylski
 * @copyright 2012 Bartek Przybylski bart.p.pl@gmail.com
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU AFFERO GENERAL PUBLIC LICENSE for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 */



$l = OCP\Util::getL10N('gallery');

OCP\App::addNavigationEntry(array(
		'id' => 'gallery_index',
		'order' => 3,
		'href' => OCP\Util::linkToRoute('gallery_index'),
		'icon' => OCP\Util::imagePath('gallery', 'gallery.svg'),
		'name' => $l->t('Pictures'))
);

// make slideshow available in files and public shares
$resourceLoader = \OC::$server->getTemplateResourceLoader();
$resourceLoader->addScript('files', 'index', 'gallery', [
	'jquery.mousewheel-3.1.1',
	'slideshow',
	'public',
]);
$resourceLoader->addStyle('files', 'index', 'gallery', 'slideshow');

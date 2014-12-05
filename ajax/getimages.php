<?php
/**
 * Copyright (c) 2012 Robin Appelman <icewind@owncloud.com>
 * Copyright (c) 2014 Olivier Paroz <owncloud@oparoz.com>
 * This file is licensed under the Affero General Public License version 3 or
 * later.
 * See the COPYING-README file.
 */

OCP\JSON::checkAppEnabled('gallery');

// $slideshow will determine if we return images for the Gallery or media types for the Javascript slideshow
$slideshow = isset($_GET['slideshow']) ? $_GET['slideshow'] : false;
$token = isset($_GET['token']) ? $token = $_GET['token']: false;

// This builds a list of supported media types
function getSupportedMimes($slideshow) {
	$supportedMimes = array();
	// This hard-coded array could be replaced by admin settings
	$wantedMimes = array(
		'image/png',
		'image/jpeg',
		'image/gif',
		'image/x-xbitmap',
		'image/bmp',
		'image/tiff',
		'image/x-dcraw',
		'image/svg+xml',
		'application/x-photoshop',
		'application/illustrator',
		'application/postscript',
	);

	if ($slideshow) {
		// These types are useful for files preview in the slideshow, but not for the gallery
		$wantedMimes = array_merge($wantedMimes, array(
			'application/font-sfnt',
			'application/x-font',
		));
	}

	// TODO: Should the result be cached?
	foreach ($wantedMimes as $wantedMime) {
		// Let's see if a preview of files of that media type can be generated
		$preview = new \OC\Preview();
		if ($preview->isMimeSupported($wantedMime)) {
			// We add it to the list of supported media types
			$supportedMimes[] = $wantedMime;
		}
	}
	
	// SVG is always supported
	$supportedMimes = array_merge($supportedMimes, array(
		'image/svg+xml',
	));
	
	return $supportedMimes;
}

// This returns the public path based on the received token
function getPath($token) {
	$linkItem = \OCP\Share::getShareByToken($token);
	if (is_array($linkItem) && isset($linkItem['uid_owner'])) {
		// seems to be a valid share
		$fileSource = $linkItem['file_source'];
		$rootLinkItem = \OCP\Share::resolveReShare($linkItem);
		$user = $rootLinkItem['uid_owner'];

		// Setup FS with owner
		OCP\JSON::checkUserExists($user);
		OC_Util::tearDownFS();
		OC_Util::setupFS($user);

		// The token defines the target directory (security reasons)
		$path = \OC\Files\Filesystem::getPath($fileSource);

		return $path;
	}
}

// This returns the list of all images which can be shown in the Gallery
function getImages($mimes, $token) {
	$images = array();
	$result = array();
	
	\OC_Log::write('gallery', 'Supported Mimes: '. json_encode($mimes), \OC_Log::DEBUG);
	\OC_Log::write('gallery', 'Token: '. json_encode($token), \OC_Log::DEBUG);
	foreach ($mimes as $mime) {
		if ($token) {
			$path = getPath($token);
			$view = new \OC\Files\View(\OC\Files\Filesystem::getView()->getAbsolutePath($path));
			// We only look for images for this specific view
			$mimeImages = $view->searchByMime($mime);
		} else {
			// We look for all images of the type. This can lead to performance issues
			$mimeImages = \OCP\Files::searchByMime($mime);
		}
		$images = array_merge($images, $mimeImages);
	}

	foreach ($images as $image) {
		// Check the path and mimetype of everything in that array to make sure we only send images
		\OC_Log::write('gallery', 'Path: '. $image->getPath() .', mime: '. $image->getMimetype(), \OC_Log::DEBUG);
		
		$result[] = trim($image['path'], '/');
	}

	\OC_Log::write('gallery', 'Images array: '. json_encode($result), \OC_Log::DEBUG);
	return $result;
}

$mimes = getSupportedMimes($slideshow);
// Both public and private slideshows don't need a token
// to get the list of supported media types
if ($slideshow) {
	$result = $mimes;
} elseif ($token) { // A public gallery is asking for images
	$result = getImages($mimes, $token);
} else { // A private gallery is asking for images
	OCP\JSON::checkLoggedIn();
	$result = getImages($mimes, false);
}

OCP\JSON::setContentTypeHeader();
echo json_encode($result);

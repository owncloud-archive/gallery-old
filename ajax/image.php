<?php
/**
 * Copyright (c) 2012 Robin Appelman <icewind@owncloud.com>
 * Copyright (c) 2014 Olivier Paroz <owncloud@oparoz.com>
 * This file is licensed under the Affero General Public License version 3 or
 * later.
 * See the COPYING-README file.
 */

OCP\JSON::checkAppEnabled('gallery');

$image = $_GET['file'];
$token = isset($_GET['token']) ? $_GET['token'] : false;
$maxX = array_key_exists('x', $_GET) ? (int)$_GET['x'] : '1024';
$maxY = array_key_exists('y', $_GET) ? (int)$_GET['y'] : '1024';

if ($token) {
	$linkItem = \OCP\Share::getShareByToken($token);
	if (!(is_array($linkItem) && isset($linkItem['uid_owner']))) {
		exit;
	}
	// seems to be a valid share
	$fileSource = $linkItem['file_source'];
	$rootLinkItem = \OCP\Share::resolveReShare($linkItem);
	$user = $rootLinkItem['uid_owner'];

	// Setup filesystem
	OCP\JSON::checkUserExists($user);
	OC_Util::tearDownFS();
	OC_Util::setupFS($user);
	OC_User::setIncognitoMode(true);

	$path = \OC\Files\Filesystem::getPath($fileSource);
	$image = trim($path . '/' . $image);
} else {
	OCP\JSON::checkLoggedIn();
	$user = OCP\User::getUser();
}

session_write_close();

$ownerView = new \OC\Files\View('/' . $user . '/files');
$mime = $ownerView->getMimeType($image);
$preview = new \OC\Preview();
// We resize everything for performance reason apart from SVGs and GIFs (because of the animations)
// This uses the same principles as slideshow.js
if ($mime === 'image/gif' || ($mime === 'image/svg+xml' && !$preview->isMimeSupported($mime))) {
	OCP\Response::setContentDispositionHeader(basename($image), 'attachment');
	header('Content-Type: ' . $mime);
	$ownerView->readfile($image);		
} else {
	$preview = new \OC\Preview($user, 'files', '/' . $image, $maxX, $maxY, false);
	$preview->setKeepAspect(true);
	
	$previewdata = $preview->getPreview();
	if ($previewdata->valid()) {
		$preview->showPreview();
	} else {
		// If previews don't generate a mimeicon yet
		// then generate a broken image here
		$image = new \OC_Image();
		$icon = \OC::$SERVERROOT . \OC_Helper::mimetypeIcon($mime);
		OCP\Response::setContentDispositionHeader(basename($icon), 'attachment');
		header('Content-Type: ' . $mime);
		$image->loadFromFile($icon);
		$image->show();
	}
}
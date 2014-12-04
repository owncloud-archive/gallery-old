<?php
/**
 * Copyright (c) 2012 Robin Appelman <icewind@owncloud.com>
 * Copyright (c) 2014 Olivier Paroz <owncloud@oparoz.com>
 * This file is licensed under the Affero General Public License version 3 or
 * later.
 * See the COPYING-README file.
 */

OCP\JSON::checkAppEnabled('gallery');

$square = isset($_GET['square']) ? (bool)$_GET['square'] : false;
$scale = isset($_GET['scale']) ? $_GET['scale'] : 1;
$token = isset($_GET['token']) ? $_GET['token'] : false;
$images = explode(';', $_GET['image']);

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

	$root = \OC\Files\Filesystem::getPath($fileSource) . '/';
	$images = array_map(function ($image) use ($root) {
		return $root . $image;
	}, $images);
} else {
	$root = '';
	OCP\JSON::checkLoggedIn();
	$user = OCP\User::getUser();
}

session_write_close();
$eventSource = new OC_EventSource();

foreach ($images as $image) {
	$imageName = substr($image, strlen($root));
	$userView = new \OC\Files\View('/' . $user);
	$fileInfo = $userView->getFileInfo('/files/' . $image);
	
	// Prevents the script from breaking if we encounter an error
	if (is_object($fileInfo)) {
		$mimeType = $fileInfo->getMimeType();
		$filePath = $fileInfo->getPath();
		$imageId = $fileInfo->getId();
		OC_Log::write('gallery', '[Batch] File: ' . $filePath . ', Mime: ' . $mimeType, \OC_Log::DEBUG);
	} else {
		OC_Log::write('gallery', '[Batch] WARNING : ' . $image . ' is not a Fileinfo Object', \OC_Log::DEBUG);
		continue;
	}
	
	$preview = new \OC\Preview($user, 'files');
	// Yet another exception for native SVG support...
	if ($mimeType === 'image/svg+xml' && !$preview->isMimeSupported($mimeType)) {
		$previewdata = base64_encode($userView->file_get_contents('/files/' . $image));
		$previewmime = $mimeType;
		OC_Log::write('gallery', '[Batch] Using native SVG rendering', \OC_Log::DEBUG);
	} else {
		if ($square) {
			$height = $width = 100 * $scale;
		} else {
			$width = 400 * $scale;
			$height = 200 * $scale;
		}

		$preview->setFile('/' . $image);
		$preview->setMaxX($width);
		$preview->setMaxY($width);
		// Crop and center for square pictures. Resized picture for large thumbnails
		$preview->setKeepAspect(!$square);
		// A bestfit method is missing so that square pictures don't look distorted
		// when one dimension of the original pictures is smaller

		// if the thumbnails is already cached, get it directly from the filesystem
		// to avoid decoding and re-encoding the image
		if ($path = $preview->isCached($imageId)) {
			OC_Log::write('gallery', '[Batch] Using a cached preview', \OC_Log::DEBUG);
			$previewdata = base64_encode($userView->file_get_contents('/' . $path));
			$previewmime = $userView->getFileInfo('/' . $path)->getMimeType();
		} else {
			OC_Log::write('gallery', '[Batch] Generating a new preview', \OC_Log::DEBUG);
			$previewdata = $preview->getPreview();
			if (!$previewdata->valid()) {
				OC_Log::write('gallery', '[Batch] ERROR! Did not get a preview', \OC_Log::DEBUG);
				// Won't be necessary if previews send the mime icon when it's broken
				// https://github.com/owncloud/core/pull/12546		
				$previewdata = new \OC_Image();
				$icon = \OC::$SERVERROOT . \OC_Helper::mimetypeIcon($mimeType);
				$previewdata->loadFromFile($icon);
			}
			$previewmime = $previewdata->mimeType();
			
		}
	}

	OC_Log::write('gallery', '[Batch] THUMBNAIL NAME : ' . $imageName , \OC_Log::DEBUG);
	OC_Log::write('gallery', '[Batch] THUMBNAIL MIME : ' . $previewmime , \OC_Log::DEBUG);
	OC_Log::write('gallery', '[Batch] THUMBNAIL DATA : ' . substr((string)$previewdata, 0, 20) , \OC_Log::DEBUG);
	
	$eventSource->send('preview', array(
			'image' => $imageName,
			'mimetype' => $previewmime,
			'preview' => (string)$previewdata
	));
}
$eventSource->close();

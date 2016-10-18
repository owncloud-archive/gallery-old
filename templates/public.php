<?php /** @var $l OC_L10N */ ?>
<div class="wrapper"><!-- for sticky footer -->

<header>
	<div id="header">
		<a href="<?php print_unescaped(link_to('', 'index.php')); ?>"
		   title="" id="owncloud">
			<div class="logo-icon svg">
			</div>
		</a>

		<div class="header-appname-container">
			<h1 class="header-appname">
				<?php
					if(OC_Util::getEditionString() === '') {
						p($theme->getName());
					} else {
						print_unescaped($theme->getHTMLName());
					}
				?>
			</h1>
		</div>

		<div id="logo-claim" style="display:none;"><?php p($theme->getLogoClaim()); ?></div>
		<div class="header-right">
			<?php if ($_['showDownloadButton']): ?>
				<a href="<?php p($_['downloadURL']); ?>" id="download" class="button">
					<img class="svg" alt="" src="<?php print_unescaped(OCP\image_path("core", "actions/download.svg")); ?>"/>
					<?php p($l->t('Download'))?>
				</a>
			<?php endif ?>
		</div>
	</div>
</header>
<div id="content" data-albumname="<?php p($_['albumName'])?>">
	<div id="controls">
		<div id="breadcrumbs"></div>
		<!-- toggle for opening shared picture view as file list -->
		<div id="openAsFileListButton" class="button">
			<img class="svg"
				src="<?php print_unescaped(image_path('core', 'actions/toggle-filelist.svg')); ?>"
				alt="<?php p($l->t('File list')); ?>" />
		</div>
	</div>

	<div id='gallery' class="hascontrols" data-requesttoken="<?php p($_['requesttoken'])?>" data-token="<?php isset($_['token']) ? p($_['token']) : p(false) ?>"></div>
</div>

	<div class="push"></div><!-- for sticky footer -->
</div>

<footer>
	<p class="info">
		<?php print_unescaped($theme->getLongFooter()); ?>
	</p>
</footer>

import auto from '@greenweb/gaw-plugin-cloudflare-workers';

// Set the regex to match the image URLs
const moderateImageRegex = /(\d{4})\/(\d{2})\//gi;

export default {
	async fetch(request, env, ctx) {
		return auto(request, env, ctx, {
			debug: 'full',
			contentType: ['text/html', 'text/plain'],
			gawDataApiKey: env.EMAPS_API_KEY,
			ignoreRoutes: ['/wp-content', '/wp-admin', '/wp-login.php', '/wp-includes', '/wp-json'],
			kvCacheData: true,
			kvCachePage: false,
			devMode: false,
			infoBarTarget: '#gaw-data-bar',
			htmlChanges: {
				low: new HTMLRewriter()
					.on('body', {
						element: (element) => {
							element.setAttribute('data-gaw-mode', 'low');
						},
					})
					.on(
						'.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
						{
							element(element) {
								const style = element.getAttribute('style') || '';
								element.setAttribute('style', style + 'display: initial !important;');
							},
						},
					)
					.on('.logo img', {
						element(element) {
							element.setAttribute('src', 'https://branch.climateaction.tech/wp-content/themes/branch-theme/images/branch_green-02.svg');
						},
					}),
				moderate: new HTMLRewriter()
					.on('body', {
						element: (element) => {
							element.setAttribute('data-gaw-mode', 'moderate');
						},
					})
					.on(
						'.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
						{
							element(element) {
								const src = element.getAttribute('src');
								element.setAttribute('src', src.replace(moderateImageRegex, '$1/$2/low-res/'));
								const srcset = element.getAttribute('srcset');
								element.setAttribute('srcset', srcset.replaceAll(moderateImageRegex, '$1/$2/low-res/'));
								const style = element.getAttribute('style') || '';
								element.setAttribute('style', style + 'display: initial !important;');
							},
						},
					)
					.on(
						'.entry-content .wp-block-image figure:not(.no-carbon) picture source, .entry-content figure.wp-block-image:not(.no-carbon) picture source, .entry-content figure.wp-block-gallery figure:not(.no-carbon) picture source',
						{
							element(element) {
								const srcset = element.getAttribute('srcset');
								srcset.replaceAll(moderateImageRegex, '$1/$2/low-res/');
							},
						},
					)
					.on('.logo img', {
						element(element) {
							element.setAttribute('src', 'https://branch.climateaction.tech/wp-content/themes/branch-theme/images/branch_blue-02.svg');
						},
					}),
				high: new HTMLRewriter()
					.on('body', {
						element: (element) => {
							element.setAttribute('data-gaw-mode', 'high');

							// Code to trigger the image being shown
							element.append(
								`<script>
								document.querySelectorAll('.show-image').forEach((el) => {
									el.addEventListener('click', (e) => {
										const parent = e.target.parentElement;
										const img = parent.previousElementSibling;
										const style = img.getAttribute('style') || '';
										img.setAttribute('style', style + 'display: initial !important;');
										parent.remove();
									});
								});</script>`,
								{ html: true },
							);
						},
					})
					.on(
						'.entry-content .wp-block-image figure:not(.no-carbon), .entry-content figure.wp-block-image:not(.no-carbon), .entry-content figure.wp-block-gallery figure:not(.no-carbon)',
						{
							element(element) {
								element.setAttribute('style', 'position: relative;');
							},
						},
					)
					.on(
						'.entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
						{
							element(element) {
								const height = element.getAttribute('height');
								const width = element.getAttribute('width');
								const altText = element.getAttribute('alt') || '';

								element.setAttribute('style', 'display: none;');

								element.after(
									`<span style="width: ${width}px; height: ${height}px; display: inline-block;"><div class="carbon-alt">${altText}</div><div class="show-image">Show Image</div></span>`,
									{ html: true },
								);
							},
						},
					)
					.on('.logo img', {
						element(element) {
							element.setAttribute('src', 'https://branch.climateaction.tech/wp-content/themes/branch-theme/images/branch_orange-02.svg');
						},
					}),
			},
		});
	},
};

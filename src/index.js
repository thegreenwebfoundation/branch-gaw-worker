import auto from '@greenweb/gaw-plugin-cloudflare-workers';

// Set the regex to match the image URLs
const moderateImageRegex = /(\d{4})\/(\d{2})\//gi;

// Regex to find YouTube video ID
const ytIdRegex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

function getYoutubeID(url) {
	var match = url.match(ytIdRegex);
	return match && match[7].length == 11 ? match[7] : false;
}

export default {
	async fetch(request, env, ctx) {
		return auto(request, env, ctx, {
			debug: 'headers',
			contentType: ['text/html', 'text/plain'],
			gawDataApiKey: env.EMAPS_API_KEY,
			ignoreRoutes: ['/wp-content', '/wp-admin', '/wp-login.php', '/wp-includes', '/wp-json'],
			kvCacheData: true,
			kvCachePage: false,
			devMode: false,
			infoBar: {
				target: '#gaw-data-bar',
			},
			userOptIn: true,
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
					.on('iframe[src*="youtube"]', {
						element(element) {
							const src = element.getAttribute('src');
							const id = getYoutubeID(src);
							const className = element.getAttribute('class');
							const params = new URL(src).searchParams.toString();

							const width = element.getAttribute('width') || '100%';
							const height = element.getAttribute('height') || 'auto';

							element.replace(
								`<div style="width: ${width}px; height: ${height}px; margin-inline: auto;"><lite-youtube class="${className || ''}" videoid="${id}" nocookie params='${params}'> </lite-youtube></div>`,
								{
									html: true,
								},
							);

							element.append(
								`<script type="module" src="https://cdn.jsdelivr.net/npm/@justinribeiro/lite-youtube@1.3.1/lite-youtube.js"></script>`,
								{
									html: true,
								},
							);
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
								element.setAttribute('src', src?.replace(moderateImageRegex, '$1/$2/low-res/'));
								const srcset = element.getAttribute('srcset');
								element.setAttribute('srcset', srcset?.replaceAll(moderateImageRegex, '$1/$2/low-res/'));
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
								srcset?.replaceAll(moderateImageRegex, '$1/$2/low-res/');
							},
						},
					)
					.on('iframe[src*="youtube"]', {
						element(element) {
							const src = element.getAttribute('src');
							const id = getYoutubeID(src);
							const className = element.getAttribute('class');
							const params = new URL(src).searchParams.toString();

							const width = element.getAttribute('width') || '100%';
							const height = element.getAttribute('height') || 'auto';

							element.replace(
								`<div style="width: ${width}px; height: ${height}px; margin-inline: auto;"><lite-youtube class="${className || ''}" videoid="${id}" nocookie params='${params}'> </lite-youtube></div>`,
								{
									html: true,
								},
							);

							element.append(
								`<script type="module" src="https://cdn.jsdelivr.net/npm/@justinribeiro/lite-youtube@1.3.1/lite-youtube.js"></script>`,
								{
									html: true,
								},
							);
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

										const src = img.getAttribute('data-full-src');
										const srcset = img.getAttribute('data-full-srcset');

										img.setAttribute('src', src);
										img.setAttribute('srcset', srcset);

										img.setAttribute('data-full-src', '');
										img.setAttribute('data-full-srcset', '');
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
								// const height = element.getAttribute('height');
								// const width = element.getAttribute('width');
								const altText = element.getAttribute('alt') || '';
								const src = element.getAttribute('src');
								const srcset = element.getAttribute('srcset');

								element.setAttribute('data-full-src', src);
								element.setAttribute('data-full-srcset', srcset);
								element.setAttribute('src', src?.replace(moderateImageRegex, '$1/$2/low-res/'));
								element.setAttribute('srcset', srcset?.replaceAll(moderateImageRegex, '$1/$2/low-res/'));

								element.setAttribute('style', 'display: block;');

								element.after(
									`<span style="width: 100%; height: 100%; display: inline-flex; z-index: 1; top: 0; left: 0; position: absolute; background-color: var(--bg-colour-dark);flex-direction: column;align-items: center;justify-content: space-evenly;padding: 0.5rem;">
									<div class="carbon-alt" style="position: relative; transform: none; top: 0; left: 0;">${altText}</div>
									<div class="show-image" style="position: relative; transform: none; bottom: 0; left: 0;">Show image</div>
									</span>`,
									{ html: true },
								);
							},
						},
					)
					.on('link[href*="fonts.css"]', {
						element(element) {
							element.remove();
						},
					})
					.on('link[rel="preload"][as="font"]', {
						element(element) {
							element.remove();
						},
					})
					.on('iframe[src*="youtube"]', {
						element(element) {
							const src = element.getAttribute('src');
							const id = getYoutubeID(src);
							const title = element.getAttribute('title') || '';

							const width = element.getAttribute('width') || '100%';
							const height = element.getAttribute('height') || 'auto';

							element.replace(
								`<style>.lite-youtube-fallback {
									aspect-ratio: 16 / 9; /* matches YouTube player */
									display: flex;
									justify-content: center;
									align-items: center;
									flex-direction: column;
									gap: 1em;
									padding: 1em;
									background-color: var(--bg-colour-dark);
									cursor: pointer;
									}

									.lite-youtube-fallback, .lite-youtube-fallback:visited{
										color: currentColor;
										text-decoration: underline;
									}

									.lite-youtube-fallback:hover {
										text-decoration: none;
									}
									</style><div style="width: ${width}px; height: ${height}px; margin-inline: auto;"><a class="lite-youtube-fallback" href="https://www.youtube.com/watch?v=${id}">Watch on YouTube: <br />"${title}"</a></div>`,
								{
									html: true,
								},
							);

							element.append(
								`<script type="module" src="https://cdn.jsdelivr.net/npm/@justinribeiro/lite-youtube@1.3.1/lite-youtube.js"></script>`,
								{
									html: true,
								},
							);
						},
					})
					.on('.pdf-embed-download', {
						element(element) {
							const href = element.getAttribute('href');

							element.replace(`<a href="${href}" style="color: currentColor; padding: 2.5rem;">Download the PDF</a>`, { html: true });
						},
					})
					.on('.pdfemb-viewer', {
						element(element) {
							element.remove();
						},
					}),
			},
		});
	},
};

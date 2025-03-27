import { PowerBreakdown } from '@greenweb/grid-aware-websites';
import { getLocation, saveDataToKv, fetchDataFromKv } from '@greenweb/gaw-plugin-cloudflare-workers';

// TODO: Grid-aware behaviour for gallery images

// What are the thresholds for the grid power breakdown?
// We;re using the low-carbon percentage, so the higher the percentage, the cleaner the grid.
const lowCarbonBreakpoints = {
	'low': 50,
	'medium': 70,
	'high': 100,
}

export default {
	// First fetch the request
	async fetch(request, env, ctx) {
		const response = await fetch(request.url);
		// Then check if the request content type is HTML.
		const contentType = response.headers.get('content-type');

		// If the content is not HTML, then return the response without any changes.
		if (!contentType || !contentType.includes('text/html')) {
			console.log('Content type is not HTML');
			return new Response(response.body, {
				...response,
			});
		}

		try {

			// We use a cookie to allow us to manually disable the grid-aware feature.
			// This is useful for testing purposes. It can also be used to disable the feature for specific users.
			const cookie = request.headers.get('cookie');
			if (cookie && cookie.includes('gaw=false')) {
				console.log('Grid-aware feature is disabled');
				return new Response(response.body, {
					...response,
				});
			}


			// If the content type is HTML, we get the country the request came from
			const location = await getLocation(request);
			const { country } = location;

			// If the country data does not exist, then return the response without any changes.
			if (!country) {
				console.log('Country data does not exist');
				return new Response(response.body, {
					...response,
				});
			}

			// Check we have have cached grid data for the country
			let gridData = await fetchDataFromKv(env, country);

			// If no cached data, fetch it using the PowerBreakdown class
			if (!gridData) {
				console.log('No cached data for country', country);
				const options = {
					mode: 'low-carbon',
					apiKey: env.EMAPS_API_KEY,
				}

				const powerBreakdown = new PowerBreakdown(options);
				gridData = await powerBreakdown.check(country);

				// If there's an error getting data, return the web page without any modifications
				if (gridData.status === 'error') {
					console.log('Error getting grid data', gridData);
					return new Response(response.body, {
						...response,
						headers: {
							...response.headers,
						},
					});
				}

				// Save the fresh data to KV for future use.
				// By default data is stored for 1 hour.
				await saveDataToKv(env, country, JSON.stringify(gridData));
			} else {
				console.log('Using cached data for country', country);

				console.log('Grid data:', gridData);
				// Parse twice because the data appears to be double-stringified
				gridData = await JSON.parse(gridData);
			}

			let modifyHTML = new HTMLRewriter()

			// Check if the grid intensity is above the threshold
			const powerPercentage = gridData.data.lowCarbonPercentage;
			let intensity = 'unknown';
			let logo = 'unknown';
			if (powerPercentage < thresholds.low) {
				intensity = 'low';
				logo = 'green';
				modifyHTML = modifyHTML.on('html', {
					element(element) {
						const style = element.getAttribute('style') || '';
						element.setAttribute('style', style + '--bg-colour: #C8FF63; --hl-colour: #005C20; --body-colour: #1E1E1E;');
					},
				});

				modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img', {
					element(element) {
						const style = element.getAttribute('style') || '';
						element.setAttribute('style', style + 'display: initial !important;');
					}
				});
			} else if (powerPercentage < thresholds.medium) {
				intensity = 'medium';
				logo = 'blue';
				const re = /(\d{4})\/(\d{2})\//gi;
				modifyHTML = modifyHTML.on('html', {
					element(element) {
						const style = element.getAttribute('style') || '';
						element.setAttribute('style', style + '--bg-colour: #87FEFF; --hl-colour: #00535C; --body-colour: #1E1E1E;');
					},
				});

				modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img', {
					element(element) {
						const src = element.getAttribute('src');
						src.replace(re, "$1/$2/low-res/");
						const srcset = element.getAttribute('srcset');
						srcset.replaceAll(re, "$1/$2/low-res/");
						const style = element.getAttribute('style') || '';
						element.setAttribute('style', style + 'display: initial !important;');
					}
				});

				modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon) picture source, .entry-content figure.wp-block-image:not(.no-carbon) picture source, .entry-content figure.wp-block-gallery figure:not(.no-carbon) picture source', {
					element(element) {
						const srcset = element.getAttribute('srcset');
						srcset.replaceAll(re, "$1/$2/low-res/");
					}
				});
			} else if (powerPercentage <= thresholds.high) {
				intensity = 'high';
				logo = 'orange';
				modifyHTML = modifyHTML.on('html', {
					element(element) {
						const style = element.getAttribute('style') || '';
						element.setAttribute('style', style + '--bg-colour: #FFBF43; --hl-colour: #472E00; --body-colour: #1E1E1E;');
					},
				});


			} else {
				intensity = 'unknown';
			}

			modifyHTML = modifyHTML.on('.logo img', {
				element(element) {
					element.setAttribute('src', '/wp-content/themes/branch-theme/images/branch_' + logo + '-02.svg');
				}
			})


			modifyHTML = modifyHTML.on('body', {
				element(element) {
					const classes = element.getAttribute('class') || '';
					element.setAttribute('class', classes + ' ' + intensity + '-grid-intensity');
				},
			});


				// Transform the response using the HTMLRewriter API, and set appropriate headers.
				let modifiedResponse = new Response(modifyHTML.transform(response).body, {
					...response,
					headers: {
						...response.headers,
						'Content-Type': 'text/html;charset=UTF-8',
					},
				});

				return modifiedResponse;

			// // If the grid aware flag is not triggered, then we'll return the original HTML page to the user.
			// return new Response(response.body, {
			// 	...response,
			// 	headers: {
			// 		...response.headers,
			// 	},
			// });
		} catch (e) {

			// If there's an error getting data, return the web page without any modifications
			console.log('Error getting grid data', e);
			return new Response(response.body, {
				...response,
				headers: {
					...response.headers,
				},
			});
		}
	},
};

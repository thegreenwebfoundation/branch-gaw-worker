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

let intensity = 'unknown';
let logo = 'unknown';

function createSelect(selectedIntensity) {
	const options = ['live', 'high', 'moderate', 'low'];
	let selectOptions = '<select id="carbon-switcher-toggle" class="select-list__linked select-css" style="text-decoration: underline; text-underline-offset: 2px;">';
	options.forEach(option => {
		if (option === selectedIntensity) {
			selectOptions += `<option value="${option}" selected>${option}</option>`;
		} else {
			selectOptions += `<option value="${option}">${option}</option>`;
		}
	});

	selectOptions += '</select>';

	return selectOptions;
}

async function setHighTheme(modifyHTML) {
		intensity = 'high';
		logo = 'orange';
		modifyHTML = modifyHTML.on('html', {
			element(element) {
				const style = element.getAttribute('style') || '';
				element.setAttribute('style', style + '--bg-colour: #FFBF43; --hl-colour: #472E00; --body-colour: #1E1E1E;');
			},
		});

		// Regular images, not in gallery
		modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon), .entry-content figure.wp-block-image:not(.no-carbon), .entry-content figure.wp-block-gallery figure:not(.no-carbon)', {
			element(element) {
				element.setAttribute('style', 'position: relative;');
			}
		});
		modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img', {
			element(element) {
				const height = element.getAttribute('height');
				const width = element.getAttribute('width');
				const altText = element.getAttribute('alt') || '';

				element.after(`<span style="width: ${width}px; height: ${height}px; display: inline-block;"><div class="carbon-alt">${altText}</div><div class="show-image">Show Image</div></span>`, { html: true });
			}
		});

		modifyHTML = modifyHTML.on('body', {
			element(element) {
				element.append(`<script>
					document.querySelectorAll('.show-image').forEach((el) => {
						el.addEventListener('click', (e) => {
							const parent = e.target.parentElement;
							const img = parent.previousElementSibling;
							const style = img.getAttribute('style') || '';
							img.setAttribute('style', style + 'display: initial !important;');
							parent.remove();
						});
					});</script>`, { html: true });
			},
		});

		// Gallery images
		// modifyHTML = modifyHTML.on('.entry-content .wp-block-image figure:not(.no-carbon), .entry-content figure.wp-block-image:not(.no-carbon), .entry-content figure.wp-block-gallery figure:not(.no-carbon)', {

		// https://branch-staging.climateaction.tech/wp-content/uploads/2024/04/xWholegrain-Digital-logo.png.pagespeed.ic.Cot5LJTbQ2.png
		//

		return modifyHTML;
}

async function setMediumTheme(modifyHTML) {
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
				element.setAttribute('src', src.replace(re, "$1/$2/low-res/"));
				const srcset = element.getAttribute('srcset');
				element.setAttribute('srcset', srcset.replaceAll(re, "$1/$2/low-res/"));
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

		return modifyHTML;
}

async function setLowTheme(modifyHTML) {
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

		return modifyHTML;
}

async function returnPage(response, modifyHTML, selectedIntensity = 'live') {
	modifyHTML = modifyHTML.on('.logo img', {
		element(element) {
			element.setAttribute('src', 'https://branch.climateaction.tech/wp-content/themes/branch-theme/images/branch_' + logo + '-02.svg');
		}
	})


	modifyHTML = modifyHTML.on('body', {
		element(element) {
			const classes = element.getAttribute('class') || '';
			element.setAttribute('class', classes + ' ' + intensity + '-grid-intensity');
		},
	});

	modifyHTML = modifyHTML.on('.intensity', {
		element(element) {
			element.setInnerContent(intensity);
		}
	});

	modifyHTML = modifyHTML.on('#intensity-toggle-js', {
		element(element) {
			// element.before(`<script>function setWithExpiry(key,value,ttl){const now=new Date();now.setTime(now.getTime()+ttl);document.cookie=key+"="+value+";expires="+now.toUTCString()+";path=/"}function getWithExpiry(key){return}</script>`, { html: true });
			element.remove();
		}
	});

	modifyHTML = modifyHTML.on('#carbon-switcher-toggle', {
		element(element) {
			element.replace(createSelect(selectedIntensity), { html: true });
		}
	});

	modifyHTML = modifyHTML.on('body', {
		element(element) {
			element.append(`<script>
				function setWithExpiry(key, value) {
					document.cookie = key + "=" + value + ";path=/";
				}

				document.getElementById('carbon-switcher-toggle').addEventListener('change', function(e) {
					setWithExpiry('selected-intensity', e.target.value);
					location.reload();
				});</script>`, { html: true });
		}
	});

	return new Response(modifyHTML.transform(response).body, {
		...response,
		headers: {
			...response.headers,
			'Content-Type': 'text/html;charset=UTF-8',
		},
	});
}

export default {
	// First fetch the request
	async fetch(request, env, ctx) {
		const url = request.url;
		const response = await fetch(request.url);
		// Then check if the request content type is HTML.
		const contentType = response.headers.get('content-type');

		// If the content is not HTML, then return the response without any changes.
		if (!contentType || !contentType.includes('text/html') || url.includes('/wp-content/') || url.includes('/wp-includes/') || url.includes('/wp-admin/') || url.includes('/wp-json/')) {
			// console.log('Content type is not HTML');
			return new Response(response.body, {
				...response,
			});
		}

		try {

			// We use a cookie to allow us to manually disable the grid-aware feature.
			// This is useful for testing purposes. It can also be used to disable the feature for specific users.
			const cookie = request.headers.get('cookie');
			if (cookie && cookie.includes('gaw=false')) {
				// console.log('Grid-aware feature is disabled');
				return new Response(response.body, {
					...response,
				});
			}

			let modifyHTML = new HTMLRewriter();

			if (cookie && cookie.includes('selected-intensity=low')) {
				// console.log('Grid-aware feature is forced to low');
				await setLowTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'low');
			}
			if (cookie && cookie.includes('selected-intensity=moderate')) {
				// console.log('Grid-aware feature is forced to moderate');
				await setMediumTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'moderate');
			}
			if (cookie && cookie.includes('selected-intensity=high')) {
				// console.log('Grid-aware feature is forced to high');
				await setHighTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'high');
			}


			// If the content type is HTML, we get the country the request came from
			const location = await getLocation(request);
			const { country } = location;

			// If the country data does not exist, then return the response without any changes.
			if (!country) {
				// console.log('Country data does not exist');
				return new Response(response.body, {
					...response,
				});
			}

			// Check we have have cached grid data for the country
			let gridData = await fetchDataFromKv(env, country);

			// If no cached data, fetch it using the PowerBreakdown class
			if (!gridData) {
				// console.log('No cached data for country', country);
				const options = {
					mode: 'low-carbon',
					apiKey: env.EMAPS_API_KEY,
				}

				const powerBreakdown = new PowerBreakdown(options);
				gridData = await powerBreakdown.check(country);

				// If there's an error getting data, return the web page without any modifications
				if (gridData.status === 'error') {
					// console.log('Error getting grid data', gridData);
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
				// console.log('Using cached data for country', country);

				// console.log('Grid data:', gridData);
				// Parse twice because the data appears to be double-stringified
				gridData = await JSON.parse(gridData);
			}



			console.log('Using grid data for country', country);
			// Check if the grid intensity is above the threshold
			const powerPercentage = gridData.data.lowCarbonPercentage;

				// Transform the response using the HTMLRewriter API, and set appropriate headers.
			if (powerPercentage < lowCarbonBreakpoints.low) {
				// console.log('Power percentage is low');
				await setHighTheme(modifyHTML);
				return await returnPage(response, modifyHTML);
			} else if (powerPercentage < lowCarbonBreakpoints.medium) {
				// console.log('Power percentage is medium');
				await setMediumTheme(modifyHTML);
				return await returnPage(response, modifyHTML);
			} else if (powerPercentage < lowCarbonBreakpoints.high) {
				// console.log('Power percentage is high');
				await setLowTheme(modifyHTML);
				return await returnPage(response, modifyHTML);
			}

		} catch (e) {

			// If there's an error getting data, return the web page without any modifications
			// console.log('Error getting grid data', e);
			return new Response(response.body, {
				...response,
				headers: {
					...response.headers,
				},
			});
		}
	},
};

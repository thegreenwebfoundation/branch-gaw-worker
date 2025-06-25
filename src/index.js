import { PowerBreakdown } from '@greenweb/grid-aware-websites';
import { getLocation, saveDataToKv, fetchDataFromKv } from '@greenweb/gaw-plugin-cloudflare-workers';

// TODO: Grid-aware behaviour for gallery images
// TODO: Grid-aware behaviour for images that are links

// What are the thresholds for the grid power breakdown?
// We're using the low-carbon percentage from Electricity Maps, so the higher the percentage the cleaner the grid.
const lowCarbonBreakpoints = {
	low: 50,
	medium: 70,
	high: 100,
};

let intensity = 'unknown';
let logo = 'unknown';

// This function creates the select element for the grid intensity switcher
// It takes the selected intensity as an argument and returns a string of HTML
function createSelect(selectedIntensity) {
	const options = ['live', 'high', 'moderate', 'low'];
	let selectOptions =
		'<select id="carbon-switcher-toggle" class="select-list__linked select-css" style="text-decoration: underline; text-underline-offset: 2px;">';
	options.forEach((option) => {
		if (option === selectedIntensity) {
			selectOptions += `<option value="${option}" selected>${option}</option>`;
		} else {
			selectOptions += `<option value="${option}">${option}</option>`;
		}
	});

	selectOptions += '</select>';

	return selectOptions;
}

// This function sets the theme for the high intensity
async function setHighTheme(modifyHTML) {
	// Set the logo and intensity for the high theme
	intensity = 'high';
	logo = 'orange';

	// The rest of the code uses HTMLRewriter to modify the HTML response for the high theme

	// Add the CSS variables for the high theme to the HTML element
	modifyHTML = modifyHTML.on('html', {
		element(element) {
			const style = element.getAttribute('style') || '';
			element.setAttribute('style', style + '--bg-colour: #FFBF43; --hl-colour: #472E00; --body-colour: #1E1E1E;');
		},
	});

	// Set the figure elements on the page to have a relative position that will allow them to be replaced with the high theme overlay
	modifyHTML = modifyHTML.on(
		'.entry-content .wp-block-image figure:not(.no-carbon), .entry-content figure.wp-block-image:not(.no-carbon), .entry-content figure.wp-block-gallery figure:not(.no-carbon)',
		{
			element(element) {
				element.setAttribute('style', 'position: relative;');
			},
		},
	);

	// Set the src and srcset attributes for the images on the page based on the CSS selectors specified
	modifyHTML = modifyHTML.on(
		'.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
		{
			element(element) {
				const height = element.getAttribute('height');
				const width = element.getAttribute('width');
				const altText = element.getAttribute('alt') || '';

				element.after(
					`<span style="width: ${width}px; height: ${height}px; display: inline-block;"><div class="carbon-alt">${altText}</div><div class="show-image">Show Image</div></span>`,
					{ html: true },
				);
			},
		},
	);

	// Add a script to the end of the body that removes the overlay span when the "Show Image" link is clicked.
	modifyHTML = modifyHTML.on('body', {
		element(element) {
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
	});

	// Gallery images
	// modifyHTML = modifyHTML.on('.entry-content figure.wp-block-gallery figure:not(.no-carbon)', {
	// 	element(element) {
	// 		const height = element.getAttribute('height');
	// 		const width = element.getAttribute('width');
	// 		const altText = element.getAttribute('alt') || '';

	// 		element.after(`<span style="width: ${width}px; height: ${height}px; display: inline-block;"><div class="carbon-alt">${altText}</div><div class="show-image">Show Image</div></span>`, { html: true });
	// 	}
	// });

	// https://branch-staging.climateaction.tech/wp-content/uploads/2024/04/xWholegrain-Digital-logo.png.pagespeed.ic.Cot5LJTbQ2.png
	//

	return modifyHTML;
}

async function setMediumTheme(modifyHTML) {
	// Set the logo and intensity for the medium theme
	intensity = 'medium';
	logo = 'blue';

	// The rest of the code uses HTMLRewriter to modify the HTML response for the medium theme

	// Set the regex to match the image URLs
	const re = /(\d{4})\/(\d{2})\//gi;

	// Add the CSS variables for the medium theme to the HTML element
	modifyHTML = modifyHTML.on('html', {
		element(element) {
			const style = element.getAttribute('style') || '';
			element.setAttribute('style', style + '--bg-colour: #87FEFF; --hl-colour: #00535C; --body-colour: #1E1E1E;');
		},
	});

	// Replace the src and srcset attributes for the images on the page based on the CSS selectors specified
	// The regex is used to match the image URLs and replace them with the low-res version
	// The srcset attribute is also modified to include the low-res version of the image
	// The style attribute is set to display the image
	modifyHTML = modifyHTML.on(
		'.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
		{
			element(element) {
				const src = element.getAttribute('src');
				element.setAttribute('src', src.replace(re, '$1/$2/low-res/'));
				const srcset = element.getAttribute('srcset');
				element.setAttribute('srcset', srcset.replaceAll(re, '$1/$2/low-res/'));
				const style = element.getAttribute('style') || '';
				element.setAttribute('style', style + 'display: initial !important;');
			},
		},
	);

	// Replace the srcset attribute for the picture elements on the page based on the CSS selectors specified
	// The regex is used to match the image URLs and replace them with the low-res version
	// The srcset attribute is modified to include the low-res version of the image
	modifyHTML = modifyHTML.on(
		'.entry-content .wp-block-image figure:not(.no-carbon) picture source, .entry-content figure.wp-block-image:not(.no-carbon) picture source, .entry-content figure.wp-block-gallery figure:not(.no-carbon) picture source',
		{
			element(element) {
				const srcset = element.getAttribute('srcset');
				srcset.replaceAll(re, '$1/$2/low-res/');
			},
		},
	);

	return modifyHTML;
}

async function setLowTheme(modifyHTML) {
	// Set the logo and intensity for the low theme
	intensity = 'low';
	logo = 'green';

	// The rest of the code uses HTMLRewriter to modify the HTML response for the low theme
	// Add the CSS variables for the low theme to the HTML element
	modifyHTML = modifyHTML.on('html', {
		element(element) {
			const style = element.getAttribute('style') || '';
			element.setAttribute('style', style + '--bg-colour: #C8FF63; --hl-colour: #005C20; --body-colour: #1E1E1E;');
		},
	});

	// Update the style attribute for the figure elements on the page so that images are shown
	modifyHTML = modifyHTML.on(
		'.entry-content .wp-block-image figure:not(.no-carbon) img, .entry-content figure.wp-block-image:not(.no-carbon) img, .entry-content figure.wp-block-gallery figure:not(.no-carbon) img',
		{
			element(element) {
				const style = element.getAttribute('style') || '';
				element.setAttribute('style', style + 'display: initial !important;');
			},
		},
	);

	return modifyHTML;
}

// This function takes the response and modifies the HTML using the HTMLRewriter API before returning the response to the client
// It replaces the logo, intensity, and adds a select element for the grid intensity switcher
// It also adds a script to handle the change event for the select element and set a cookie with the selected intensity
async function returnPage(response, modifyHTML, selectedIntensity = 'live') {
	// Set the logo based on the intensity
	modifyHTML = modifyHTML.on('.logo img', {
		element(element) {
			element.setAttribute('src', 'https://branch.climateaction.tech/wp-content/themes/branch-theme/images/branch_' + logo + '-02.svg');
		},
	});

	// Add a class to the body element based on the intensity
	modifyHTML = modifyHTML.on('body', {
		element(element) {
			const classes = element.getAttribute('class') || '';
			element.setAttribute('class', classes + ' ' + intensity + '-grid-intensity');
		},
	});

	// Update the content of the intensity element with the current intensity
	modifyHTML = modifyHTML.on('.intensity', {
		element(element) {
			element.setInnerContent(intensity);
		},
	});

	// Remove the script tag for the intensity toggle on the page
	modifyHTML = modifyHTML.on('#intensity-toggle-js', {
		element(element) {
			// element.before(`<script>function setWithExpiry(key,value,ttl){const now=new Date();now.setTime(now.getTime()+ttl);document.cookie=key+"="+value+";expires="+now.toUTCString()+";path=/"}function getWithExpiry(key){return}</script>`, { html: true });
			element.remove();
		},
	});

	// Replace the carbon intensity switcher toggle with a select element that allows the user to select the grid intensity
	// The select element is created using the createSelect function and the selected intensity is passed as an argument
	modifyHTML = modifyHTML.on('#carbon-switcher-toggle', {
		element(element) {
			element.replace(createSelect(selectedIntensity), { html: true });
		},
	});

	// Add a script to handle the change event for the select element
	// When the user selects a new intensity, a cookie is set with the selected intensity and the page is reloaded
	modifyHTML = modifyHTML.on('body', {
		element(element) {
			element.append(
				`<script>
				function setWithExpiry(key, value) {
					document.cookie = key + "=" + value + ";path=/";
				}

				document.getElementById('carbon-switcher-toggle').addEventListener('change', function(e) {
					setWithExpiry('selected-intensity', e.target.value);
					location.reload();
				});</script>

				<script>
				async function main() {

							const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
							const tocLink = document.querySelector('.toc-link');
							const blackOut = document.querySelector('.blackout');
							const toc = document.querySelector('.table-of-contents');
							let tocActive = 0;

							if ( tocLink !== null ) {
								tocLink.addEventListener( "click", function(event) {
									event.preventDefault();
									if ( 1 == tocActive ) {
										blackOut.classList.add('blackout-fading');
										setTimeout( function() {
											blackOut.classList.remove('blackout-active');
											blackOut.classList.remove('blackout-fading');
											tocActive = 0;
										}, 500);
									} else {
										blackOut.classList.add('blackout-active');
										tocActive = 1;
									}
									toc.classList.toggle('table-of-contents-active');
								}, false);
							}
						}
						main()
						</script>`,
				{ html: true },
			);
		},
	});

	// TEMP: Image & CSS hack
	// modifyHTML = modifyHTML.on('img[src$=".svg"', {
	// 	element(element) {
	// 		const src = element.getAttribute('src');
	// 		element.setAttribute('src', src.replace('branch-staging.climateaction.tech', 'branch.climateaction.tech'));
	// 	}
	// });

	modifyHTML = modifyHTML.on('head', {
		element(element) {
			element.prepend(
				'<link rel="stylesheet" id="branch-style-css" href="https://branch-staging.climateaction.tech/wp-content/themes/branch-theme/style.css?ver=1742233564" media="all">',
				{ html: true },
			);
		},
	});

	// Return the modified response with the appropriate headers
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
		const devMode = env.WORKER_MODE === 'dev' ? true : false;

		let newRequest = null;
		if (devMode) {
			console.log('devMode is enabled');
			const url = new URL(request.url);
			url.hostname = 'localhost';
			url.port = '8080';
			url.protocol = 'http';
			newRequest = new Request(url.toString(), request);
		}

		if (newRequest) {
			request = newRequest;
		}

		const url = request.url;

		// If the URL is a path we ant to skip, then just return the request
		if (
			url.includes('/wp-content') ||
			url.includes('/wp-includes') ||
			url.includes('/wp-admin') ||
			url.includes('/wp-login.php') ||
			url.includes('/wp-json')
		) {
			return fetch(request);
		}

		const response = await fetch(request.url);
		// Then check if the request content type is HTML.
		const contentType = response.headers.get('content-type');

		// If the content is not HTML, then return the response without any changes.
		if (!contentType || !contentType.includes('text/html')) {
			// console.log('Content type is not HTML');
			return fetch(request);
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

			// Check if the user has selected a grid intensity using the cookie
			// If the cookie exists, then we set the selected intensity to the value of the cookie
			if (cookie && cookie.includes('selected-intensity=low')) {
				// console.log('Grid-aware feature is forced to low');
				await setLowTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'low');
			} else if (cookie && cookie.includes('selected-intensity=moderate')) {
				// console.log('Grid-aware feature is forced to moderate');
				await setMediumTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'moderate');
			} else if (cookie && cookie.includes('selected-intensity=high')) {
				// console.log('Grid-aware feature is forced to high');
				await setHighTheme(modifyHTML);
				return await returnPage(response, modifyHTML, 'high');
			}

			// If the user has not selected a grid intensity, then we get the location of the request
			const location = await getLocation(request);
			const { country } = location;

			// If the country data does not exist, then return the response without any changes.
			if (!country) {
				// console.log('Country data does not exist');
				return new Response(response.body, {
					...response,
				});
			}

			// Check if we have have cached grid data for the country
			let gridData = await fetchDataFromKv(env, country);

			// If no cached data, fetch it using the PowerBreakdown class
			if (!gridData) {
				// console.log('No cached data for country', country);
				const options = {
					mode: 'low-carbon',
					apiKey: env.EMAPS_API_KEY,
				};

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

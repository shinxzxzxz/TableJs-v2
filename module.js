/**
 * Custom error class for TableJS errors.
 * @class TableJSError
 * @extends Error
 * @param {string} message - The error message.
 */
class TableJSError extends Error {
	constructor(message) {
		super(message);
		this.name = 'TableJSError';
	}
}

/**
 * Represents a utility for making HTTP requests.
 */
class HttpRequest {
	/**
	 * Creates an instance of HttpRequest.
	 * @param {Object} config - Configuration options for the HTTP request.
	 * @param {string} config.url - The URL to which the request will be made.
	 * @param {string} [config.method='GET'] - The HTTP method for the request (default is GET).
	 * @param {number} [config.timeout=5000] - The timeout duration for the request in milliseconds (default is 5 seconds).
	 * @param {Object} [config.data] - The data to be sent with the request (for POST, PUT, PATCH requests).
	 * @param {Object} [config.headers] - The headers to be included in the request.
	 * @param {string} [config.dataType='json'] - The type of data expected in the response ('json' or 'html').
	 * @param {string} [config.mode='cors'] - The mode for the request (e.g., 'cors', 'no-cors', 'same-origin').
	 * @param {string} [config.cache='no-cache'] - The cache mode for the request (e.g., 'default', 'no-store', 'reload').
	 * @param {string} [config.credentials='same-origin'] - The credentials mode for the request (e.g., 'omit', 'same-origin', 'include').
	 * @param {string} [config.redirect='follow'] - The redirect mode for the request (e.g., 'follow', 'error', 'manual').
	 * @param {string} [config.referrerPolicy='no-referrer'] - The referrer policy for the request (e.g., 'no-referrer', 'origin', 'unsafe-url').
	 * @param {Function} [config.beforeSend] - Function to be called before sending the request.
	 * @param {Function} [config.afterSend] - Function to be called after sending the request.
	 * @param {Function} [config.success] - The success callback function.
	 * @param {Function} [config.error] - The error callback function.
	 */
	constructor({
		url,
		async = true,
		method = 'GET',
		data,
		timeout = 10000,
		headers = { 'Content-Type': 'application/json' },
		dataType = 'json',
		mode = 'cors',
		cache = 'no-cache',
		credentials = 'same-origin',
		redirect = 'follow',
		referrerPolicy = 'no-referrer',
		beforeSend,
		afterSend,
		success,
		error,
	}) {
		this.config = {
			url,
			async,
			method,
			timeout,
			data,
			headers,
			dataType,
			mode,
			cache,
			credentials,
			redirect,
			referrerPolicy,
			beforeSend,
			afterSend,
			success,
			error,
		};
		this.timeoutId = null;
	}

	/**
	 * Converts a camelCase string to Title Case.
	 * @param {string} inputString - The input string to be converted.
	 * @returns {string} The input string converted to Title Case.
	 */
	camelToTitleCase(inputString) {
		if (inputString[0] === inputString[0].toUpperCase()) {
			return inputString;
		}
		return inputString
			.replace(/[A-Z]/g, (match) => '-' + match)
			.replace(/(?:^|-)([a-z])/g, (_, g1) => g1.toUpperCase());
	}

	/**
	 * Processes headers keys to HTTP header format.
	 * @param {Object} headers - The headers object to be processed.
	 * @returns {Object} The processed headers object.
	 */
	convertHeaders(headers) {
		const convertedHeaders = {};
		if (headers) {
			Object.keys(headers).forEach((key) => {
				const header =
					key[0] === key[0].toUpperCase()
						? key
						: this.camelToTitleCase(key);
				convertedHeaders[header] = headers[key];
			});
		}
		return convertedHeaders;
	}

	/**
	 * Sends an HTTP request based on the provided configuration.
	 * @returns {Promise} A promise that resolves with the response data or rejects with an error.
	 */
	request() {
		let { url, timeout, dataType, success, error, beforeSend, afterSend } =
			this.config;
		let { method, headers, data } = this.config;
		let requestData;

		if (data) {
			Object.keys(data).forEach((key) => {
				const placeholder = ':' + key;
				if (url.includes(placeholder)) {
					url = url.replace(
						placeholder,
						encodeURIComponent(data[key])
					);
					delete data[key];
				}
			});

			if (method.toUpperCase() === 'GET') {
				const queryString = new URLSearchParams(data).toString();
				if (queryString !== '') {
					url += '?' + queryString;
				}
			} else {
				requestData = JSON.stringify(data);
			}
		}

		const controller = new AbortController();
		const requestOptions = {
			async: this.config.async,
			signal: controller.signal,
			method: this.config.method,
			headers: this.convertHeaders(headers),
			mode: this.config.mode,
			cache: this.config.cache,
			credentials: this.config.credentials,
			redirect: this.config.redirect,
			referrerPolicy: this.config.referrerPolicy,
			body: requestData,
		};
		return new Promise((resolve, reject) => {
			if (typeof beforeSend === 'function') {
				beforeSend();
			}
			this.timeoutId = setTimeout(() => {
				controller.abort();
				reject(new Error(`Request timed out for ${url} with timeout of ${timeout}`));
			}, timeout);
			fetch(url, requestOptions)
				.then((response) => {
					clearTimeout(this.timeoutId);
					switch (dataType) {
						case 'json':
							return response.json();
						default:
							return response.text();
					}
				})
				.then(async (data) => {
					if (dataType === 'html') {
						const parser = new DOMParser();
						const html = parser.parseFromString(data, 'text/html');
						if (html.documentElement.tagName === 'parsererror') {
							throw new Error('Failed to parse response as HTML');
						}
						resolve(html);
					} else {
						if (typeof success === 'function') {
							await success(data);
						}
						resolve(data);
					}
				})
				.catch((err) => {
					if (typeof error === 'function') {
						error(err);
					}
					reject(err);
				})
				.finally(() => {
					if (typeof afterSend === 'function') {
						afterSend();
					}
				});
		});
	}
}

export { TableJSError, HttpRequest };

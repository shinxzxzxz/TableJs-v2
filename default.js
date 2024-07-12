/**
 * Default values used in various utility functions.
 * @namespace DEFAULT
 */
const DEFAULT = {
    /**
     * Default limit value.
     * @type {string}
     */
    LIMIT: "*",
    /**
     * Default items per page options.
     * @type {number[]}
     */
    ITEMS: ["*", 10, 25, 50, 100, 500, 1000],
    /**
     * Default page number.
     * @type {number}
     */
    PAGE: 1,
    /**
     * Default search value.
     * @type {string}
     */
    SEARCH: "",
    /**
     * Default filter value.
     * @type {string}
     */
    FILTER: "",
    /**
     * Default http async.
     * @type {boolean}
     */
    ASYNC: true,
    /**
     * Default request timeout number.
     * @type {number}
     */
    TIMEOUT: 15000,
    /**
     * Default request method value.
     * @type {string}
     */
    METHOD: "GET",
    /**
     * Default no search result output.
     * @type {string}
     */
    NO_RESULT_MESSAGE: "No matching records found",
};

export default DEFAULT;

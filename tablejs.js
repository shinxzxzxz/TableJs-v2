/*!
 * TableJS v1.0.0
 */

import CLASS from "./class.js";
import DEFAULT from "./default.js";
import UTILITIES from "./utilities.js";
import { HttpRequest, TableJSError } from "./module.js";

(function (global, factory) {
    "use strict";

    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = global.document
            ? factory(global, true)
            : function (w) {
                  if (!w.document) {
                      throw new TableJSError(
                          `TableJS requires a window with a document`
                      );
                  }
                  return factory(w, undefined);
              };
    } else {
        global.TableJS = factory(global, undefined);
        global.HttpRequest = HttpRequest;
    }

    // Pass this if the window is not defined yet
})(typeof window !== "undefined" ? window : this, function (window, noGlobal) {
    /**
     * TableJS constructor function.
     *
     * @class
     * @name TableJS
     * @version v1.0.0
     * @param {string|Element} table - CSS table string or DOM element representing the table container.
     * @returns {TableJS} An instance of the TableJS class.
     *
     * @throws {Error} If the table is invalid or the table element is not found.
     */
    function TableJS(table, options = {}) {
        if (!(this instanceof TableJS)) {
            return new TableJS(table, options);
        }

        this.elements = {};

        this.options = UTILITIES.validateVariable(options, {
            variableName: "TableJS.options",
            $and: [
                { typeOf: "object" },
                { execute: (object) => !Array.isArray(object) },
            ],
        });

        let { colvis, exportAs, api, paginate, sort, dataset } = options;
        if (colvis) {
            this.elements.colvis = UTILITIES.validateVariable(colvis, {
                variableName: "options.colvis",
                $transform: (element) => UTILITIES.validateElement(element),
                $fallback: ({ element }) => UTILITIES.validateElement(element),
                $or: [{ typeOf: "string" }, { instanceOf: Element }],
            });
            Object.assign(this.elements.colvis, colvis);
        }
        if (exportAs) {
            this.elements.exportAs = UTILITIES.validateVariable(exportAs, {
                variableName: "options.exportAs",
                $transform: (array) =>
                    array.reduce((acc, object) => {
                        const { as, element } = object;
                        let $element = UTILITIES.validateElement(element);
                        Object.assign($element, object);
                        return {
                            ...acc,
                            [as]: $element,
                        };
                    }, {}),
                $and: [
                    { typeOf: "object" },
                    { execute: (array) => Array.isArray(array) },
                    {
                        execute: (array) =>
                            array.every(
                                (item) =>
                                    typeof item === "object" &&
                                    !Array.isArray(item)
                            ),
                    },
                    {
                        execute: (array) =>
                            array.every(
                                ({ as, element }) =>
                                    UTILITIES.validateElement(element) &&
                                    ["csv", "pdf", "excel", "print"].includes(
                                        as.toLowerCase()
                                    )
                            ),
                    },
                ],
            });
        }
        if (api) {
            this.api = UTILITIES.validateVariable(api, {
                variableName: "options.api",
                $fallback: {
                    url: typeof api === "string" ? api : api.url,
                    method: DEFAULT.METHOD,
                    async: DEFAULT.ASYNC,
                    timeout: DEFAULT.TIMEOUT,
                },
                $and: [
                    { typeOf: "object" },
                    { execute: (object) => !Array.isArray(object) },
                    { has: ["url"] },
                ],
            });
        }
        if (paginate) {
            this.elements.paginate = UTILITIES.validateVariable(paginate, {
                variableName: "options.paginate",
                $transform: (array) =>
                    array.reduce((acc, object) => {
                        let { to, element, as } = object;
                        if (typeof acc[to] === "undefined") {
                            acc[to] = {};
                        }
                        if (!acc[to][as]) {
                            acc[to][as] = [];
                        }
                        element = UTILITIES.validateElement(element);
                        if (api?.init === true && to === "api") {
                            element.disabled = true;
                        }
                        console.log(object);
                        Object.assign(element, object);
                        element = UTILITIES.validateElement(element);
                        acc[to][as].push(element);
                        return acc;
                    }, {}),
                $and: [
                    { typeOf: "object" },
                    { execute: (array) => Array.isArray(array) },
                    {
                        execute: (array) =>
                            array.every(
                                (item) =>
                                    typeof item === "object" &&
                                    !Array.isArray(item)
                            ),
                    },
                    {
                        execute: (array) =>
                            array.every(
                                ({ to, element, as }) =>
                                    UTILITIES.validateElement(element) &&
                                    [
                                        "previous",
                                        "next",
                                        "limit",
                                        "search",
                                        "filter",
                                    ].includes(as?.toLowerCase()) &&
                                    ["api", "local"].includes(to?.toLowerCase())
                            ),
                    },
                ],
            });
        }

        if (table) {
            table = UTILITIES.validateVariable(table, {
                $transform: (element) =>
                    UTILITIES.validateElement(element, "table"),
                $or: [{ typeOf: "string" }, { instanceOf: Element }],
            });

            let ths = table.querySelectorAll("thead th");
            let trs = table.querySelectorAll(`tr:not(.${CLASS.TR.NO_DATA})`);

            let headers = Array.from(ths);
            let rows = Array.from(trs);

            table.classList.add(CLASS.TABLE);

            headers?.forEach((th) => {
                if (!th.dataset.tjsColumn) {
                    th.dataset.tjsColumn = th.cellIndex;
                }
                th.classList.add(CLASS.TH.BASE);
            });

            if (ths.length > 0) {
                rows.shift();
            }

            rows.forEach((row, index) => {
                if (!row.classList.contains(CLASS.TR.BASE)) {
                    row.classList.add(CLASS.TR.BASE, CLASS.TR.VISIBLE);
                }
                if (row.index === undefined || row.index === null) {
                    row.index = index;
                    row.dataset.index = index;
                }
                if (!row.role) {
                    row.role = "row";
                }

                let tds = Array.from(row.children);

                tds.forEach((td) => {
                    td.classList.add(CLASS.TD.BASE, CLASS.TD.VISIBLE);
                });
            });

            this.elements.table = table;

            table.sort = UTILITIES.validateVariable(sort, {
                $fallback: { ascending: true, exclude: [] },
                $and: [
                    { typeOf: "object" },
                    { execute: (object) => !Array.isArray(object) },
                ],
            });

            table.properties = new Proxy(table, {
                set: (target, property, value) => {
                    const previousValue = target[property];
                    if (previousValue !== value) {
                        target[property] = value;
                        UTILITIES.propertiesListener({
                            elements: this.elements,
                            property,
                            value,
                        });
                    }
                    return true;
                },
            });

            Object.assign(table.properties, {
                page: DEFAULT.PAGE,
                limit: DEFAULT.LIMIT,
                search: "",
                filters: {},
            });
        }
        if (dataset) {
            dataset = UTILITIES.validateVariable(dataset, {
                variableName: "options.dataset",
                $transform: ({ rendering }) => ({
                    collection: dataset,
                    rendering,
                }),
                $fallback: () => dataset,
                $and: [
                    { typeOf: "object" },
                    { instanceOf: Object },
                    { has: ["collection", "rendering"] },
                ],
            });

            this.dataset = dataset;
        }

        UTILITIES.toInitialize(this);

        return this;
    }

    TableJS.prototype.setApiHeader = function (key, value) {};

    TableJS.prototype.setApiHeaders = function (headers = {}) {};

    TableJS.prototype.setApiData = function (data = {}) {
        data = UTILITIES.validateVariable(data, {
            variableName: "setApiData.data",
            $and: [{ typeOf: "object" }, { instanceOf: Object }],
        });

        if (this.api) this.api.data = data;

        return this;
    };

    TableJS.prototype.setDataset = function (dataset) {
        dataset = UTILITIES.validateVariable(dataset, {
            variableName: "setDataset.dataset",
            $and: [
                { typeOf: "object" },
                { instanceOf: Object },
                { execute: (data) => Array.isArray(data) },
            ],
        });

        this.dataset = UTILITIES.validateVariable(this.dataset, {
            variableName: "setDataset.(this)dataset",
            $transform: ({ rendering }) => ({ collection: dataset, rendering }),
            $fallback: () => dataset,
            $and: [
                { typeOf: "object" },
                { instanceOf: Object },
                { has: ["collection", "rendering"] },
            ],
        });

        return this;
    };

    TableJS.prototype.limit = function (value) {
        if (!this.api) this.api = {};

        return this;
    };

    TableJS.prototype.next = function () {
        return this;
    };

    TableJS.prototype.render = function (method) {
        console.log();

        switch (typeof method) {
            case "function":
                UTILITIES.toInitialize(this, method);
                break;
            default:
                UTILITIES.toInitialize(this, true);
                break;
        }
        return this;
    };

    window.addEventListener("DOMContentLoaded", function () {});

    // Check if noGlobal is undefined to avoid overwriting the global object
    if (typeof noGlobal === "undefined") {
        return TableJS;
    }

    // If noGlobal is defined, you can attach TableJS to the global object
    window.TableJS = TableJS;
    window.HttpRequest = HttpRequest;

    return TableJS;
});

import * as XLSX from "./xlsx.mjs";
import CLASS from "./class.js";
import VECTORS from "./vectors.js";
import REGEX from "./regex.js";
import DEFAULT from "./default.js";
import { HttpRequest, TableJSError } from "./module.js";

/**
 * Generates pagination items based on the provided row length and row limit.
 * Each pagination item represents a page with a specific limit of rows.
 *
 * @param {number} rowLength The total number of rows.
 * @param {number} rowLimit The maximum number of rows per page.
 * @returns {Array<Array<number>>} An array containing pagination items where each item is an array of row indices for a page.
 */
function createPaginationItems(rowLength, rowLimit) {
    const pageCount = Math.ceil(rowLength / rowLimit);
    return Array.from({ length: pageCount }, (_, pageIndex) => {
        const start = pageIndex * rowLimit;
        const end = Math.min(start + rowLimit, rowLength);
        return Array.from({ length: end - start }, (_, index) => start + index);
    });
}

/**
 * Creates a ceiling value for pagination based on the given number and array.
 * The ceiling value is the smallest value in the array that is greater than or equal to the given number.
 * If the given number is not a number or NaN, it is converted to a number.
 * If the array is not provided, it defaults to the DEFAULT.ITEMS array.
 *
 * @param {number|string} n The number to find the ceiling for.
 * @param {Array<number>} [array=DEFAULT.ITEMS] The array of numbers to search for the ceiling value.
 * @returns {Array<number>} An array containing numbers from the provided array up to the ceiling value.
 */
function createPaginationCeiling(n, array = []) {
    const number = isNaN(+n) ? null : +n;
    if (number === null) return array;

    const sortedArray = array.slice().sort((a, b) => a - b);
    const index = sortedArray.findIndex((item) => item >= number);
    return sortedArray.slice(0, index !== -1 ? index + 1 : array.length);
}

/**
 * Generates an SVG element based on the provided key.
 * @param {string} key - The key to retrieve SVG properties from VECTORS.
 * @throws {TableJSError} Throws an error if the key is not found in VECTORS.
 * @returns {SVGElement} - Returns the generated SVG element.
 */
function generateSVG(key) {
    let selector = key.toUpperCase();
    if (!(selector in VECTORS)) {
        throw new TableJSError(
            `generateSVG expects a valid key in svg's. check|error|view|cancel`
        );
    }
    let svgProps = VECTORS[selector];
    return renderSVG(svgProps);
}

function preInitialize(instance) {
    let { table, colvis, exportAs, paginate } = instance.elements;
    table = validateVariable(table, {
        variableName: "preInitialize.table",
        $and: [{ instanceOf: Element }, { typeOf: "object" }],
    });
    exportAs = validateVariable(exportAs, {
        variableName: "preInitialize.exportAs",
        $and: [
            { typeOf: "object" },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    colvis = validateVariable(colvis, {
        variableName: "preInitialize.colvis",
        $and: [
            { typeOf: "object" },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    if (colvis) {
        toColvis({ table, ...colvis });
    }
    if (table && table.sort) {
        toSort({ table, ...table.sort });
    }
    if (exportAs) {
        const { csv, print, excel } = exportAs;
        if (csv) {
            if (!csv.hasClickCSVEventListener) {
                csv.addEventListener("click", () => toCSV({ table, ...csv }));
                csv.hasClickCSVEventListener = true;
            }
        }
        if (print) {
            if (!print.hasClickPrintEventListener) {
                print.addEventListener("click", () =>
                    toPrint({ table, ...print })
                );
                print.hasClickPrintEventListener = true;
            }
        }
        if (excel) {
            if (!excel.hasClickExcelEventListener) {
                excel.addEventListener("click", () =>
                    toExcel({ table, ...excel })
                );
                excel.hasClickExcelEventListener = true;
            }
        }
    }
    if (paginate) {
        if (paginate.local) {
            const { limit, next, previous, search, filter } = paginate.local;
            if (limit) {
                limit.forEach((el) => {
                    if (!el.hasLocalChangeLimitEventListener) {
                        el.addEventListener("change", (e) => {
                            toLimit({
                                table,
                                limitSize: e.target.value,
                                ...el,
                                to: "local",
                            });
                        });
                        el.hasLocalChangeLimitEventListener = true;
                    }
                });
            }
            if (next) {
                next.forEach((el) => {
                    if (!el.hasLocalClickNextEventListener) {
                        el.addEventListener("click", (e) =>
                            toPaginate({ table, ...el, to: "local" })
                        );
                        el.hasLocalClickNextEventListener = true;
                    }
                });
            }
            if (previous) {
                previous.forEach((el) => {
                    if (!el.hasLocalClickPreviousEventListener) {
                        el.addEventListener("click", (e) =>
                            toPaginate({ table, ...el, to: "local" })
                        );
                        el.hasLocalClickPreviousEventListener = true;
                    }
                });
            }
            if (search) {
                if (!search.hasLocalKeypressSearchEventListener) {
                    search.forEach((el) => {
                        el.addEventListener("keypress", (e) => {
                            let searchValue = e.target.value;
                            let searchQuery = el.previousQuery;
                            if (
                                (e.key === "Enter" || e.keyCode === 13) &&
                                searchQuery !== searchValue
                            ) {
                                toSearch({
                                    table,
                                    keyword: searchValue,
                                    ...el,
                                    to: "local",
                                });
                                search.previousQuery = searchValue;
                            }
                        });
                        el.hasLocalKeypressSearchEventListener = true;

                        if (!el.hasLocalInputSearchEventListener) {
                            el.addEventListener("input", (e) => {
                                if (e.target.value.length === 0) {
                                    el.previousQuery = DEFAULT.SEARCH;
                                    toSearch({
                                        table,
                                        keyword: DEFAULT.SEARCH,
                                        ...el,
                                        to: "local",
                                    });
                                }
                            });
                            el.hasLocalInputSearchEventListener = true;
                        }
                    });
                }
            }
            if (filter) {
                filter.forEach((el) => {
                    if (!el.hasLocalFilterEventListener) {
                        el.addEventListener("change", (e) => {
                            toFilter({
                                table,
                                filters: {
                                    ...table.properties.filters,
                                    [e.target.id ?? e.target.name]:
                                        e.target.value,
                                },
                                ...el,
                                to: "local",
                            });
                        });
                        el.hasLocalFilterEventListener = true;
                    }
                });
            }
        }
        if (paginate.api) {
            const { limit, next, previous, search, filter } = paginate.api;
            if (limit) {
                limit.forEach((el) => {
                    if (!el.hasApiChangeLimitEventListener) {
                        el.addEventListener("change", (e) => {
                            toLimit({
                                table,
                                limitSize: e.target.value,
                                ...el,
                                instance,
                                to: "api",
                            });
                        });
                        el.hasApiChangeLimitEventListener = true;
                    }
                });
            }
            if (next) {
                next.forEach((el) => {
                    if (!el.hasApiClickNextEventListener) {
                        el.addEventListener("click", (e) =>
                            toPaginate({
                                table,
                                ...el,
                                as: "next",
                                instance,
                                to: "api",
                            })
                        );
                        el.hasApiClickNextEventListener = true;
                    }
                });
            }
            if (previous) {
                previous.forEach((el) => {
                    if (!el.hasApiClickPreviousEventListener) {
                        el.addEventListener("click", (e) =>
                            toPaginate({
                                table,
                                ...el,
                                as: "previous",
                                instance,
                                to: "api",
                            })
                        );
                        previous.hasApiClickPreviousEventListener = true;
                    }
                });
            }
            if (search) {
                search.forEach((el) => {
                    if (!el.hasApiKeypressSearchEventListener) {
                        el.addEventListener("keypress", (e) => {
                            let searchValue = e.target.value;
                            let searchQuery = e.target.previousQuery;
                            if (
                                (e.key === "Enter" || e.keyCode === 13) &&
                                searchQuery !== searchValue
                            ) {
                                toSearch({
                                    table,
                                    keyword: searchValue,
                                    ...el,
                                    instance,
                                    to: "api",
                                });
                                e.target.previousQuery = searchValue;
                            }
                        });
                        el.hasApiKeypressSearchEventListener = true;
                    }
                    if (!el.hasApiInputSearchEventListener) {
                        el.addEventListener("input", (e) => {
                            if (e.target.value.length === 0) {
                                e.target.previousQuery = DEFAULT.SEARCH;
                                toSearch({
                                    table,
                                    keyword: DEFAULT.SEARCH,
                                    ...el,
                                    instance,
                                    to: "api",
                                });
                            }
                        });
                        el.hasApiInputSearchEventListener = true;
                    }
                });
            }
        }
    }
}

function processPagination(data = {}, total_rows) {
    let { limit = DEFAULT.LIMIT, page = DEFAULT.PAGE } = data;
    page = toNumber(
        Math.min(Math.max(1, page), Math.round(total_rows / limit)),
        1
    );
    return { ...data, limit, page };
}
/**
 * Responds to changes in table properties by updating related properties.
 *
 * @param {string} property - The name of the property that changed.
 * @param {*} value - The new value of the property.
 * @returns {void}
 */
function propertiesListener({ elements, property, value }) {
    const { limit, search, filter } = Object.entries(elements.paginate).reduce(
        (acc, [, values]) => {
            for (const key in values) {
                if (values.hasOwnProperty(key)) {
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    acc[key].push(values[key]);
                }
            }
            return acc;
        },
        {}
    );

    if (localStorage.debug == "true")
        console.log(
            toConsoleText(
                `Table property ${property} changed into ${JSON.stringify(
                    value
                )}`,
                ["green", "bold"]
            )
        );

    switch (property) {
        case "limit":
        case "page":
            search.forEach((collection) => {
                collection.forEach((el) => {
                    el.value = DEFAULT.SEARCH;
                });
            });
            filter.forEach((collection) => {
                collection.forEach((el) => {
                    el.value = DEFAULT.SEARCH;
                });
            });
            break;
        case "sort":
            break;
        case "filter":
            break;
        case "search":
            // limit?.forEach((limiter) => (limiter.value = DEFAULT.LIMIT));
            break;
    }
}

function postInitialize(instance, isDisable = false) {
    let { elements } = instance;
    let { table, colvis, paginate } = elements;
    table = validateVariable(table, {
        variableName: "postInitialize.table",
        $and: [
            { instanceOf: Element },
            { typeOf: "object" },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    paginate = validateVariable(paginate, {
        variableName: "postInitialize.paginate",
        $and: [
            { typeOf: "object" },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    colvis = validateVariable(colvis, {
        variableName: "preInitialize.colvis",
        $and: [
            { typeOf: "object" },
            { instanceOf: Element },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    if (colvis) {
        toColvis({ table, ...colvis });
    }
    if (table && table.sort) {
        toSort({ table, ...table.sort });
    }
    if (paginate) {
        if (paginate.local) {
            const { limit, next, previous, search } = paginate.local;
            if (limit) {
                limit.forEach((el) => {
                    el.disabled = isDisable;
                    toLimit({
                        table,
                        limitSize: table.properties.limit,
                        ...el,
                        to: "local",
                        instance,
                    });
                });
            }
            if (next) {
                next.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
            if (previous) {
                previous.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
            if (search) {
                search.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
        }
        if (paginate.api) {
            const { limit, next, previous, search } = paginate.api;
            if (limit) {
                limit.forEach((el) => {
                    el.disabled = isDisable;
                    toLimit({
                        table,
                        limitSize: table.properties.limit,
                        ...el,
                        to: "local",
                        instance,
                    });
                });
            }
            if (next) {
                next.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
            if (previous) {
                previous.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
            if (search) {
                search.forEach((el) => {
                    el.disabled = isDisable;
                });
            }
        }
    }
}

/**
 * Renders an SVG element based on the provided data.
 * @param {object} data - The data object containing SVG attributes and path data.
 * @returns {SVGElement} - Returns the rendered SVG element.
 */
function renderSVG(data) {
    let vectors = validateVariable(data, { type: "object" });
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.entries(vectors.svg).forEach(([attr, value]) => {
        svg.setAttribute(attr, value);
    });
    vectors.path.forEach((pathData) => {
        let path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );
        Object.entries(pathData).forEach(([attr, value]) => {
            path.setAttribute(attr, value);
        });
        svg.appendChild(path);
    });
    return svg;
}

/**
 * Converts a string to camelCase.
 * @param {string} str - The string to convert.
 * @returns {string} - The camelCase string.
 */
function toCamelCase(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
}

/**
 * Initializes column visibility toggling for a table.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector where column visibility toggling will be applied.
 * @param {HTMLElement|String} options.element - The HTML element or its selector representing the container for column visibility toggling UI.
 * @param {Array} [options.exclude=[]] - The list of columns to exclude from the column visibility toggling.
 * @param {Array} [options.hide=[]] - The initial list of columns to hide.
 */
function toColvis({ table, element, exclude = [], hide = [] }) {
    table = validateVariable(table, {
        variableName: "toColvis.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    element = validateVariable(element, {
        variableName: "toColvis.element",
        $transform: (el) => validateElement(el),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toColvis.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });
    hide = validateVariable(hide, {
        variableName: "toColvis.hide",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });

    element.innerHTML = "";

    let ul = element?.querySelector("ul");

    if (!ul) {
        ul = document.createElement("ul");
        element?.prepend(ul);
    }

    ul.classList.add(CLASS.COLVIS.LIST);

    let ths = table.querySelectorAll("th");
    let trs = table.querySelectorAll(`tbody tr`);

    let cols = Array.from(ths);
    let rows = Array.from(trs);

    cols?.forEach((th) => {
        if (
            exclude.some((item) => {
                switch (typeof item) {
                    case "string":
                        return th.matches(item);
                    case "number":
                        return item === th.cellIndex;
                    default:
                        return false;
                }
            })
        ) {
            return;
        }

        let thTextContent = th.textContent.trim();
        let thTextNode = document.createTextNode(thTextContent);
        let span = document.createElement("span");
        let columnIndex = th.cellIndex;
        let li = document.createElement("li");
        let div = document.createElement("div");
        let svg = generateSVG("check");

        div.classList.add(CLASS.COLVIS.CONTAINER);
        li.classList.add(CLASS.COLVIS.LIST_ITEM);
        svg.classList.add(CLASS.COLVIS.SVG);

        if (
            hide.some((item) => {
                switch (typeof item) {
                    case "string":
                        return th.matches(item);
                    case "number":
                        return item === th.cellIndex;
                    default:
                        return false;
                }
            })
        ) {
            th.classList.add(CLASS.TH.HIDDEN);
            svg.style.visibility = "hidden";
            rows.forEach((row) => {
                let tds = row.children[columnIndex];
                tds.classList.add(CLASS.TD.HIDDEN);
                tds.classList.remove(CLASS.TD.VISIBLE);
            });
        }

        li.appendChild(svg);
        span.appendChild(thTextNode);
        li.appendChild(span);

        li.addEventListener("click", () => {
            let isThVisible = validateVisibility(th);
            if (isThVisible) {
                th.classList.add(CLASS.TH.HIDDEN);
                th.classList.remove(CLASS.TH.VISIBLE);
                element.hide.push(columnIndex);
            } else {
                th.classList.add(CLASS.TH.VISIBLE);
                th.classList.remove(CLASS.TH.HIDDEN);
                element.hide = element.hide.filter(
                    (item) => item !== columnIndex
                );
            }
            rows.forEach((row) => {
                let currentRow = row.children[columnIndex];
                let isRowVisible = validateVisibility(currentRow);
                if (isRowVisible) {
                    currentRow.classList.add(CLASS.TD.HIDDEN);
                    currentRow.classList.remove(CLASS.TD.VISIBLE);
                } else {
                    currentRow.classList.add(CLASS.TD.VISIBLE);
                    currentRow.classList.remove(CLASS.TD.HIDDEN);
                }
            });
            svg.style.visibility = isThVisible ? "hidden" : "visible";
        });

        ul.appendChild(li);
    });
}

/**
 * Applies styling to a given text for console output.
 * @param {string} text - The text to style.
 * @param {string|string[]} styling - The style(s) to apply. Can be a single style or an array of styles.
 * Possible styles: "bold", "italic", "underline", "red", "green", "yellow", "blue", "magenta", "cyan", "white".
 * @returns {string} - The styled text.
 */
function toConsoleText(text, styling) {
    if (!styling) {
        return text;
    }

    /**
     * Applies a specific style to the given text.
     * @param {string} text - The text to style.
     * @param {string} style - The style to apply.
     * @returns {string} - The styled text.
     */
    function applyStyle(text, style) {
        switch (style) {
            case "bold":
                return `\x1b[1m${text}\x1b[0m`;
            case "italic":
                return `\x1b[3m${text}\x1b[0m`;
            case "underline":
                return `\x1b[4m${text}\x1b[0m`;
            case "uppercase":
                return text.toUpperCase();
            case "lowercase":
                return text.toLowerCase();
            case "red":
                return `\x1b[31m${text}\x1b[0m`;
            case "green":
                return `\x1b[32m${text}\x1b[0m`;
            case "yellow":
                return `\x1b[33m${text}\x1b[0m`;
            case "blue":
                return `\x1b[34m${text}\x1b[0m`;
            case "magenta":
                return `\x1b[35m${text}\x1b[0m`;
            case "cyan":
                return `\x1b[36m${text}\x1b[0m`;
            case "white":
                return `\x1b[37m${text}\x1b[0m`;
            default:
                return text;
        }
    }

    if (Array.isArray(styling)) {
        return styling.reduce(
            (formattedText, style) => applyStyle(formattedText, style),
            text
        );
    } else {
        return applyStyle(text, styling);
    }
}

/**
 * Converts the specified table data into a CSV file for download.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector containing the data to convert.
 * @param {Boolean} [options.headers=true] - Specifies whether to include table headers in the CSV file.
 * @param {Array} [options.exclude=[]] - An array of elements to exclude from the CSV conversion. Each element can be a selector string or a column index (number).
 * @param {String|Number} [options.filename="export"] - The filename for the downloaded CSV file.
 */
function toCSV({
    table,
    headers = true,
    exclude = [],
    filename = "export",
    separator = ",",
}) {
    table = validateVariable(table, {
        variableName: "toCSV.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    headers = validateVariable(headers, {
        variableName: "toCSV.headers",
        $or: [
            { typeOf: "boolean" },
            { strictEquals: true },
            { strictEquals: false },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toCSV.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });
    filename = validateVariable(filename, {
        variableName: "toCSV.filename",
        $or: [{ typeOf: "string" }, { typeOf: "number" }],
    });
    separator = validateVariable(separator, {
        variableName: "toCSV.separator",
        $or: [{ typeOf: "string" }, { in: [",", ";"] }],
    });
    let rows = Array.from(
        table.querySelectorAll(`tr:not(.${CLASS.TR.NO_DATA})`)
    );

    if (!headers && rows[0]?.querySelectorAll("td").length > 1) {
        rows.shift();
    }

    let lines = rows
        .filter((row) => validateVisibility(row))
        .map(function (row) {
            return Array.from(row.children)
                .reduce(function (data, cell) {
                    let th = table.querySelector(
                        `thead th:nth-child(${cell.cellIndex + 1})`
                    );
                    let isThVisible = validateVisibility(th);

                    let classInExcludeArray = exclude?.some((cls) =>
                        Array.from(th.classList).includes(cls)
                    );
                    let matchedInExcludeArray = exclude?.some(
                        (item) => typeof item === "string" && th.matches(item)
                    );
                    let indexInExcludeArray = exclude?.some(
                        (item) =>
                            typeof item === "number" && th.cellIndex === item
                    );

                    if (
                        th &&
                        isThVisible &&
                        !(
                            classInExcludeArray ||
                            matchedInExcludeArray ||
                            indexInExcludeArray
                        )
                    ) {
                        let textContent = cell.textContent.trim();
                        textContent = textContent.replace(/"/g, `""`);
                        textContent = /[",\n"]/.test(textContent)
                            ? `"${textContent}"`
                            : textContent;
                        data.push(textContent);
                    }

                    return data;
                }, [])
                .join(separator);
        });

    let data = Array.from(lines.join("\n"));
    let blob = new Blob(data, { type: "text/csv" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");

    if (url) {
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 500);
    }
}

/**
 * Exports the specified table to an Excel file, excluding specified elements.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector to export.
 * @param {Array} [options.exclude=[]] - An array of elements to exclude from the export. Each element can be a selector string or a column index (number).
 * @param {String} [options.filename="export.xlsx"] - The filename for the exported Excel file.
 */
function toExcel({
    table,
    exclude = [],
    filename = "export",
    sheet = "Sheet1",
}) {
    table = validateVariable(table, {
        variableName: "toExcel.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toExcel.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });
    filename = validateVariable(filename, {
        variableName: "toExcel.filename",
        $transform: (name) => `${name}.xlsx`,
        $or: [{ typeOf: "string" }, { typeOf: "number" }],
    });
    sheet = validateVariable(sheet, {
        variableName: "toExcel.sheet",
        $or: [{ typeOf: "string" }, { typeOf: "number" }],
    });
    let trs = table.querySelectorAll(`tr:not(.${CLASS.TR.NO_DATA})`);
    let ths = table.querySelectorAll("thead th");

    let cols = Array.from(ths);
    let rows = Array.from(trs);

    let node = document.createElement("table");
    let nodeThead = document.createElement("thead");
    let nodeTbody = document.createElement("tbody");

    let excludeIndex = cols.reduce((acc, th) => {
        if (
            exclude.some((item) => {
                switch (typeof item) {
                    case "string":
                        return (
                            th.matches(item) ||
                            Array.from(th.classList).includes(item)
                        );
                    case "number":
                        return item === th.cellIndex;
                    default:
                        return false;
                }
            })
        ) {
            acc.push(th.cellIndex);
        }
        return acc;
    }, []);

    rows.filter((row) => validateVisibility(row)).forEach((row) => {
        let nodeRow = document.createElement("tr");
        let tds = Array.from(row.children);

        tds.filter(
            (td) =>
                validateVisibility(td) && !excludeIndex.includes(td.cellIndex)
        ).forEach((td) => {
            nodeRow.appendChild(td.cloneNode(true));
        });

        if (
            nodeRow.firstChild &&
            nodeRow.firstChild.tagName.toLowerCase() === "th"
        ) {
            nodeThead.appendChild(nodeRow);
        } else {
            nodeTbody.appendChild(nodeRow);
        }
    });

    node.appendChild(nodeThead);
    node.appendChild(nodeTbody);

    let worksheet = XLSX.utils.table_to_sheet(node);
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
    XLSX.writeFile(workbook, filename);
}

function toFilter({
    table,
    to = "local",
    element,
    filters,
    output,
    exclude = [],
    instance,
}) {
    table = validateVariable(table, {
        variableName: "toFilter.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    element = validateVariable(element, {
        variableName: "toFilter.element",
        $transform: (el) => validateElement(el),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    filters = validateVariable(filters, {
        variableName: "toFilter.filters",
        $and: [
            { typeOf: "object" },
            { execute: (object) => !Array.isArray(object) },
        ],
    });
    output = validateVariable(output, {
        variableName: "toFilter.output",
        $or: [
            { typeOf: "function" },
            { typeOf: "string" },
            { instanceOf: Element },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toFilter.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });

    table.properties.filters = filters;

    switch (to) {
        case "local":
            let ths = table.querySelectorAll("thead th");
            let tbody = table.querySelector("tbody");
            let trs = tbody.querySelectorAll(`tr`);
            let rows = Array.from(trs);
            let cols = Array.from(ths);
            let rowLength = rows.length;

            let dummyTds = document.createElement("td");
            dummyTds.classList.add(CLASS.TD.BASE);
            dummyTds.colSpan = cols.length;
            dummyTds.textContent = DEFAULT.NO_RESULT_MESSAGE;

            let dummy = document.createElement("tr");
            dummy.classList.add(
                CLASS.TR.DUMMY,
                CLASS.TR.BASE,
                CLASS.TR.VISIBLE
            );
            dummy.role = "row";

            dummy.appendChild(dummyTds);

            let excludeIndex = cols.reduce((acc, th) => {
                if (
                    exclude.some((item) => {
                        switch (typeof item) {
                            case "string":
                                return (
                                    th.matches(item) ||
                                    Array.from(th.classList).includes(item)
                                );
                            case "number":
                                return item === th.cellIndex;
                            default:
                                return false;
                        }
                    })
                ) {
                    acc.push(th.cellIndex);
                }
                return acc;
            }, []);

            let searchKeyword = Object.values(filters)
                .filter(Boolean)
                .map((filter) => filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

            let searchPatterns = searchKeyword.map(
                (keyword) => new RegExp(keyword, "gi")
            ); 

            let result = rows.reduce((searched, row) => {
                let children = row.children;
                let tds = Array.from(children);
                let textContents = tds
                    .filter(
                        (td) =>
                            !excludeIndex.includes(td.cellIndex) &&
                            validateVisibility(td)
                    )
                    .map((td) => td.textContent);

                let isSearched = searchPatterns.every((pattern) =>
                    textContents.some((text) => {
                        const refresh = new RegExp(pattern);
                        return refresh.test(text);
                    })
                );

                let isDummy = row.classList.contains(CLASS.TR.DUMMY);
                row.classList.add(CLASS.TR.BASE);

                if (isSearched || isDummy) {
                    row.classList.add(CLASS.TR.VISIBLE);
                    row.classList.remove(CLASS.TR.HIDDEN);
                    if (isSearched) searched++;
                } else {
                    row.classList.add(CLASS.TR.HIDDEN);
                    row.classList.remove(CLASS.TR.VISIBLE);
                }

                return searched;
            }, 0);

            let dum = tbody.querySelector(`.${CLASS.TR.DUMMY}`);

            if (result < 1) {
                if (!dum) {
                    tbody.appendChild(dummy);
                }
            } else {
                dum?.remove();
            }

            let paginationInfo = {
                current_page: 1,
                total_page: 1,
                start_item: toNumber(Math.min(result, 1)),
                end_item: toNumber(dum ? Math.max(0, result - 1) : result),
                total_rows: toNumber(dum ? rowLength - 1 : rowLength),
            };

            if (typeof output !== "undefined") {
                let outputType = typeof output;
                if (outputType === "string" || output instanceof Element) {
                    let placeholder = validateElement(output);
                    placeholder.textContent = `${paginationInfo.current_page} of ${paginationInfo.total_page}`;
                } else if (outputType === "function") {
                    output(paginationInfo);
                }
            }
            break;
        case "api":
            // if (instance) {
            //     if (instance.api) {
            //         if (!instance.api.data) {
            //             instance.api.data = {};
            //         }
            //         instance.api.data.search = keyword;
            //         delete instance.api.data.limit;
            //         delete instance.api.data.page;
            //         if (keyword === "") {
            //             delete instance.api.data.search;
            //         }
            //     }
            //     toInitialize(instance, instance?.api?.rendering);
            // }
            break;
    }
}

function toNumber(value, fallback = 0) {
    try {
        return !value || isNaN(+value) ? fallback : +value;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Sets the pagination limit for displaying rows in a table.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector where pagination limit will be applied.
 * @param {HTMLElement|String} options.element - The HTML element or its selector representing the pagination limit selector.
 * @param {Number} [options.limitSize=DEFAULT.LIMIT] - The initial pagination limit size.
 * @param {Array} [options.items=DEFAULT.ITEMS] - The list of pagination limit options.
 * @param {String} [options.to] - The target scope where the pagination limit will be applied. Options: "local" or "api".
 * @param {Array} [options.exclude=[]] - The list of elements to exclude from the pagination limit.
 * @param {Function|String|HTMLElement} [options.output] - The output element or function to display pagination information.
 */
function toLimit({
    table,
    element,
    limitSize = DEFAULT.LIMIT,
    items = DEFAULT.ITEMS,
    to = "local",
    exclude = [],
    output,
    instance,
}) {
    table = validateVariable(table, {
        variableName: "toLimit.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    element = validateVariable(element, {
        variableName: "toLimit.element",
        $transform: (el) => validateElement(el),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toLimit.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });
    to = validateVariable(to, {
        variableName: "toLimit.to",
        $and: [{ typeOf: "string" }, { in: ["local", "api"] }],
    });
    items = validateVariable(items, {
        variableName: "toLimit.items",
        $and: [
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every(
                        (items) =>
                            typeof items === "number" || items === DEFAULT.LIMIT
                    ),
            },
        ],
    });
    limitSize = validateVariable(limitSize, {
        variableName: "toLimit.limitSize",
        $fallback: (n) => Number(n),
        $and: [{ typeOf: "string" }, { strictEquals: DEFAULT.LIMIT }],
    });
    output = validateVariable(output, {
        variableName: "toLimit.output",
        $or: [
            { typeOf: "function" },
            { typeOf: "string" },
            { instanceOf: Element },
        ],
    });

    let pagingLength = Math.round(table.properties.total_rows / limitSize);
    let currentPage = Math.min(
        Math.max(1, table.properties.page),
        pagingLength
    );
    table.properties.limit = limitSize;
    table.properties.page =
        limitSize === DEFAULT.LIMIT
            ? DEFAULT.PAGE
            : isNaN(currentPage)
            ? table.properties.page
            : currentPage;

    let applyLimitation = () => {
        let trs = table.querySelectorAll(`tbody tr:not(.${CLASS.TR.NO_DATA})`);
        let rows = Array.from(trs);
        let rowLength = rows.length;
        let limitCount = validateVariable(limitSize, {
            $transform: rowLength,
            $fallback: (n) => {
                let number = Number(n);
                return number >= rowLength ? rowLength : number;
            },
            $and: [{ typeOf: "string" }, { strictEquals: DEFAULT.LIMIT }],
        });

        let totalLength = table.properties.total_rows ?? rowLength;

        if (rowLength > 0) {
            element.innerHTML = "";
            let optionsCollection = new Set(
                [...items, ...DEFAULT.ITEMS].toSorted((a, b) => a - b)
            );
            let optionsArray = Array.from(optionsCollection);
            let optionsItems = createPaginationCeiling(
                totalLength,
                optionsArray
            );
            optionsItems.forEach((item) => {
                let option = document.createElement("option");
                option.value = item;
                option.textContent = item === DEFAULT.LIMIT ? "All" : item;
                element.appendChild(option);

                element.value = items.includes(limitSize)
                    ? limitSize
                    : limitCount;
            });
        }

        let pagination = createPaginationItems(totalLength, limitCount);
        let paginationLength = toNumber(pagingLength, pagination.length);

        let currentPage = Math.min(
            Math.max(1, table.properties.page),
            paginationLength
        );

        table.properties.page = currentPage;

        let paginationItems = pagination[currentPage - 1] || [];
        let paginationItemsLength = toNumber(paginationItems.length);

        let paginationInfo = {
            current_page: toNumber(currentPage),
            total_page: toNumber(paginationLength),
            start_item: toNumber(paginationItems[0] + 1),
            end_item: toNumber(paginationItems[paginationItemsLength - 1] + 1),
            total_rows: toNumber(totalLength),
        };

        if (typeof output !== "undefined") {
            let outputType = typeof output;
            if (outputType === "string" || output instanceof Element) {
                let placeholder = validateElement(output);
                placeholder.textContent = `${paginationInfo.current_page} of ${paginationInfo.total_page}`;
            } else if (outputType === "function") {
                output(paginationInfo);
            }
        }

        let offset = (currentPage - 1) * limitCount;

        rows.forEach((row, index) => {
            row.classList.add(CLASS.TR.BASE);
            if (row.index === undefined || row.index === null) {
                row.index = index + offset;
                row.dataset.index = index + offset;
            }
            if (row.classList.contains(CLASS.TR.DUMMY)) {
                row.remove();
            }
            if (row.classList.contains(CLASS.TR.NO_DATA)) {
                return;
            }
            if (paginationItems.includes(row.index)) {
                row.classList.add(CLASS.TR.VISIBLE);
                row.classList.remove(CLASS.TR.HIDDEN);
            } else {
                row.classList.add(CLASS.TR.HIDDEN);
                row.classList.remove(CLASS.TR.VISIBLE);
            }
        });
    };

    switch (to) {
        case "local":
            applyLimitation();
            break;
        case "api":
            if (instance) {
                if (instance.api) {
                    if (!instance.api.data) {
                        instance.api.data = {};
                    }
                    instance.api.data = processPagination(
                        {
                            ...instance.api.data,
                            page: toNumber(table.properties.page, 1),
                            limit: table.properties.limit,
                        },
                        table.properties.total_rows
                    );
                    delete instance.api.data.search;
                    if (limitSize === DEFAULT.LIMIT) {
                        table.properties.page = DEFAULT.PAGE;
                        delete instance.api.data.page;
                    }
                }
                toInitialize(instance, instance?.api?.rendering);
                applyLimitation();
            }
            break;
    }
}

/**
 * Paginates the table based on the specified parameters.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector.
 * @param {String} options.as - The action to perform ('next' or 'previous').
 * @param {String} [options.to='local'] - The target of the pagination ('local' or 'api').
 * @param {Function|String|HTMLElement} [options.output] - The output location for pagination information.
 */
function toPaginate({ table, as, to = "local", output, instance }) {
    table = validateVariable(table, {
        variableName: "toPaginate.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    as = validateVariable(as, {
        variableName: "toPaginate.as",
        $and: [{ typeOf: "string" }, { in: ["next", "previous"] }],
    });
    to = validateVariable(to, {
        variableName: "toPaginate.to",
        $and: [{ typeOf: "string" }, { in: ["local", "api"] }],
    });
    output = validateVariable(output, {
        variableName: "toPaginate.output",
        $or: [
            { typeOf: "function" },
            { typeOf: "string" },
            { instanceOf: Element },
        ],
    });

    let trs = table.querySelectorAll(`tbody tr:not(.${CLASS.TR.NO_DATA})`);
    let rows = Array.from(trs);
    let rowLength = rows.length;

    const {
        limit = DEFAULT.LIMIT,
        page = DEFAULT.PAGE,
        total_rows: totalLength = rowLength,
    } = table.properties;
    table.properties.search = DEFAULT.SEARCH;

    let limitCount = validateVariable(limit, {
        variableName: "toSort.local.limitCount",
        $transform: rowLength,
        $fallback: (n) => {
            let number = Number(n);
            return number >= rowLength ? rowLength : number;
        },
        $and: [{ typeOf: "string" }, { strictEquals: DEFAULT.LIMIT }],
    });

    let pagingLength = Math.round(table.properties.total_rows / limitCount);
    let pagination = createPaginationItems(totalLength, limitCount);
    let paginationLength = pagingLength || pagination.length;

    switch (as) {
        case "next":
            if (page > 0 && page < paginationLength) {
                table.properties.page = Math.min(page + 1, paginationLength);
            }
            break;
        case "previous":
            if (page > 0 && page <= paginationLength) {
                table.properties.page = Math.max(1, page - 1);
            }
            break;
    }

    let paginationItems = pagination[table.properties.page - 1];
    let paginationItemsLength = paginationItems?.length;

    let paginationInfo = {
        current_page: toNumber(table.properties.page),
        total_page: toNumber(paginationLength),
        start_item: toNumber(paginationItems[0] + 1),
        end_item: toNumber(paginationItems[paginationItemsLength - 1] + 1),
        total_rows: toNumber(totalLength),
    };

    if (typeof output !== "undefined") {
        let outputType = typeof output;
        if (outputType === "string" || output instanceof Element) {
            let placeholder = validateElement(output);
            placeholder.textContent = `${paginationInfo.current_page} of ${paginationInfo.total_page}`;
        } else if (outputType === "function") {
            output(paginationInfo);
        }
    }

    switch (to) {
        case "local":
            rows.forEach((row) => {
                if (
                    paginationItems.includes(row.index) ||
                    limit === DEFAULT.LIMIT
                ) {
                    row.classList.add(CLASS.TR.VISIBLE);
                    row.classList.remove(CLASS.TR.HIDDEN);
                } else {
                    row.classList.add(CLASS.TR.HIDDEN);
                    row.classList.remove(CLASS.TR.VISIBLE);
                }
            });
            break;
        case "api":
            if (instance) {
                if (instance.api) {
                    if (!instance.api.data) {
                        instance.api.data = {};
                    }
                    instance.api.data = processPagination(
                        {
                            ...instance.api.data,
                            page: toNumber(table.properties.page, 1),
                            limit: table.properties.limit,
                        },
                        table.properties.total_rows
                    );
                    delete instance.api.data.search;
                }
                toInitialize(instance, instance?.api?.rendering);
            }
            break;
    }
}

function toInitialize(instance, render) {
    let { api, dataset, elements } = instance;

    api = validateVariable(api, {
        variableName: "toInitialize.api",
        $fallback: (object) => ({
            headers: {
                "Content-Type": "application/json",
            },
            async: true,
            timeout: DEFAULT.TIMEOUT,
            method: DEFAULT.METHOD,
            ...object,
        }),
        $and: [
            { typeOf: "object" },
            { has: ["headers", "async", "timeout", "data", "url"] },
        ],
    });

    elements = validateVariable(elements, {
        variableName: "toInitialize.elements",
        $and: [{ typeOf: "object" }, { has: ["table"] }],
    });
    if (
        (api && !!api.url && !api.init) ||
        (api && !!api.url && (!!render || !api.init))
    ) {
        const ajax = new HttpRequest({
            ...api,
            beforeSend: () => preInitialize(instance),
            afterSend: () =>
                postInitialize(instance, api.init && !(api.init && render)),
            success: (data) => {
                switch (typeof api.rendering) {
                    case "function":
                        api.rendering({
                            data,
                            table: elements.table,
                            instance,
                        });
                        return;
                    case "object":
                        if (!Array.isArray(api.rendering)) {
                            let {
                                target,
                                method = toRender,
                                output,
                            } = api?.rendering;
                            if (
                                (typeof target === "string" ||
                                    typeof target === "number") &&
                                typeof method === "function"
                            ) {
                                let {
                                    [target]: renderData = [],
                                    total_rows,
                                    ...outputData
                                } = data;
                                elements.table.properties.total_rows =
                                    total_rows || renderData?.length;

                                let renderType = typeof renderData;
                                if (renderType !== "object") {
                                    throw new TableJSError(
                                        `toRender.data[${JSON.stringify(
                                            target
                                        )}] with a value ${JSON.stringify(
                                            renderData
                                        )}, and typeof '${renderType}' is invalid, it must be an Array[] or an Object literal '{}'`
                                    );
                                }

                                if (typeof render === "function") {
                                    render({
                                        data: renderData,
                                        table: elements.table,
                                        instance,
                                    });
                                } else if (typeof data === "object") {
                                    method({
                                        data: renderData,
                                        table: elements.table,
                                        instance,
                                    });
                                }

                                if (typeof output === "function") {
                                    output({ total_rows, ...outputData });
                                }
                            }
                        }
                        return;
                    default:
                        toRender({ data, table: elements.table, instance });
                        return;
                }
            },
            error: (error) => {
                throw new TableJSError(
                    `ƒ 'toInitialize' triggers: \n\n${error}`
                );
            },
        });
        ajax.request();
    } else if (dataset) {
        dataset = UTILITIES.validateVariable(dataset, {
            variableName: "toInitialize.dataset",
            $transform: (data) => ({ data, table: elements.table, instance }),
            $fallback: ({ collection, rendering }) => ({
                data: collection,
                rendering,
                table: elements.table,
                instance,
            }),
            $and: [
                { typeOf: "object" },
                { instanceOf: Object },
                { execute: (data) => Array.isArray(data) },
            ],
        });

        preInitialize(instance);
        if (typeof render === "function") {
            render(dataset);
        } else if (
            dataset.rendering &&
            typeof dataset.rendering === "function"
        ) {
            render = dataset.rendering;
            delete dataset.rendering;
            render(dataset);
        } else {
            toRender(dataset);
        }
        postInitialize(instance);
    } else {
        preInitialize(instance);
        postInitialize(instance);
    }
    return instance;
}

/**
 * Prints the specified table, excluding specified elements.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector to print.
 * @param {Array} [options.exclude=[]] - An array of elements to exclude from printing. Each element can be a selector string or a column index (number).
 */
function toPrint({ table, exclude = [] }) {
    table = validateVariable(table, {
        variableName: "toPrint.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toPrint.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });

    let trs = table.querySelectorAll(`tr:not(.${CLASS.TR.NO_DATA})`);
    let ths = table.querySelectorAll("thead th");

    let rows = Array.from(trs);
    let cols = Array.from(ths);

    let node = document.createElement("table");
    let nodeThead = document.createElement("thead");
    let nodeTbody = document.createElement("tbody");

    let excludeIndex = cols.reduce((acc, th) => {
        if (
            exclude.some((item) => {
                switch (typeof item) {
                    case "string":
                        return (
                            th.matches(item) ||
                            Array.from(th.classList).includes(item)
                        );
                    case "number":
                        return item === th.cellIndex;
                    default:
                        return false;
                }
            })
        ) {
            acc.push(th.cellIndex);
        }
        return acc;
    }, []);

    rows.filter((row) => validateVisibility(row)).forEach((row) => {
        let nodeRow = document.createElement("tr");
        let tds = Array.from(row.children);

        tds.filter(
            (td) =>
                validateVisibility(td) && !excludeIndex.includes(td.cellIndex)
        ).forEach((td) => {
            nodeRow.appendChild(td.cloneNode(true));
        });

        if (
            nodeRow.firstChild &&
            nodeRow.firstChild.tagName.toLowerCase() === "th"
        ) {
            nodeThead.appendChild(nodeRow);
        } else {
            nodeTbody.appendChild(nodeRow);
        }
    });

    node.appendChild(nodeThead);
    node.appendChild(nodeTbody);

    let frame = document.createElement("iframe");
    let frameId = "tjs-print-window";
    let previousIframe = document.getElementById(frameId);

    if (previousIframe) {
        previousIframe.remove();
    }

    frame.width = "0";
    frame.height = "0";
    frame.src = "about:blank";
    frame.id = frameId;

    frame.onload = () => {
        var doc = frame.contentWindow.document;
        doc.open();
        doc.write("<!DOCTYPE html><html><head><title>Print</title>");
        // Include styles from the parent document
        var styles = document.head.querySelectorAll(
            "style, link[rel='stylesheet']"
        );
        styles.forEach((style) => {
            doc.write(style.outerHTML);
        });
        doc.write("</head><body>");
        doc.write("<div>" + node.outerHTML + "</div>");
        doc.write("</body></html>");
        doc.close();

        frame.contentWindow.focus();
        frame.contentWindow.print();
    };

    document.body.appendChild(frame);
}

/**
 * Renders data into a table element.
 * @function toRender
 * @param {Object|Array} data - The data to render into the table. Can be an object or an array of objects.
 * @param {HTMLElement|string} table - The table element or its selector where the data will be rendered.
 * @throws {TableJSError} Throws a TableJSError if rendering fails.
 */
function toRender({ data, table, instance }) {
    table = validateVariable(table, {
        variableName: "toRender.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    data = validateVariable(data, {
        variableName: "toRender.data",
        $and: [{ typeOf: "object" }, { instanceOf: Object }],
    });
    try {
        if (data && (data.length < 1 || Object.keys(data).length < 1)) {
            return;
        }
        table.innerHTML = "";
        table.classList.add(CLASS.TABLE);
        let thead = table.querySelector("thead");
        if (!thead) {
            thead = document.createElement("thead");
            table.appendChild(thead);
        }
        let tbody = table.querySelector("tbody");
        if (!tbody) {
            tbody = document.createElement("tbody");
            table.appendChild(tbody);
        }
        if (Array.isArray(data)) {
            if (data.length > 0) {
                let headerRow = document.createElement("tr");
                headerRow.classList.add(CLASS.TR.BASE, CLASS.TR.VISIBLE);
                // Extract keys from the first object in data array and store them in an array
                let keys = Object.keys(data[0]);
                // Create table headers using the extracted keys
                keys.forEach((key) => {
                    let headerCell = document.createElement("th");
                    headerCell.classList.add(CLASS.TH.BASE, CLASS.TH.VISIBLE);
                    headerCell.textContent = key
                        .toUpperCase()
                        .replace(/[_]{1}|[ ]{2}/g, " ");
                    headerRow.appendChild(headerCell);
                });
                thead.appendChild(headerRow);

                const tbodyFragment = new DocumentFragment();
                // Populate table body with data
                data.forEach((item, index) => {
                    let row = document.createElement("tr");
                    if (row.index === undefined || row.index === null) {
                        row.dataset.index = index;
                        row.index = index;
                    }
                    keys.forEach((key) => {
                        let cell = document.createElement("td");
                        cell.classList.add(CLASS.TD.BASE, CLASS.TD.VISIBLE);
                        cell.textContent =
                            item[key] !== undefined ? item[key] : ""; // Handle missing keys
                        row.appendChild(cell);
                    });
                    tbodyFragment.appendChild(row);
                });
                tbody.appendChild(tbodyFragment);
            }
        } else if (typeof data === "object") {
            let headerRow = document.createElement("tr");
            headerRow.classList.add(CLASS.TR.BASE, CLASS.TR.VISIBLE);
            Object.keys(data).forEach((key) => {
                let headerCell = document.createElement("th");
                headerCell.classList.add(CLASS.TH.BASE, CLASS.TH.VISIBLE);
                // headerCell.textContent = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                headerCell.textContent = key
                    .replace(/[a-z]/g, (str) => str.toUpperCase())
                    .replace(/[_]{1}|[ ]{2}/g, " ");
                headerRow.appendChild(headerCell);
            });
            thead.appendChild(headerRow);
            let row = document.createElement("tr");
            Object.values(data).forEach((value) => {
                let cell = document.createElement("td");
                cell.classList.add(CLASS.TD.BASE, CLASS.TD.VISIBLE);
                cell.textContent = value;
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        }
    } catch (e) {
        throw new TableJSError(`toRender: Rendering failed, ${e.message}`);
    }

    return instance;
}

/**
 * Searches for a keyword within a table or specified element and updates the visibility of matching rows.
 *
 * @param {object} options - An object containing search parameters.
 * @param {HTMLElement|object|string} options.table - The table element or object with a proxy property representing the table.
 * @param {string} [options.to="local"] - The scope of the search ("local" for within the table or "api" for an external API).
 * @param {HTMLElement|object|string} options.element - The specific element to search within (applicable when `to` is "local").
 * @param {string} options.keyword - The keyword to search for within the table.
 * @param {function|string|HTMLElement} options.output - The output destination for search results.
 * @param {Array<number|string>} [options.exclude=[]] - An array of column indices or CSS selectors to exclude from the search.
 * @returns {void}
 */
function toSearch({
    table,
    to = "local",
    element,
    keyword,
    output,
    exclude = [],
    instance,
}) {
    table = validateVariable(table, {
        variableName: "toSearch.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    element = validateVariable(element, {
        variableName: "toSearch.element",
        $transform: (el) => validateElement(el),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    keyword = validateVariable(keyword, {
        variableName: "toSearch.keyword",
        $and: [{ typeOf: "string" }],
    });
    output = validateVariable(output, {
        variableName: "toSearch.output",
        $or: [
            { typeOf: "function" },
            { typeOf: "string" },
            { instanceOf: Element },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toSearch.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });

    table.properties.search = keyword;
    table.properties.limit = DEFAULT.LIMIT;
    table.properties.page = DEFAULT.PAGE;

    switch (to) {
        case "local":
            let ths = table.querySelectorAll("thead th");
            let tbody = table.querySelector("tbody");
            let trs = tbody.querySelectorAll(`tr`);
            let rows = Array.from(trs);
            let cols = Array.from(ths);
            let rowLength = rows.length;

            let dummyTds = document.createElement("td");
            dummyTds.classList.add(CLASS.TD.BASE);
            dummyTds.colSpan = cols.length;
            dummyTds.textContent = DEFAULT.NO_RESULT_MESSAGE;

            let dummy = document.createElement("tr");
            dummy.classList.add(
                CLASS.TR.DUMMY,
                CLASS.TR.BASE,
                CLASS.TR.VISIBLE
            );
            dummy.role = "row";

            dummy.appendChild(dummyTds);

            let excludeIndex = cols.reduce((acc, th) => {
                if (
                    exclude.some((item) => {
                        switch (typeof item) {
                            case "string":
                                return (
                                    th.matches(item) ||
                                    Array.from(th.classList).includes(item)
                                );
                            case "number":
                                return item === th.cellIndex;
                            default:
                                return false;
                        }
                    })
                ) {
                    acc.push(th.cellIndex);
                }
                return acc;
            }, []);

            let searchKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            let searchPattern = new RegExp(searchKeyword, "gi");

            let result = rows.reduce((searched, row) => {
                let children = row.children;
                let tds = Array.from(children);
                let string = tds
                    .filter(
                        (td) =>
                            !excludeIndex.includes(td.cellIndex) &&
                            validateVisibility(td)
                    )
                    .map((td) => td.textContent)
                    .join(" ");

                let isSearched = searchPattern.test(string);

                let isDummy = row.classList.contains(CLASS.TR.DUMMY);
                row.classList.add(CLASS.TR.BASE);

                if (isSearched || isDummy) {
                    row.classList.add(CLASS.TR.VISIBLE);
                    row.classList.add(CLASS.TR.SEARCHED);
                    row.classList.remove(CLASS.TR.HIDDEN);
                    if (isSearched) searched++;
                } else {
                    row.classList.add(CLASS.TR.HIDDEN);
                    row.classList.remove(CLASS.TR.VISIBLE);
                }

                return searched;
            }, 0);

            let dum = tbody.querySelector(`.${CLASS.TR.DUMMY}`);

            if (result < 1) {
                if (!dum) {
                    tbody.appendChild(dummy);
                }
            } else {
                dum?.remove();
            }

            let paginationInfo = {
                current_page: 1,
                total_page: 1,
                start_item: toNumber(Math.min(result, 1)),
                end_item: toNumber(dum ? Math.max(0, result - 1) : result),
                total_rows: toNumber(dum ? rowLength - 1 : rowLength),
            };

            if (typeof output !== "undefined") {
                let outputType = typeof output;
                if (outputType === "string" || output instanceof Element) {
                    let placeholder = validateElement(output);
                    placeholder.textContent = `${paginationInfo.current_page} of ${paginationInfo.total_page}`;
                } else if (outputType === "function") {
                    output(paginationInfo);
                }
            }
            break;
        case "api":
            if (instance) {
                if (instance.api) {
                    if (!instance.api.data) {
                        instance.api.data = {};
                    }
                    instance.api.data.search = keyword;
                    delete instance.api.data.limit;
                    delete instance.api.data.page;
                    if (keyword === "") {
                        delete instance.api.data.search;
                    }
                }
                toInitialize(instance, instance?.api?.rendering);
            }
            break;
    }
}

/**
 * Sorts the specified table either locally or via an API, with optional exclusion of columns.
 *
 * @param {Object} options - The options object.
 * @param {HTMLElement|String} options.table - The table element or its selector to sort.
 * @param {String} [options.to="local"] - The destination of the sorting operation. Can be either "local" or "api".
 * @param {Boolean} [options.ascending=true] - Specifies whether the sorting is ascending (true) or descending (false).
 * @param {Boolean} [options.sorting=true] - Specifies whether to perform sorting. If set to false, sorting will not be performed.
 * @param {Array} [options.exclude=[]] - An array of elements to exclude from sorting. Each element can be a selector string or a column index (number).
 *
 * @returns {Boolean} - Returns false if sorting is disabled.
 */
function toSort({
    table,
    to = "local",
    ascending = true,
    sorting = true,
    exclude = [],
}) {
    let currentSort;
    table = validateVariable(table, {
        variableName: "toSort.table",
        $transform: (element) => validateElement(element, "table"),
        $or: [
            { typeOf: "string" },
            { instanceOf: Element },
            { typeOf: "object" },
        ],
    });
    ascending = validateVariable(ascending, {
        variableName: "toSort.ascending",
        $or: [
            { typeOf: "boolean" },
            { strictEquals: true },
            { strictEquals: false },
        ],
    });
    sorting = validateVariable(sorting, {
        variableName: "toSort.sorting",
        $or: [
            { typeOf: "boolean" },
            { strictEquals: true },
            { strictEquals: false },
        ],
    });
    exclude = validateVariable(exclude, {
        variableName: "toSort.exclude",
        $and: [
            { instanceOf: Array },
            { typeOf: "object" },
            { execute: (array) => Array.isArray(array) },
            {
                execute: (array) =>
                    array.every((items) => typeof items === "number") ||
                    array.every((items) => typeof items === "string"),
            },
        ],
    });
    to = validateVariable(to, {
        variableName: "toSort.to",
        $and: [{ typeOf: "string" }, { in: ["local", "api"] }],
    });
    if (sorting === false) {
        return sorting;
    }
    switch (to) {
        case "local":
            let ths = table.querySelectorAll("thead th");
            let tbody = table.querySelector("tbody");
            let trs = table.querySelectorAll(`tr:not(.${CLASS.TR.NO_DATA})`);
            let rows = Array.from(trs);

            rows.forEach((row, index) => {
                if (!row.classList.contains(CLASS.TR.BASE)) {
                    row.classList.add(CLASS.TR.BASE);
                }
                if (!row.role) {
                    row.role = "row";
                }
            });
            rows.shift();
            ths.forEach((th) => {
                let thTextContent = th.textContent.trim();
                let thTrimmedText = thTextContent?.replace(
                    REGEX.NON_WORD_NON_SPACE,
                    ""
                );
                th.classList.add(CLASS.TH.BASE);
                th.setAttribute("aria-sorting", "none");
                if (!th.dataset.tjsColumn) {
                    th.dataset.tjsColumn = th.cellIndex;
                }
                if (!th.index) {
                    th.index = th.cellIndex;
                }
                if (
                    exclude.some((item) => {
                        switch (typeof item) {
                            case "string":
                                return (
                                    th.matches(item) ||
                                    Array.from(th.classList).includes(item)
                                );
                            case "number":
                                return item === th.cellIndex;
                            default:
                                return false;
                        }
                    })
                ) {
                    th.setAttribute(
                        "aria-describedby",
                        `${thTrimmedText}: SORTING is disabled.`
                    );
                    th.setAttribute(
                        "aria-label",
                        `${thTrimmedText}: Unable to sort`
                    );
                    th.setAttribute("aria-sorting", "disabled");
                    th.classList.add(CLASS.SORT.DISABLED);
                    th.classList.remove(CLASS.SORT.ENABLED);
                    return;
                } else {
                    th.setAttribute(
                        "aria-label",
                        `${thTrimmedText}: Activate to sort`
                    );
                    th.setAttribute(
                        "aria-describedby",
                        `${thTrimmedText}: SORTING is enabled.`
                    );
                    th.classList.add(CLASS.SORT.ENABLED);
                    th.classList.remove(CLASS.SORT.DISABLED);
                }
                th.addEventListener("click", (e) => {
                    let columnIndex = e.target.cellIndex;
                    if (e.target.classList.contains(CLASS.SORT.DESCENDING)) {
                        e.target.setAttribute(
                            "aria-label",
                            `${thTrimmedText}: Activate to sort`
                        );
                        rows.sort((a, b) => {
                            return a.index - b.index;
                        }).forEach((row) => {
                            tbody.removeChild(row);
                            tbody.appendChild(row);
                        });
                        e.target.classList.remove(CLASS.SORT.DESCENDING);
                        e.target.setAttribute("aria-sorting", "none");
                    } else {
                        currentSort = e.target.classList.contains(
                            CLASS.SORT.ASCENDING
                        )
                            ? !ascending
                            : ascending;
                        rows.sort((a, b) => {
                            let aValue =
                                a.children[columnIndex]?.textContent.trim();
                            let bValue =
                                b.children[columnIndex]?.textContent.trim();
                            let comparison = aValue?.localeCompare(
                                bValue,
                                undefined,
                                {
                                    numeric: true,
                                    sensitivity: "base",
                                }
                            );
                            return currentSort ? comparison : -comparison;
                        }).forEach((row) => {
                            tbody.removeChild(row);
                            tbody.appendChild(row);
                        });
                        ths.forEach((th) => {
                            th.classList.remove(
                                CLASS.SORT.ASCENDING,
                                CLASS.SORT.DESCENDING
                            );
                        });
                        e.target.classList.add(
                            currentSort
                                ? CLASS.SORT.ASCENDING
                                : CLASS.SORT.DESCENDING
                        );
                        e.target.setAttribute(
                            "aria-sorting",
                            currentSort ? "ascending" : "descending"
                        );
                        e.target.setAttribute(
                            "aria-label",
                            currentSort
                                ? `${thTrimmedText}: Activate to invert sorting`
                                : `${thTrimmedText}: Activate to remove sorting`
                        );
                    }
                });
            });
            break;
    }
}

/**
 * Validates and returns a DOM element based on the provided selector and optional tag.
 * @param {string|Element} selector - The CSS selector or DOM element to validate.
 * @param {string|string[]|undefined} [tag] - Optional. The tag name(s) to validate against.
 * @returns {Element} - The validated DOM element.
 * @throws {TableJSError} - Throws an error if the selector is invalid or if the element does not match the specified tag.
 */
function validateElement(selector, tag) {
    if (selector instanceof Element) {
        return selector;
    } else if (typeof selector === "string") {
        let element = document.querySelector(selector);
        if (!element) {
            throw new TableJSError(
                `Element with '${selector}' selector not found.`
            );
        }
        if (tag) {
            if (
                typeof tag === "string" &&
                element.tagName.toLowerCase() !== tag.toLowerCase()
            ) {
                throw new TableJSError(
                    `Element with '${selector}' should be a ${tag} element.`
                );
            }
            if (
                Array.isArray(tag) &&
                !tag.includes(element.tagName.toLowerCase())
            ) {
                throw new TableJSError(
                    `Element with '${selector}' should be one of '${tag.join(
                        ", "
                    )}' elements.`
                );
            }
        }
        return element;
    } else if (typeof selector !== "undefined") {
        throw new TableJSError(
            `Invalid '${selector}' parameter. Please provide a valid CSS selector or a DOM element.`
        );
    }
}

/**
 * Filters out key-value pairs from an object based on the provided values to exclude.
 * @param {Object} object - The object to filter.
 * @param {Array|number|string|boolean} [from=[]] - The value(s) to exclude from the object.
 * @returns {Object} - A new object with key-value pairs excluding the specified values.
 */
function validateObjectLiteral(object, excluded = []) {
    return Object.fromEntries(
        Object.entries(object).filter(([_, value]) => {
            const valuesToCheck = Array.isArray(excluded)
                ? excluded
                : [excluded];
            return !valuesToCheck.includes(value);
        })
    );
}

/**
 * Validates a variable against a set of provided validations.
 * @param {*} value - The variable to validate.
 * @param {Object} [validations={}] - Object containing validation rules.
 * @param {Array<Object>} [$or] - Array of alternative validation rules, where at least one must pass.
 * @param {Array<Object>} [$and] - Array of validation rules, where all must pass.
 * @param {string} [variableName="variable"] - The name of the variable being validated (used in error messages).
 * @param {string|string[]} [typeOf] - Type(s) the variable must match.
 * @param {Function|Function[]} [instanceOf] - Constructor(s) the variable must be an instance of.
 * @param {Array|Object} [in] - Array or object in which the variable must exist.
 * @param {*} [equals] - Value the variable must equal.
 * @param {*} [strictEquals] - Value the variable must strictly equal.
 * @param {Function} [execute] - Function to execute for additional validation.
 * @param {*} [$fallback] - Value to return or function to execute if validation fails.
 * @param {RegExp} [pattern] - Regular expression pattern the variable must match.
 * @param {Function} [$transform] - Function to transform the variable if validation passes.
 * @returns {*} - The validated variable or transformed variable.
 * @throws {TableJSError} - Throws an error if validation fails.
 */
function validateVariable(value, validations = {}) {
    const {
        $or,
        $and,
        variableName,
        typeOf,
        instanceOf,
        in: inObject,
        has,
        equals,
        strictEquals,
        execute,
        $fallback,
        pattern,
        $transform,
    } = validations;
    let varName = variableName ?? "variable";

    /**
     * Checks the logical conditions against the provided value and returns the result.
     * @param {*} value - The value to validate against the conditions.
     * @param {Object} cond - The logical conditions to check.
     * @param {Function|Function[]} [cond.instanceOf] - The expected constructor(s) of the variable.
     * @param {string|string[]} [cond.typeOf] - The expected type(s) of the variable.
     * @param {Array|Object} [cond.in] - The array or object in which the variable should exist.
     * @param {*} [cond.equals] - The value the variable should equal.
     * @param {*} [cond.strictEquals] - The value the variable should strictly equal.
     * @param {Function} [cond.execute] - The function to execute for additional validation.
     * @param {Object[]} [cond.$and] - The array of conditions where all must pass.
     * @param {Object[]} [cond.$or] - The array of conditions where at least one must pass.
     * @param {boolean} [cond=true] - A boolean value for simple true validation.
     * @returns {boolean} - The result of the logical conditions.
     */
    let logicalCallback = (value, cond, strict = false) => {
        if (cond.instanceOf) {
            return validateInstanceOf(value, cond.instanceOf, strict);
        } else if (cond.typeOf) {
            return validateTypeOf(value, cond.typeOf, strict);
        } else if (cond.in) {
            return validateInObject(value, cond.in, strict);
        } else if (cond.has) {
            return validateHasObject(value, cond.has, strict);
        } else if (cond.equals) {
            return validateEquals(value, cond.equals).output;
        } else if (cond.strictEquals) {
            return validateStrictEquals(value, cond.strictEquals).output;
        } else if (cond.execute) {
            return validateExecute(value, cond.execute).output;
        } else if (cond.$and) {
            return validateLogicalAnd(value, cond.$and);
        } else if (cond.$or) {
            return validateLogicalOr(value, cond.$or);
        } else if (typeof cond === "boolean" && /^(true)$/.test(cond)) {
            return true;
        }
        return false;
    };

    /**
     * Generates validation messages based on the provided options.
     * @param {string} [type="and"] - The type of logical operation ("and" or "or").
     * @param {Object} opt - The validation options.
     * @param {*} opt.typeOf - The expected type(s) of the variable.
     * @param {Function|Function[]} opt.instanceOf - The expected constructor(s) of the variable.
     * @param {Array|Object} opt.in - The array or object in which the variable should exist.
     * @param {*} opt.equals - The value the variable should equal.
     * @param {*} opt.strictEquals - The value the variable should strictly equal.
     * @param {Function} opt.execute - The function to execute for additional validation.
     * @param {RegExp} opt.pattern - The regular expression pattern the variable should match.
     * @param {Object[]} opt.$and - The array of conditions where all must pass.
     * @param {Object[]} opt.$or - The array of conditions where at least one must pass.
     * @returns {string} - The validation message.
     */
    let validationCallback =
        (type = "and") =>
        (opt) => {
            if (opt?.typeOf) {
                let typeOfValidation = iconConstructor(
                    validateTypeOf(value, opt.typeOf, type === "and")
                );
                if (Array.isArray(opt.typeOf)) {
                    return `\n[${typeOfValidation}] typeof '[${wordsConstructor(
                        opt.typeOf,
                        type
                    )}]'`;
                } else {
                    return `\n[${typeOfValidation}] typeof '${opt.typeOf}'`;
                }
            } else if (opt?.instanceOf) {
                let instanceOfValidation = iconConstructor(
                    validateInstanceOf(value, opt.instanceOf, type === "and")
                );
                if (Array.isArray(opt.instanceOf)) {
                    return `\n[${instanceOfValidation}] instanceof ${wordsConstructor(
                        opt.instanceOf.map((cls) => cls.name),
                        type
                    )}`;
                } else {
                    return `\n[${instanceOfValidation}] instanceof ${opt.instanceOf.name}`;
                }
            } else if (opt?.in) {
                let inObjectValidation = iconConstructor(
                    validateInObject(value, opt.in)
                );
                return `\n[${inObjectValidation}] exist in [${opt.in
                    .map((val) => JSON.stringify(val))
                    .join(", ")}]`;
            } else if (opt?.has) {
                let inObjectValidation = iconConstructor(
                    validateInObject(value, opt.has)
                );
                return `\n[${inObjectValidation}] must have ${
                    Array.isArray(opt.has)
                        ? `[${opt.has
                              .map((val) => JSON.stringify(val))
                              .join(", ")}]`
                        : JSON.stringify(opt.has)
                }`;
            } else if (opt?.equals !== undefined) {
                const { value: equalsValue, output: equalsOutput } =
                    validateEquals(value, opt.equals);
                return `\n[${iconConstructor(
                    equalsOutput
                )}] equals to '${String(equalsValue)}'`;
            } else if (opt?.strictEquals !== undefined) {
                const { value: strictEqualsValue, output: strictEqualsOutput } =
                    validateStrictEquals(value, opt.strictEquals);
                return `\n[${iconConstructor(
                    strictEqualsOutput
                )}] strictly equals to '${String(strictEqualsValue)}'`;
            } else if (typeof opt?.execute === "function") {
                const { value: andExecutionValue, output: andExecutionOutput } =
                    validateExecute(value, opt.execute);
                let andExecutionValidation = iconConstructor(
                    andExecutionValue && andExecutionOutput
                );
                return `\n[${andExecutionValidation}] ${String(opt.execute)}`;
            } else if (opt?.pattern) {
                let isPattern = iconConstructor(
                    validatePattern(value, opt.pattern)
                );
                return `\n[${isPattern}] regex pattern of '${String(
                    opt.pattern
                )}' must be match to the value of ${JSON.stringify(value)}`;
            } else if (opt?.$and) {
                let isAndValidation = validateLogicalAnd(value, opt.$and);
                return `\n[${iconConstructor(
                    isAndValidation
                )}] logical '$and' with a value of '${isAndValidation}' must be 'true'`;
            } else if (opt?.$or) {
                let isOrValidation = validateLogicalAnd(value, opt.$or);
                return `\n[${iconConstructor(
                    isOrValidation
                )}] logical '$or' with a value of '${isOrValidation}' must be 'true'`;
            } else {
                let postMessage = `is not a valid query for type '$${type}'`;
                let validOpt = opt === true;

                switch (typeof opt) {
                    case "object":
                        if (Array.isArray(opt)) {
                            return `\n[${iconConstructor(
                                validOpt
                            )}] ${JSON.stringify(opt)} ${postMessage}`;
                        } else if (Object.keys(opt).length > 0) {
                            let serialized = Object.entries(opt)
                                .reduce((acc, [key, value]) => {
                                    let serializedValue =
                                        typeof value === "function"
                                            ? value.toString()
                                            : JSON.stringify(value);
                                    return acc + `"${key}":${serializedValue},`;
                                }, "{")
                                .replace(/,$/, "}");
                            return `\n[${iconConstructor(
                                validOpt
                            )}] ${serialized} ${postMessage}`;
                        }
                        return `\n[${iconConstructor(
                            validOpt
                        )}] (${JSON.stringify(opt)}) ${postMessage}`;
                    default:
                        return `\n[${iconConstructor(
                            validOpt
                        )}] (${JSON.stringify(
                            opt
                        )}) with a typeof '${typeof opt}' ${postMessage}`;
                }
            }
        };

    /**
     * Constructs an icon based on a boolean value.
     * @param {boolean} boolean - The boolean value to represent as an icon.
     * @returns {string} - The icon representing the boolean value.
     */
    let iconConstructor = (boolean) => {
        return boolean ? "✔" : "✖";
    };

    /**
     * Constructs a string by joining words with a specified connector.
     * @param {string[]} words - An array of words to join.
     * @param {string} [connector="and"] - The connector to use for joining words.
     * @returns {string} - The constructed string.
     */
    let wordsConstructor = (words, connector = "and") => {
        if (words.length === 1) {
            return words[0];
        } else if (words.length === 2) {
            return words.join(`, ${connector} `);
        } else {
            let lastWord = words.pop();
            return `${words.join(", ")}, ${connector} ${lastWord}`;
        }
    };

    /**
     * Validates the logical OR conditions against the provided value.
     * @param {*} value - The value to validate against the conditions.
     * @param {Object[]} conditions - The array of conditions to check.
     * @returns {boolean} - True if at least one condition is satisfied, otherwise false.
     */
    let validateLogicalOr = (value, conditions) => {
        return conditions.some((cond) => logicalCallback(value, cond, false));
    };

    /**
     * Validates the logical AND conditions against the provided value.
     * @param {*} value - The value to validate against the conditions.
     * @param {Object[]} conditions - The array of conditions to check.
     * @returns {boolean} - True if all conditions are satisfied, otherwise false.
     */
    let validateLogicalAnd = (value, conditions) => {
        return conditions.every((cond) => logicalCallback(value, cond, true));
    };

    /**
     * Validates the type(s) of the value against the provided type(s).
     * @param {*} value - The value to validate.
     * @param {string|string[]} types - The expected type(s) of the value.
     * @param {boolean} [strict=false] - Whether to perform strict type checking.
     * @returns {boolean} - True if the value matches any of the expected types (strictly or not), otherwise false.
     */
    let validateTypeOf = (value, types, strict = false) => {
        /**
         * Checks if the value matches the provided type.
         * @param {string} type - The type to check against.
         * @returns {boolean} - True if the value matches the type, otherwise false.
         */
        let typeCallback = (type) => typeof value === type;

        // If types is a string, convert it to an array
        if (typeof types === "string") {
            types = [types];
        }

        // Perform type checking based on strict mode
        return strict ? types.every(typeCallback) : types.some(typeCallback);
    };

    /**
     * Validates whether the value is an instance of the provided class(es).
     * @param {*} value - The value to validate.
     * @param {Function|Function[]} classes - The constructor function(s) representing the class(es).
     * @param {boolean} [strict=false] - Whether to perform strict instance checking.
     * @returns {boolean} - True if the value is an instance of any of the provided classes (strictly or not), otherwise false.
     */
    let validateInstanceOf = (value, classes, strict = false) => {
        /**
         * Checks if the value is an instance of the provided class.
         * @param {Function} cls - The constructor function representing the class.
         * @returns {boolean} - True if the value is an instance of the class, otherwise false.
         */
        let instanceOfCallback = (cls) => {
            if (typeof cls === "function") {
                return value instanceof cls;
            } else if (typeof cls === "string") {
                return typeof value === "string";
            } else {
                return false;
            }
        };

        // If classes is not an array, convert it to an array
        classes = Array.isArray(classes) ? classes : [classes];

        // Perform instance checking based on strict mode
        return strict
            ? classes.every(instanceOfCallback)
            : classes.some(instanceOfCallback);
    };

    /**
     * Validates whether the value exists in the provided array or object.
     * @param {*} value - The value to validate.
     * @param {Array|Object} object - The array or object to search for the value.
     * @returns {boolean} - True if the value exists in the array or object, otherwise false.
     */
    let validateInObject = (value, object) => {
        if (typeof object === "object") {
            if (Array.isArray(object)) {
                return object.includes(value);
            } else {
                return `${value}` in object;
            }
        }
        return false;
    };

    /**
     * Validates whether the provided object or array of objects has any of the specified keys.
     * @param {Object|Object[]|string[]} value - The object, array of objects, or array of strings to validate.
     * @param {string|string[]} keys - The key or array of keys to check for.
     * @param {boolean} [strict=true] - Whether to perform strict checking.
     * @returns {boolean} - True if any of the objects have any of the keys, otherwise false.
     */
    let validateHasObject = (value, keys, strict = false) => {
        if (Array.isArray(value)) {
            if (Array.isArray(keys)) {
                return strict
                    ? keys.every((key) => value.includes(key))
                    : keys.some((key) => value.includes(key));
            } else {
                return value.includes(keys);
            }
        } else if (typeof value === "object") {
            if (Array.isArray(keys)) {
                return strict
                    ? keys.every((key) => key in value)
                    : keys.some((key) => key in value);
            } else {
                return keys in value;
            }
        }
        return false;
    };

    /**
     * Validates whether the value is equal to the reference.
     * @param {*} value - The value to validate.
     * @param {*} reference - The reference value to compare against.
     * @returns {{value: *, output: boolean}} - An object containing the reference value and a boolean indicating whether the value equals the reference.
     */
    let validateEquals = (value, reference) => {
        return { value: reference, output: value == reference };
    };

    /**
     * Validates whether the value strictly equals the reference.
     * @param {*} value - The value to validate.
     * @param {*} reference - The reference value to compare against.
     * @returns {{value: *, output: boolean}} - An object containing the reference value and a boolean indicating whether the value strictly equals the reference.
     */
    let validateStrictEquals = (value, reference) => {
        return { value: reference, output: value === reference };
    };

    /**
     * Executes a verification callback function with the provided value and validates the result.
     * @param {*} value - The value to be verified.
     * @param {Function} verifyCallback - The callback function used to verify the value.
     * @returns {{value: *, output: boolean}} - An object containing the value returned by the callback function and a boolean indicating the verification result.
     */
    let validateExecute = (value, verifyCallback) => {
        if (typeof verifyCallback === "function") {
            try {
                let callbackValue = verifyCallback(value);
                return { value: callbackValue, output: !!callbackValue };
            } catch (e) {
                return { value: false, output: false };
            }
        }
        return { value: verifyCallback, output: false };
    };

    /**
     * Validates whether the provided value matches the specified regular expression pattern.
     * @param {*} value - The value to validate.
     * @param {RegExp} pattern - The regular expression pattern to match against.
     * @returns {boolean} - True if the value matches the pattern, otherwise false.
     */
    let validatePattern = (value, pattern) => {
        return pattern.test(value);
    };

    /**
     * Executes a fallback mechanism based on the provided error message or fallback function.
     * @param {string} errorMessage - The error message to be thrown if no fallback is provided.
     * @returns {*} - The result of the fallback mechanism, which could be a value or the result of a fallback function.
     * @throws {TableJSError} - Throws an error if no fallback is provided.
     */
    let validateFallback = (errorMessage /* :string */) => {
        switch (typeof $fallback) {
            case "undefined":
                throw new TableJSError(errorMessage);
            case "function":
                return $fallback(value);
            default:
                return $fallback;
        }
    };

    // Check if '$or' condition is provided and if the logical OR validation fails
    if ($or && !validateLogicalOr(value, $or)) {
        let expectedTypes = $or.map(validationCallback("or"));
        let errorMessage = `Expected '${varName}' with a value of '${JSON.stringify(
            value
        )}' must attain any of the following: \n${wordsConstructor(
            expectedTypes,
            "or"
        )}\n`;
        return validateFallback(errorMessage);
    }

    // Check if '$and' condition is provided and if the logical AND validation fails
    if ($and && !validateLogicalAnd(value, $and)) {
        let expectedTypes = $and.map(validationCallback("and"));
        let errorMessage = `Expected '${varName}' with a value of '${JSON.stringify(
            value
        )}' must attain all of the following: \n${wordsConstructor(
            expectedTypes,
            "and"
        )}\n`;
        return validateFallback(errorMessage);
    }

    // Check if 'typeOf' condition is provided and if the type validation fails
    if (typeOf && !validateTypeOf(value, typeOf)) {
        let expectedTypes = Array.isArray(typeOf)
            ? wordsConstructor(typeOf)
            : typeOf;
        let errorMessage = `Expected '${varName}' with a value of ${JSON.stringify(
            value
        )} must be of typeof '${expectedTypes}'`;
        return validateFallback(errorMessage);
    }

    // Check if inObject condition is provided and if the inclusion validation fails
    if (inObject !== undefined && !validateInObject(value, inObject)) {
        // Generate an error message indicating the expected inclusion in the array or object
        let errorMessage = `Expected '${varName}' with a value of ${JSON.stringify(
            value
        )} must be in the array or object: ${JSON.stringify(inObject)}`;
        // Execute fallback mechanism with the error message
        return validateFallback(errorMessage);
    }

    // Check if inObject condition is provided and if the inclusion validation fails
    if (has !== undefined && !validateHasObject(value, has)) {
        // Generate an error message indicating the expected inclusion in the array or object
        let errorMessage = `Expected '${varName}' with a value of ${JSON.stringify(
            value
        )} must have a key/s or value/s of ${JSON.stringify(has)}`;
        // Execute fallback mechanism with the error message
        return validateFallback(errorMessage);
    }

    // Check if 'instanceOf' condition is provided and if the instance validation fails
    if (instanceOf && !validateInstanceOf(value, instanceOf)) {
        let instanceNames = Array.isArray(instanceOf)
            ? wordsConstructor(
                  instanceOf.map((cls) => cls.name),
                  "or"
              )
            : instanceOf.name;
        let errorMessage = `Expected '${varName}' with a value of ${JSON.stringify(
            value
        )} must be an instance of ${instanceNames}`;
        return validateFallback(errorMessage);
    }

    // Check if 'equals' condition is provided and if the equality validation fails
    if (equals !== undefined && !validateEquals(value, equals).output) {
        return validateFallback(
            `Expected '${varName}' with a value of ${JSON.stringify(
                value
            )} must be equals to ${JSON.stringify(equalsValue)}`
        );
    }

    // Check if 'strictEquals' condition is provided and if the strict equality validation fails
    if (
        strictEquals !== undefined &&
        !validateStrictEquals(value, strictEquals).output
    ) {
        return validateFallback(
            `Expected '${varName}' with a value of ${JSON.stringify(
                value
            )} must be strictly equals to ${JSON.stringify(strictEqualsValue)}`
        );
    }

    // Check if 'in' condition is provided and if the inclusion validation fails
    const { value: executionValue, output: executionBoolean } = validateExecute(
        value,
        execute
    );
    if (execute !== undefined && !executionBoolean) {
        return validateFallback(
            `Expected '${varName}' with a value of '${JSON.stringify(
                executionValue
            )}' and an output of '${JSON.stringify(
                executionBoolean
            )}'  must be 'true'`
        );
    }

    // Check if 'pattern' condition is provided and if the pattern validation fails
    if (pattern !== undefined && !validatePattern(value, pattern)) {
        return validateFallback(
            `Expected '${varName}' with a value of '${value}' must match the pattern of '${String(
                pattern
            )}'`
        );
    }

    // Check if $transform is defined
    if (typeof $transform !== "undefined") {
        switch (typeof $transform) {
            case "function":
                return $transform(value);
            default:
                return $transform;
        }
    }

    // returns the value because validations are met
    return value;
}

/**
 * Validates the visibility of an HTML element.
 * @param {HTMLElement} element - The HTML element to validate.
 * @returns {boolean} - Returns true if the element is visible, otherwise false.
 */
function validateVisibility(element) {
    let computed = window.getComputedStyle(element);
    let style = element.getAttribute("style");

    return (
        computed.getPropertyValue("display") !== "none" &&
        computed.getPropertyValue("visibility") !== "hidden" &&
        (!style ||
            (!style.includes("display:none") &&
                !style.includes("visibility:hidden")))
    );
}

/**
 * Utility functions for various purposes.
 * @namespace UTILITIES
 */
const UTILITIES = {
    /**
     * Creates pagination ceiling for a given number.
     * @function createPaginationCeiling
     * @memberof UTILITIES
     * @param {number} n - The number for which pagination ceiling will be created.
     * @param {Array} [array=DEFAULT.ITEMS] - The array of items used for pagination.
     * @returns {Array} The pagination ceiling array.
     */
    createPaginationCeiling,

    /**
     * Generates pagination items based on row length and limit.
     * @function createPaginationItems
     * @memberof UTILITIES
     * @param {number} rowLength - The total number of rows.
     * @param {number} rowLimit - The limit of rows per page.
     * @returns {Array} The array of pagination items.
     */
    createPaginationItems,

    /**
     * Generates SVG markup based on the provided key.
     * @function generateSVG
     * @memberof UTILITIES
     * @param {string} key - The key to identify the SVG.
     * @returns {string} The SVG markup.
     */
    generateSVG,

    /**
     * Performs pre-initialization tasks for a table.
     * @function preInitialize
     * @memberof UTILITIES
     * @param {Object} options - The pre-initialization options.
     * @param {Object} options.elements - The elements required for pre-initialization.
     * @param {Object} options.http - The HTTP configuration.
     * @param {Object} options.options - The options for pre-initialization.
     */
    preInitialize,

    /**
     * Responds to changes in table properties by updating related properties.
     *
     * @param {string} property - The name of the property that changed.
     * @param {*} value - The new value of the property.
     * @returns {void}
     */
    propertiesListener,

    /**
     * Performs post-initialization tasks for a table.
     * @function postInitialize
     * @memberof UTILITIES
     * @param {Object} options - The post-initialization options.
     * @param {Object} options.elements - The elements required for post-initialization.
     * @param {Object} options.http - The HTTP configuration.
     * @param {Object} options.options - The options for post-initialization.
     */
    postInitialize,

    /**
     * Toggles column visibility for a table.
     * @function toColvis
     * @memberof UTILITIES
     * @param {Object} options - The options for column visibility toggling.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {HTMLElement|String} options.element - The container element or its selector for column visibility toggling UI.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from visibility toggling.
     * @param {Array} [options.hide=[]] - The initial list of columns to hide.
     */
    toColvis,

    /**
     * Exports table data to a CSV file.
     * @function toCSV
     * @memberof UTILITIES
     * @param {Object} options - The options for exporting to CSV.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {Boolean} [options.headers=true] - Flag indicating whether to include headers in the CSV file.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from exporting.
     * @param {String} [options.filename="export"] - The name of the CSV file.
     */
    toCSV,

    /**
     * Exports table data to an Excel file.
     * @function toExcel
     * @memberof UTILITIES
     * @param {Object} options - The options for exporting to Excel.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from exporting.
     * @param {String} [options.filename="export"] - The name of the Excel file.
     */
    toExcel,

    toFilter,

    toInitialize,
    /**
     * Limits the number of rows displayed in a table.
     * @function toLimit
     * @memberof UTILITIES
     * @param {Object} options - The options for limiting rows.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {HTMLElement|String} options.element - The element or its selector for displaying limit options.
     * @param {number} [options.limitSize=DEFAULT.LIMIT] - The limit size for rows.
     * @param {Array} [options.items=DEFAULT.ITEMS] - The array of items for limit options.
     * @param {String} [options.to="local"] - The destination for applying limits.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from limiting.
     * @param {String|HTMLElement|Function} [options.output] - The output element or function for displaying pagination info.
     */
    toLimit,

    /**
     * Paginates a table.
     * @function toPaginate
     * @memberof UTILITIES
     * @param {Object} options - The options for pagination.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {String} options.as - The action to perform for pagination ("next" or "previous").
     * @param {String} [options.to="local"] - The destination for applying pagination.
     * @param {String|HTMLElement|Function} [options.output] - The output element or function for displaying pagination info.
     */
    toPaginate,

    /**
     * Prints a table.
     * @function toPrint
     * @memberof UTILITIES
     * @param {Object} options - The options for printing.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from printing.
     */
    toPrint,

    /**
     * Renders data into a table element.
     * @function toRender
     * @memberof UTILITIES
     * @param {Object|Array} data - The data to render into the table. Can be an object or an array of objects.
     * @param {HTMLElement|string} table - The table element or its selector where the data will be rendered.
     * @throws {TableJSError} Throws a TableJSError if rendering fails.
     */
    toRender,

    /**
     * Sorts a table.
     * @function toSort
     * @memberof UTILITIES
     * @param {Object} options - The options for sorting.
     * @param {HTMLElement|String} options.table - The table element or its selector.
     * @param {String} [options.to="local"] - The destination for applying sorting.
     * @param {Boolean} [options.ascending=true] - Flag indicating the sorting order (ascending or descending).
     * @param {Boolean} [options.sorting=true] - Flag indicating whether sorting is enabled.
     * @param {Array} [options.exclude=[]] - The list of columns to exclude from sorting.
     */
    toSort,

    /**
     * Search a table.
     * @function validateElement
     * @memberof UTILITIES
     * @param {object} options - An object containing search parameters.
     * @param {HTMLElement|object|string} options.table - The table element or object with a proxy property representing the table.
     * @param {string} [options.to="local"] - The scope of the search ("local" for within the table or "api" for an external API).
     * @param {HTMLElement|object|string} options.element - The specific element to search within (applicable when `to` is "local").
     * @param {string} options.keyword - The keyword to search for within the table.
     * @param {function|string|HTMLElement} options.output - The output destination for search results.
     * @param {Array<number|string>} [options.exclude=[]] - An array of column indices or CSS selectors to exclude from the search.
     * @returns {void}
     */
    toSearch,

    /**
     * Validates an HTML element.
     * @function validateElement
     * @memberof UTILITIES
     * @param {HTMLElement|String} element - The HTML element or its selector to validate.
     * @param {Object} [options] - The validation options.
     * @param {string} [options.variableName] - The name of the variable being validated.
     * @param {function} [options.$transform] - Transformation function to apply to the element.
     * @param {Array} [options.$or] - Array of validation conditions (logical OR).
     * @param {Array} [options.$and] - Array of validation conditions (logical AND).
     * @param {function} [options.execute] - Function to execute for custom validation.
     * @returns {HTMLElement|null} The validated HTML element or null if validation fails.
     */
    validateElement,

    /**
     * Filters out key-value pairs from an object based on the provided values to exclude.
     * @function validateObject
     * @memberof UTILITIES
     * @param {Object} object - The object to filter.
     * @param {Array|number|string|boolean} [from=[]] - The value(s) to exclude from the object.
     * @returns {Object} - A new object with key-value pairs excluding the specified values.
     */
    validateObjectLiteral,

    /**
     * Validates a variable.
     * @function validateVariable
     * @memberof UTILITIES
     * @param {*} variable - The variable to validate.
     * @param {Object} [options] - The validation options.
     * @param {string} [options.variableName] - The name of the variable being validated.
     * @param {*} [options.$fallback] - Default value or fallback function.
     * @param {Array} [options.$or] - Array of validation conditions (logical OR).
     * @param {Array} [options.$and] - Array of validation conditions (logical AND).
     * @param {function} [options.execute] - Function to execute for custom validation.
     * @returns {*} The validated variable or the default value/fallback if validation fails.
     */
    validateVariable,

    /**
     * Validates the visibility of an HTML element.
     * @function validateVisibility
     * @memberof UTILITIES
     * @param {HTMLElement} element - The HTML element to validate.
     * @returns {boolean} A boolean indicating the visibility of the element.
     */
    validateVisibility,
};

export default UTILITIES;

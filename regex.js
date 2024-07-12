/**
 * Regular expression patterns for various character types.
 * @namespace REGEX
 */
const REGEX = {
    /**
     * Matches alphanumeric characters.
     * @type {RegExp}
     */
    ALPHA_NUMERIC: /[a-zA-Z0-9]/g,
    /**
     * Matches whitespace characters.
     * @type {RegExp}
     */
    WHITESPACE: /\s/g,
    /**
     * Matches lowercase letters.
     * @type {RegExp}
     */
    LOWERCASE_LETTERS: /[a-z]/g,
    /**
     * Matches uppercase letters.
     * @type {RegExp}
     */
    UPPERCASE_LETTERS: /[A-Z]/g,
    /**
     * Matches digits.
     * @type {RegExp}
     */
    DIGITS: /\d/g,
    /**
     * Matches word characters (letters, digits, and underscores).
     * @type {RegExp}
     */
    WORD_CHARACTERS: /\w/g,
    /**
     * Matches non-word characters.
     * @type {RegExp}
     */
    NON_WORD_CHARACTERS: /\W/g,
    /**
     * Matches non-whitespace characters.
     * @type {RegExp}
     */
    NON_WHITESPACE_CHARACTERS: /\S/g,
    /**
     * Matches non-word and non-space characters.
     * @type {RegExp}
     */
    NON_WORD_NON_SPACE: /[^\w\s]/g,
    /**
     * Matches alphabetic characters.
     * @type {RegExp}
     */
    ALPHABETIC_CHARACTERS: /[a-zA-Z]/g,
};

export default REGEX;
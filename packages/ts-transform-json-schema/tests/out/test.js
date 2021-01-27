"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = void 0;
function definitionOf(args) {
}
var Test = (function () {
    function Test() {
    }
    return Test;
}());
exports.Test = Test;
var Action = (function () {
    function Action() {
        this.input = Test;
    }
    return Action;
}());
var action = new Action();
var schema = { $ref: "#/definitions/Test", definitions: { Test: { type: "object", properties: { id: { type: "number" }, name: { type: "string" }, childs: { type: "array", items: { $ref: "#/definitions/Test" } } }, defaultProperties: [], additionalProperties: false, required: ["childs", "id", "name"] } }, $schema: "http://json-schema.org/draft-07/schema#" };
console.log(schema);

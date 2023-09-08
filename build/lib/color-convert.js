"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var color_convert_exports = {};
__export(color_convert_exports, {
  rgb565to888: () => rgb565to888,
  rgb565to888Str: () => rgb565to888Str,
  rgb565to888StrSvg: () => rgb565to888StrSvg,
  rgb565to888Svg: () => rgb565to888Svg
});
module.exports = __toCommonJS(color_convert_exports);
function rgb565to888(val) {
  const b = Math.floor((val >> 11 & 31) * 255 / 31 + 0.5);
  const c = Math.floor((val >> 5 & 63) * 255 / 63 + 0.5);
  const d = Math.floor((31 & val) * 255 / 31 + 0.5);
  return b << 16 | c << 8 | d;
}
function rgb565to888Svg(val) {
  const r = (val & 16711680) >> 16;
  const g = (val & 65280) >> 8;
  const b = val & 255;
  return r << 16 | g << 8 | b;
}
function rgb565to888Str(val) {
  return "#" + rgb565to888(val).toString(16).toUpperCase().padStart(6, "0");
}
function rgb565to888StrSvg(val) {
  return "#" + rgb565to888Svg(val).toString(16).toUpperCase().padStart(6, "0");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  rgb565to888,
  rgb565to888Str,
  rgb565to888StrSvg,
  rgb565to888Svg
});
//# sourceMappingURL=color-convert.js.map

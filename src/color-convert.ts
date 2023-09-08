'use strict';

function rgb565to888(val) {
    const b = Math.floor((((val >> 11) & 31) * 255) / 31 + 0.5);
    const c = Math.floor((((val >> 5) & 63) * 255) / 63 + 0.5);
    const d = Math.floor(((31 & val) * 255) / 31 + 0.5);

    return (b << 16) | (c << 8) | d;
}

function rgb565to888Svg(val) {
    const r = (val & 0xff0000) >> 16;
    const g = (val & 0x00ff00) >> 8;
    const b = val & 0x0000ff;

    return (r << 16) | (g << 8) | b;
}

function rgb565to888Str(val) {
    return '#' + rgb565to888(val).toString(16).toUpperCase().padStart(6, '0');
}

function rgb565to888StrSvg(val) {
    return '#' + rgb565to888Svg(val).toString(16).toUpperCase().padStart(6, '0');
}

module.exports = {
    rgb565to888,
    rgb565to888Svg,
    rgb565to888Str,
    rgb565to888StrSvg,
};

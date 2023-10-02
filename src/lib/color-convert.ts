export function rgb565to888(val: number): number {
    const r = (val & 0xff0000) >> 16;
    const g = (val & 0x00ff00) >> 8;
    const b = val & 0x0000ff;

    return (r << 16) | (g << 8) | b;
}

export function rgb565to888Str(val: number): string {
    return '#' + rgb565to888(val).toString(16).toUpperCase().padStart(6, '0');
}

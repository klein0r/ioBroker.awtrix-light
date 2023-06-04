const expect = require('chai').expect;
const colorConvert = require('../lib/color-convert');

describe('Test color convertions', function () {
    it('rgb565 to rgb888', function () {
        this.timeout(5000);

        expect(colorConvert.rgb565to888(0xffff)).to.be.equal(0xffffff);
        expect(colorConvert.rgb565to888(0xef5d)).to.be.equal(0xefebef);
        expect(colorConvert.rgb565to888(0xf800)).to.be.equal(0xff0000);
        expect(colorConvert.rgb565to888(0x7e0)).to.be.equal(0x00ff00);
        expect(colorConvert.rgb565to888(0x1f)).to.be.equal(0x0000ff);
    });

    it('rgb565 to rgb888 hex-string', function () {
        this.timeout(5000);

        expect(colorConvert.rgb565to888Str(0xffff)).to.be.equal('#FFFFFF');
        expect(colorConvert.rgb565to888Str(0xef5d)).to.be.equal('#EFEBEF');
        expect(colorConvert.rgb565to888Str(0xf800)).to.be.equal('#FF0000');
        expect(colorConvert.rgb565to888Str(0x7e0)).to.be.equal('#00FF00');
        expect(colorConvert.rgb565to888Str(0x1f)).to.be.equal('#0000FF');
    });
});

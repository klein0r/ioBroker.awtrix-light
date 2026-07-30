"use strict";
var import_awtrix_light = require("./awtrix-light");
if (require.main !== module) {
  module.exports = (options) => new import_awtrix_light.AwtrixLight(options);
} else {
  (() => new import_awtrix_light.AwtrixLight())();
}
//# sourceMappingURL=main.js.map

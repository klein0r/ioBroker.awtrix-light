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
var expert_exports = {};
__export(expert_exports, {
  AppType: () => AppType
});
module.exports = __toCommonJS(expert_exports);
var import_abstract = require("./abstract");
var AppType;
((AppType2) => {
  class Expert extends import_abstract.AppType.AbstractApp {
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition);
      this.appDefinition = definition;
    }
    async init() {
      super.init();
    }
    async createObjects(prefix) {
      const appName = this.getName();
      await this.adapter.setObjectNotExistsAsync(`${prefix}.${appName}.text`, {
        type: "state",
        common: {
          name: {
            en: "Text",
            de: "Text",
            ru: "\u0422\u0435\u043A\u0441\u0442",
            pt: "Texto",
            nl: "Text",
            fr: "Texte",
            it: "Testo",
            es: "Texto",
            pl: "Tekst",
            "zh-cn": "\u6848\u6587"
          },
          type: "string",
          role: "text",
          read: true,
          write: true
        },
        native: {
          name: appName
        }
      });
    }
    async stateChanged(id, state) {
      const idNoNamespace = this.adapter.removeNamespace(id);
      const appName = this.getName();
      if (id && state && !state.ack) {
        if (idNoNamespace == `apps.${appName}.text`) {
          if (state.val) {
            this.adapter.log.debug(`activating app ${appName}`);
          } else {
            this.adapter.log.warn(`Received invalid value for state ${idNoNamespace}`);
          }
        }
      }
    }
  }
  AppType2.Expert = Expert;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=expert.js.map

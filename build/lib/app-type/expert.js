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
      this.appStates = {};
    }
    async init() {
      var _a, _b;
      const appName = this.getName();
      const appObjects = await this.adapter.getObjectViewAsync("system", "state", {
        startkey: `${this.adapter.namespace}.apps.${appName}.`,
        endkey: `${this.adapter.namespace}.apps.${appName}.\u9999`
      });
      for (const appObj of appObjects.rows) {
        if ((_b = (_a = appObj.value) == null ? void 0 : _a.native) == null ? void 0 : _b.attribute) {
          const appState = await this.adapter.getStateAsync(appObj.id);
          if (appState) {
            this.appStates[appObj.value.native.attribute] = appState.val;
          }
        }
      }
      this.adapter.log.debug(`[initExpertApp] current states of app "${appName}": ${JSON.stringify(this.appStates)}`);
      return super.init();
    }
    async refresh() {
      let refreshed = false;
      if (await super.refresh()) {
        await this.apiClient.appRequestAsync(this.appDefinition.name, {
          text: typeof this.appStates.text === "string" ? this.appStates.text : "",
          icon: typeof this.appStates.icon === "string" ? this.appStates.icon : "",
          duration: typeof this.appStates.duration === "number" ? this.appStates.duration : 0
        }).catch((error) => {
          this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
        });
        refreshed = true;
      }
      return refreshed;
    }
    async createObjects() {
      const appName = this.getName();
      await this.adapter.setObjectNotExistsAsync(`apps.${appName}.text`, {
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
          write: true,
          def: ""
        },
        native: {
          attribute: "text"
        }
      });
      await this.adapter.setObjectNotExistsAsync(`apps.${appName}.icon`, {
        type: "state",
        common: {
          name: {
            en: "Icon",
            de: "Symbol",
            ru: "\u0418\u043C\u044F",
            pt: "\xCDcone",
            nl: "Icoon",
            fr: "Ic\xF4ne",
            it: "Icona",
            es: "Icono",
            pl: "Ikona",
            "zh-cn": "\u56FE\u6807"
          },
          type: "string",
          role: "text",
          read: true,
          write: true,
          def: ""
        },
        native: {
          attribute: "icon"
        }
      });
      await this.adapter.setObjectNotExistsAsync(`apps.${appName}.duration`, {
        type: "state",
        common: {
          name: {
            en: "Icon",
            de: "Symbol",
            ru: "\u0418\u043C\u044F",
            pt: "\xCDcone",
            nl: "Icoon",
            fr: "Ic\xF4ne",
            it: "Icona",
            es: "Icono",
            pl: "Ikona",
            "zh-cn": "\u56FE\u6807"
          },
          type: "number",
          role: "value",
          read: true,
          write: true,
          def: 0
        },
        native: {
          attribute: "duration"
        }
      });
      return super.createObjects();
    }
    async stateChanged(id, state) {
      var _a, _b;
      const idNoNamespace = this.adapter.removeNamespace(id);
      const appName = this.getName();
      if (id && state && !state.ack) {
        if (idNoNamespace.startsWith(`apps.${appName}.`)) {
          const obj = await this.adapter.getObjectAsync(idNoNamespace);
          if (obj && ((_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.attribute)) {
            this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}": "${state.val}" (${(_b = obj == null ? void 0 : obj.native) == null ? void 0 : _b.attribute})`);
            this.appStates[obj.native.attribute] = state.val;
            if (await this.refresh()) {
              await this.adapter.setStateAsync(idNoNamespace, { val: state.val, ack: true });
            }
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

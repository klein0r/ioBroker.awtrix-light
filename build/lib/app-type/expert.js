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
      this.refreshTimeout = null;
    }
    async init() {
      var _a, _b;
      const appName = this.getName();
      const appObjects = await this.adapter.getObjectViewAsync("system", "state", {
        startkey: `${this.objPrefix}.apps.${appName}.`,
        endkey: `${this.objPrefix}.apps.${appName}.\u9999`
      });
      for (const appObj of appObjects.rows) {
        if ((_b = (_a = appObj.value) == null ? void 0 : _a.native) == null ? void 0 : _b.attribute) {
          const appState = await this.adapter.getForeignStateAsync(appObj.id);
          if (appState) {
            this.appStates[appObj.value.native.attribute] = appState.val;
            if (!this.isMainInstance()) {
              const idOwnNamespace = this.adapter.removeNamespace(appObj.id.replace(this.objPrefix, this.adapter.namespace));
              await this.adapter.setStateAsync(idOwnNamespace, { val: appState.val, ack: true, c: "init" });
            }
          }
        }
      }
      this.adapter.log.debug(`[initExpertApp] current states of app "${appName}": ${JSON.stringify(this.appStates)}`);
      return super.init();
    }
    async refresh() {
      let refreshed = false;
      if (await super.refresh()) {
        this.adapter.log.debug(`[refresh] Refreshing app with values "${this.appDefinition.name}": ${JSON.stringify(this.appStates)}`);
        await this.apiClient.appRequestAsync(this.appDefinition.name, {
          text: typeof this.appStates.text === "string" ? this.appStates.text : "",
          color: typeof this.appStates.color === "string" ? this.appStates.color : "#FFFFFF",
          background: typeof this.appStates.background === "string" ? this.appStates.background : "#000000",
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
      await this.adapter.extendObjectAsync(`apps.${appName}.text`, {
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
            //uk: 'Головна',
            "zh-cn": "\u6848\u6587"
          },
          type: "string",
          role: "text",
          read: true,
          write: this.isMainInstance(),
          def: ""
        },
        native: {
          attribute: "text"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.textColor`, {
        type: "state",
        common: {
          name: {
            en: "Text color",
            de: "Textfarbe",
            ru: "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0446\u0432\u0435\u0442",
            pt: "Cor do texto",
            nl: "Tekstkleur",
            fr: "Couleur du texte",
            it: "Colore del testo",
            es: "Color de texto",
            pl: "Kolor tekstu",
            //uk: 'Колір тексту',
            "zh-cn": "\u6587\u672C\u989C\u8272"
          },
          type: "string",
          role: "level.color.rgb",
          read: true,
          write: this.isMainInstance(),
          def: "#FFFFFF"
        },
        native: {
          attribute: "color"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.backgroundColor`, {
        type: "state",
        common: {
          name: {
            en: "Background color",
            de: "Hintergrundfarbe",
            ru: "\u0424\u043E\u043D\u043E\u0432\u044B\u0439 \u0446\u0432\u0435\u0442",
            pt: "Cor de fundo",
            nl: "Achtergrondkleur",
            fr: "Couleur de fond",
            it: "Colore dello sfondo",
            es: "Color de fondo",
            pl: "Kolor t\u0142a",
            //uk: 'Колір фону',
            "zh-cn": "\u80CC\u666F\u989C\u8272"
          },
          type: "string",
          role: "level.color.rgb",
          read: true,
          write: this.isMainInstance(),
          def: "#000000"
        },
        native: {
          attribute: "background"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.icon`, {
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
            //uk: 'значок',
            "zh-cn": "\u56FE\u6807"
          },
          type: "string",
          role: "text",
          read: true,
          write: this.isMainInstance(),
          def: ""
        },
        native: {
          attribute: "icon"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.duration`, {
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
            //uk: 'значок',
            "zh-cn": "\u56FE\u6807"
          },
          type: "number",
          role: "value",
          read: true,
          write: this.isMainInstance(),
          def: 0
        },
        native: {
          attribute: "duration"
        }
      });
      if (!this.isMainInstance()) {
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.text`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.textColor`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.backgroundColor`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.icon`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.duration`);
      }
      return super.createObjects();
    }
    async stateChanged(id, state) {
      var _a, _b, _c;
      if (id && state && !state.ack) {
        const appName = this.getName();
        const idOwnNamespace = this.adapter.removeNamespace(id.replace(this.objPrefix, this.adapter.namespace));
        if (id.startsWith(`${this.objPrefix}.apps.${appName}.`)) {
          const obj = await this.adapter.getForeignObjectAsync(id);
          if (obj && ((_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.attribute)) {
            const attr = obj.native.attribute;
            if (this.appStates[attr] !== state.val) {
              this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}": "${state.val}" (${(_b = obj == null ? void 0 : obj.native) == null ? void 0 : _b.attribute})`);
              this.appStates[attr] = state.val;
              if (!this.refreshTimeout) {
                this.refreshTimeout = this.adapter.setTimeout(async () => {
                  this.refreshTimeout = null;
                  await this.refresh();
                }, 100);
              }
              await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: "onStateChange" });
            } else {
              this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}" IGNORED (not changed): "${state.val}" (${(_c = obj == null ? void 0 : obj.native) == null ? void 0 : _c.attribute})`);
              await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: "onStateChange (unchanged)" });
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

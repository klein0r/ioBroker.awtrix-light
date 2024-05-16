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
var import_user = require("../user");
var AppType;
((AppType2) => {
  class Expert extends import_user.AppType.UserApp {
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition);
      this.appDefinition = definition;
      this.appStates = {};
      this.refreshTimeout = void 0;
    }
    getDescription() {
      return "expert";
    }
    async init() {
      var _a, _b;
      const appName = this.getName();
      const appObjects = await this.adapter.getObjectViewAsync("system", "state", {
        startkey: `${this.objPrefix}.apps.${appName}.`,
        endkey: `${this.objPrefix}.apps.${appName}.\u9999`
      });
      for (const appObj of appObjects.rows) {
        if (appObj.value.type === "state" && ((_b = (_a = appObj.value) == null ? void 0 : _a.native) == null ? void 0 : _b.attribute)) {
          const appState = await this.adapter.getForeignStateAsync(appObj.id);
          if (appState) {
            this.appStates[appObj.value.native.attribute] = appState.val;
            if (!this.isMainInstance()) {
              const idOwnNamespace = this.getObjIdOwnNamespace(appObj.id);
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
        const app = {
          text: typeof this.appStates.text === "string" ? this.appStates.text : "",
          textCase: 2,
          // show as sent
          color: typeof this.appStates.color === "string" ? this.appStates.color : "#FFFFFF",
          background: typeof this.appStates.background === "string" ? this.appStates.background : "#000000",
          icon: typeof this.appStates.icon === "string" ? this.appStates.icon : "",
          duration: typeof this.appStates.duration === "number" ? this.appStates.duration : 0,
          pos: this.appDefinition.position
        };
        if (this.appStates.progress && typeof this.appStates.progress === "number") {
          if (this.appStates.progress >= 0 && this.appStates.progress <= 100) {
            app.progress = this.appStates.progress;
            app.progressC = typeof this.appStates.progressC === "string" ? this.appStates.progressC : "#00FF00";
            app.progressBC = typeof this.appStates.progressBC === "string" ? this.appStates.progressBC : "#FFFFFF";
          }
        }
        await this.apiClient.appRequestAsync(this.appDefinition.name, app).catch((error) => {
          this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
        });
        refreshed = true;
      }
      return refreshed;
    }
    async createObjects() {
      await super.createObjects();
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
            uk: "\u0413\u043E\u043B\u043E\u0432\u043D\u0430",
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
            uk: "\u041A\u043E\u043B\u0456\u0440 \u0442\u0435\u043A\u0441\u0442\u0443",
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
            uk: "\u041A\u043E\u043B\u0456\u0440 \u0444\u043E\u043D\u0443",
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
            uk: "\u0437\u043D\u0430\u0447\u043E\u043A",
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
            en: "Duration",
            de: "Dauer",
            ru: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
            pt: "Dura\xE7\xE3o",
            nl: "Duur",
            fr: "Dur\xE9e",
            it: "Durata",
            es: "Duraci\xF3n",
            pl: "Czas trwania",
            uk: "\u0422\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C",
            "zh-cn": "\u4F1A\u671F"
          },
          type: "number",
          role: "value",
          read: true,
          write: this.isMainInstance(),
          def: 0,
          unit: "sec"
        },
        native: {
          attribute: "duration"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.progress`, {
        type: "folder",
        common: {
          name: {
            en: "Progress bar",
            de: "Fortschrittsleiste",
            ru: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441",
            pt: "Barra de progresso",
            nl: "Voortgangsbalk",
            fr: "Barre de progression",
            it: "Barra di avanzamento",
            es: "Progresos",
            pl: "Pasek post\u0119pu",
            uk: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441 \u0431\u0430\u0440",
            "zh-cn": "\u8FDB\u5EA6\u680F"
          }
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.progress.percent`, {
        type: "state",
        common: {
          name: {
            en: "Progress",
            de: "Fortschritt",
            ru: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441",
            pt: "Progressos",
            nl: "Voortgang",
            fr: "Progr\xE8s accomplis",
            it: "Progressi",
            es: "Progresos",
            pl: "Post\u0119py",
            uk: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441",
            "zh-cn": "\u8FDB\u5C55"
          },
          type: "number",
          role: "value",
          read: true,
          write: this.isMainInstance(),
          def: 0,
          unit: "%",
          min: 0,
          max: 100
        },
        native: {
          attribute: "progress"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.progress.color`, {
        type: "state",
        common: {
          name: {
            en: "Color",
            de: "Farbe",
            ru: "\u0426\u0432\u0435\u0442",
            pt: "Cor",
            nl: "Kleur",
            fr: "Couleur",
            it: "Colore",
            es: "Color",
            pl: "Kolor",
            uk: "\u041A\u043E\u043B\u0456\u0440",
            "zh-cn": "\u989C\u8272"
          },
          type: "string",
          role: "level.color.rgb",
          read: true,
          write: this.isMainInstance(),
          def: "#00FF00"
        },
        native: {
          attribute: "progressC"
        }
      });
      await this.adapter.extendObjectAsync(`apps.${appName}.progress.backgroundColor`, {
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
            uk: "\u041A\u043E\u043B\u0456\u0440 \u0444\u043E\u043D\u0443",
            "zh-cn": "\u80CC\u666F\u989C\u8272"
          },
          type: "string",
          role: "level.color.rgb",
          read: true,
          write: this.isMainInstance(),
          def: "#FFFFFF"
        },
        native: {
          attribute: "progressBC"
        }
      });
      if (!this.isMainInstance()) {
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.text`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.textColor`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.backgroundColor`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.icon`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.duration`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.percent`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.color`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.backgroundColor`);
      }
    }
    async stateChanged(id, state) {
      var _a, _b, _c;
      await super.stateChanged(id, state);
      if (id && state && !state.ack) {
        const appName = this.getName();
        const idOwnNamespace = this.getObjIdOwnNamespace(id);
        if (id.startsWith(`${this.objPrefix}.apps.${appName}.`)) {
          const obj = await this.adapter.getForeignObjectAsync(id);
          if (obj && ((_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.attribute)) {
            const attr = obj.native.attribute;
            if (this.appStates[attr] !== state.val) {
              this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}": "${state.val}" (${(_b = obj == null ? void 0 : obj.native) == null ? void 0 : _b.attribute})`);
              this.appStates[attr] = state.val;
              if (!this.refreshTimeout) {
                this.refreshTimeout = this.adapter.setTimeout(async () => {
                  this.refreshTimeout = void 0;
                  await this.refresh();
                }, 100);
              }
              await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix}` });
            } else {
              this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}" IGNORED (not changed): "${state.val}" (${(_c = obj == null ? void 0 : obj.native) == null ? void 0 : _c.attribute})`);
              await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix} (unchanged)` });
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

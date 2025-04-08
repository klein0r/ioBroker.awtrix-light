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
var abstract_exports = {};
__export(abstract_exports, {
  AppType: () => AppType
});
module.exports = __toCommonJS(abstract_exports);
var AppType;
((AppType2) => {
  class AbstractApp {
    name;
    apiClient;
    adapter;
    objPrefix;
    constructor(apiClient, adapter, name) {
      this.name = name;
      this.apiClient = apiClient;
      this.adapter = adapter;
      if (this.adapter.isMainInstance()) {
        this.objPrefix = this.adapter.namespace;
      } else {
        this.objPrefix = this.adapter.config.foreignSettingsInstance;
      }
      adapter.on("stateChange", this.onStateChange.bind(this));
      adapter.on("objectChange", this.onObjectChange.bind(this));
    }
    getName() {
      return this.name;
    }
    isMainInstance() {
      return this.adapter.isMainInstance();
    }
    getObjIdOwnNamespace(id) {
      return this.adapter.removeNamespace(this.isMainInstance() ? id : id.replace(this.objPrefix, this.adapter.namespace));
    }
    hasOwnActivateState() {
      return this.isMainInstance() || !this.adapter.config.foreignSettingsInstanceActivateApps;
    }
    async createObjects() {
      const appName = this.getName();
      this.adapter.log.debug(`[createObjects] Creating objects for app "${appName}" (${this.isMainInstance() ? "main" : this.objPrefix})`);
      if (this.hasOwnActivateState()) {
        await this.adapter.extendObject(`apps.${appName}.activate`, {
          type: "state",
          common: {
            name: {
              en: "Activate",
              de: "Aktivieren",
              ru: "\u0410\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
              pt: "Ativar",
              nl: "Activeren",
              fr: "Activer",
              it: "Attivare",
              es: "Activar",
              pl: "Aktywuj",
              uk: "\u0410\u043A\u0442\u0438\u0432\u0443\u0432\u0430\u0442\u0438",
              "zh-cn": "\u542F\u7528"
            },
            type: "boolean",
            role: "button",
            read: false,
            write: true
          },
          native: {}
        });
      } else {
        await this.adapter.delObjectAsync(`apps.${appName}.activate`);
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.activate`);
      }
    }
    async onStateChange(id, state) {
      const appName = this.getName();
      if (id) {
        this.adapter.log.debug(`[onStateChange] ${appName}: State change "${id}": ${JSON.stringify(state)}`);
        if (state && !state.ack) {
          if (id === `${this.hasOwnActivateState() ? this.adapter.namespace : this.objPrefix}.apps.${appName}.activate`) {
            if (state.val) {
              this.apiClient.requestAsync("switch", "POST", { name: appName }).catch((error) => {
                this.adapter.log.warn(`[onStateChange] ${appName}: (switch) Unable to execute action: ${error}`);
              });
            } else {
              this.adapter.log.warn(`[onStateChange] ${appName}: Received invalid value for state ${id}`);
            }
          }
        }
      }
      await this.stateChanged(id, state);
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async stateChanged(id, state) {
    }
    async onObjectChange(id, obj) {
      await this.objectChanged(id, obj);
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async objectChanged(id, obj) {
    }
  }
  AppType2.AbstractApp = AbstractApp;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=abstract.js.map

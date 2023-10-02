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
    constructor(apiClient, adapter, definition) {
      this.apiClient = apiClient;
      this.adapter = adapter;
      this.definition = definition;
      this.isVisible = false;
      adapter.on("stateChange", this.onStateChange.bind(this));
      adapter.on("objectChange", this.onObjectChange.bind(this));
    }
    getName() {
      return this.definition.name;
    }
    async init() {
      const appName = this.getName();
      const appVisibleState = await this.adapter.getStateAsync(`apps.${appName}.visible`);
      this.isVisible = appVisibleState ? !!appVisibleState.val : true;
      if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
        await this.adapter.setStateAsync(`apps.${appName}.visible`, { val: this.isVisible, ack: true, c: "initCustomApp" });
      }
      return this.isVisible;
    }
    async refresh() {
      if (!this.isVisible && this.apiClient.isConnected()) {
        const appName = this.getName();
        this.apiClient.removeAppAsync(appName).catch((error) => {
          this.adapter.log.warn(`[refreshApp] Unable to remove hidden app "${appName}": ${error}`);
        });
      }
      return this.isVisible && this.apiClient.isConnected();
    }
    async createObjects() {
      const appName = this.getName();
      await this.adapter.setObjectNotExistsAsync(`apps.${appName}.visible`, {
        type: "state",
        common: {
          name: {
            en: "Visible",
            de: "Sichtbar",
            ru: "\u0412\u0438\u0434\u0438\u043C\u044B\u0439",
            pt: "Vis\xEDvel",
            nl: "Vertaling",
            fr: "Visible",
            it: "Visibile",
            es: "Visible",
            pl: "Widoczny",
            "zh-cn": "\u4E0D\u53EF\u6297\u8FA9"
          },
          type: "boolean",
          role: "switch.enable",
          read: true,
          write: true,
          def: true
        },
        native: {}
      });
    }
    async unloadAsync() {
      if (this.adapter.config.removeAppsOnStop) {
        this.adapter.log.info(`[onUnload] Deleting app on awtrix light with name "${this.definition.name}"`);
        try {
          await this.apiClient.removeAppAsync(this.definition.name).catch((error) => {
            this.adapter.log.warn(`Unable to remove unknown app "${this.definition.name}": ${error}`);
          });
        } catch (error) {
          this.adapter.log.error(`[onUnload] Unable to delete app ${this.definition.name}: ${error}`);
        }
      }
    }
    async onStateChange(id, state) {
      const idNoNamespace = this.adapter.removeNamespace(id);
      const appName = this.getName();
      if (id && state && !state.ack) {
        if (idNoNamespace == `apps.${appName}.visible`) {
          if (state.val !== this.isVisible) {
            this.adapter.log.debug(`[onStateChange] changed visibility of app ${appName} to ${state.val}`);
            this.isVisible = !!state.val;
            if (await this.refresh()) {
              await this.adapter.setStateAsync(idNoNamespace, { val: state.val, ack: true, c: "onStateChange" });
            }
          } else {
            this.adapter.log.debug(`[onStateChange] visibility of app ${appName} was already ${state.val} - ignoring`);
            await this.adapter.setStateAsync(idNoNamespace, { val: state.val, ack: true, c: "onStateChange (unchanged)" });
          }
        }
      }
      await this.stateChanged(id, state);
    }
    async stateChanged(id, state) {
    }
    async onObjectChange(id, obj) {
      await this.objectChanged(id, obj);
    }
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

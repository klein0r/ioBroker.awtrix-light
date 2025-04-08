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
var user_exports = {};
__export(user_exports, {
  AppType: () => AppType
});
module.exports = __toCommonJS(user_exports);
var import_abstract = require("./abstract");
var AppType;
((AppType2) => {
  class UserApp extends import_abstract.AppType.AbstractApp {
    definition;
    ignoreNewValueForAppInTimeRange;
    isVisible;
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition.name);
      this.definition = definition;
      this.ignoreNewValueForAppInTimeRange = adapter.config.ignoreNewValueForAppInTimeRange;
      this.isVisible = false;
    }
    async init() {
      const appName = this.getName();
      const appVisibleState = await this.adapter.getForeignStateAsync(`${this.objPrefix}.apps.${appName}.visible`);
      this.isVisible = appVisibleState ? !!appVisibleState.val : true;
      if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
        await this.adapter.setState(`apps.${appName}.visible`, { val: this.isVisible, ack: true, c: "init" });
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
      await super.createObjects();
      const appName = this.getName();
      await this.adapter.extendObject(`apps.${appName}.visible`, {
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
            uk: "\u0412\u0438\u0431\u0440\u0430\u043D\u0456",
            "zh-cn": "\u4E0D\u53EF\u6297\u8FA9"
          },
          type: "boolean",
          role: "switch.enable",
          read: true,
          write: this.isMainInstance(),
          def: true
        },
        native: {}
      });
      if (!this.isMainInstance()) {
        await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.visible`);
      }
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
    async stateChanged(id, state) {
      if (id && state && !state.ack) {
        const appName = this.getName();
        const idOwnNamespace = this.getObjIdOwnNamespace(id);
        if (id === `${this.objPrefix}.apps.${appName}.visible`) {
          if (state.val !== this.isVisible) {
            this.adapter.log.debug(`[onStateChange] ${appName}: Visibility of app ${appName} changed to ${state.val}`);
            this.isVisible = !!state.val;
            await this.refresh();
            await this.adapter.setState(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix}` });
          } else {
            this.adapter.log.debug(`[onStateChange] ${appName}: Visibility of app "${appName}" IGNORED (not changed): ${state.val}`);
            await this.adapter.setState(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix} (unchanged)` });
          }
        }
      }
    }
  }
  AppType2.UserApp = UserApp;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=user.js.map

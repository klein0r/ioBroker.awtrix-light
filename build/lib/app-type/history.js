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
var history_exports = {};
__export(history_exports, {
  AppType: () => AppType
});
module.exports = __toCommonJS(history_exports);
var import_abstract = require("./abstract");
var AppType;
((AppType2) => {
  class History extends import_abstract.AppType.AbstractApp {
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition);
      this.appDefinition = definition;
    }
    async init() {
      var _a, _b, _c;
      let isValidSourceInstance = false;
      if (this.appDefinition.sourceInstance) {
        const sourceInstanceObj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.appDefinition.sourceInstance}`);
        if (sourceInstanceObj && ((_a = sourceInstanceObj.common) == null ? void 0 : _a.getHistory)) {
          const sourceInstanceAliveState = await this.adapter.getForeignStateAsync(`system.adapter.${this.appDefinition.sourceInstance}.alive`);
          if (sourceInstanceAliveState && sourceInstanceAliveState.val) {
            this.adapter.log.debug(`[initHistoryApp] Found valid source instance for history data: ${this.appDefinition.sourceInstance}`);
            isValidSourceInstance = true;
          } else {
            this.adapter.log.warn(`[initHistoryApp] Unable to get history data of "${this.appDefinition.sourceInstance}": instance not running (stopped)`);
          }
        } else {
          this.adapter.log.warn(`[initHistoryApp] Unable to get history data of "${this.appDefinition.sourceInstance}": no valid source for getHistory()`);
        }
      }
      if (this.appDefinition.objId) {
        this.adapter.log.debug(`[initHistoryApp] getting history data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}" from ${this.appDefinition.sourceInstance}`);
        try {
          const appVisibleState = await this.adapter.getStateAsync(`apps.${this.appDefinition.name}.visible`);
          const appVisible = appVisibleState ? appVisibleState.val : true;
          if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
            await this.adapter.setStateAsync(`apps.${this.appDefinition.name}.visible`, { val: appVisible, ack: true, c: "initHistoryApp" });
          }
          if (!appVisible) {
            this.adapter.log.debug(`[initHistoryApp] Going to remove app "${this.appDefinition.name}" (was hidden by state: apps.${this.appDefinition.name}.visible)`);
            await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
              this.adapter.log.warn(`[initHistoryApp] Unable to remove app "${this.appDefinition.name}" (hidden by state): ${error}`);
            });
          } else if (isValidSourceInstance) {
            const sourceObj = await this.adapter.getForeignObjectAsync(this.appDefinition.objId);
            if (sourceObj && Object.prototype.hasOwnProperty.call((_c = (_b = sourceObj == null ? void 0 : sourceObj.common) == null ? void 0 : _b.custom) != null ? _c : {}, this.appDefinition.sourceInstance)) {
              const itemCount = this.appDefinition.icon ? 11 : 16;
              const historyData = await this.adapter.sendToAsync(this.appDefinition.sourceInstance, "getHistory", {
                id: this.appDefinition.objId,
                options: {
                  start: 1,
                  end: Date.now(),
                  aggregate: "none",
                  limit: itemCount,
                  returnNewestEntries: true,
                  ignoreNull: 0,
                  removeBorderValues: true,
                  ack: true
                }
              });
              const lineData = historyData == null ? void 0 : historyData.result.filter((state) => typeof state.val === "number" && state.ack).map((state) => Math.round(state.val)).slice(itemCount * -1);
              this.adapter.log.debug(
                `[initHistoryApp] Data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(lineData)}`
              );
              if (lineData.length > 0) {
                const moreOptions = {};
                if (this.appDefinition.duration > 0) {
                  moreOptions.duration = this.appDefinition.duration;
                }
                if (this.appDefinition.repeat > 0) {
                  moreOptions.repeat = this.appDefinition.repeat;
                }
                await this.apiClient.appRequestAsync(this.appDefinition.name, {
                  color: this.appDefinition.lineColor || "#FF0000",
                  background: this.appDefinition.backgroundColor || "#000000",
                  line: lineData,
                  autoscale: true,
                  icon: this.appDefinition.icon,
                  lifetime: this.adapter.config.historyAppsRefreshInterval + 60,
                  pos: this.appDefinition.position,
                  ...moreOptions
                }).catch((error) => {
                  this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}": ${error}`);
                });
              } else {
                this.adapter.log.debug(`[initHistoryApp] Going to remove app "${this.appDefinition.name}" (no history data)`);
                await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
                  this.adapter.log.warn(`Unable to remove app "${this.appDefinition.name}" (no history data): ${error}`);
                });
              }
            } else {
              this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": logging is not configured for this object`);
            }
          } else {
            this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": source invalid or unavailable`);
          }
        } catch (error) {
          this.adapter.log.error(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": ${error}`);
        }
      }
      super.init();
    }
  }
  AppType2.History = History;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=history.js.map

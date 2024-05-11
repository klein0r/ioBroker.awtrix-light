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
var import_user = require("../user");
var AppType;
((AppType2) => {
  class History extends import_user.AppType.UserApp {
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition);
      this.appDefinition = definition;
      this.isValidSourceInstance = false;
      this.isValidObjId = false;
      this.refreshTimeout = void 0;
    }
    getDescription() {
      return "history";
    }
    async init() {
      var _a, _b, _c;
      if (this.appDefinition.sourceInstance) {
        const sourceInstanceObj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.appDefinition.sourceInstance}`);
        if (sourceInstanceObj && ((_a = sourceInstanceObj.common) == null ? void 0 : _a.getHistory)) {
          const sourceInstanceAliveState = await this.adapter.getForeignStateAsync(`system.adapter.${this.appDefinition.sourceInstance}.alive`);
          if (sourceInstanceAliveState && sourceInstanceAliveState.val) {
            this.adapter.log.debug(`[initHistoryApp] Found valid source instance for history data: ${this.appDefinition.sourceInstance}`);
            this.isValidSourceInstance = true;
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
          if (this.isValidSourceInstance) {
            const sourceObj = await this.adapter.getForeignObjectAsync(this.appDefinition.objId);
            if (sourceObj && Object.prototype.hasOwnProperty.call((_c = (_b = sourceObj == null ? void 0 : sourceObj.common) == null ? void 0 : _b.custom) != null ? _c : {}, this.appDefinition.sourceInstance)) {
              this.isValidObjId = true;
            } else {
              this.adapter.log.info(
                `[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": logging is not configured for this object`
              );
            }
          } else {
            this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": source invalid or unavailable`);
          }
        } catch (error) {
          this.adapter.log.error(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": ${error}`);
        }
      }
      return super.init();
    }
    async refresh() {
      var _a;
      let refreshed = false;
      if (await super.refresh() && this.isValidSourceInstance && this.isValidObjId) {
        const itemCount = this.appDefinition.icon ? 11 : 16;
        const options = {
          start: 1,
          end: Date.now(),
          limit: itemCount,
          returnNewestEntries: true,
          ignoreNull: 0,
          removeBorderValues: true,
          ack: true
        };
        if (this.appDefinition.mode == "aggregate") {
          options.aggregate = this.appDefinition.aggregation;
          options.step = this.appDefinition.step ? this.appDefinition.step * 1e3 : 3600;
        } else {
          options.aggregate = "none";
        }
        const historyData = await this.adapter.sendToAsync(this.appDefinition.sourceInstance, "getHistory", {
          id: this.appDefinition.objId,
          options
        });
        const graphData = historyData == null ? void 0 : historyData.result.filter((state) => typeof state.val === "number" && state.ack).map((state) => Math.round(state.val)).slice(itemCount * -1);
        this.adapter.log.debug(
          `[refreshHistoryApp] Data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(graphData)}`
        );
        if (graphData.length > 0) {
          const moreOptions = {};
          if (this.appDefinition.duration > 0) {
            moreOptions.duration = this.appDefinition.duration;
          }
          if (this.appDefinition.repeat > 0) {
            moreOptions.repeat = this.appDefinition.repeat;
          }
          if (this.appDefinition.display == "bar") {
            moreOptions.bar = graphData;
          } else {
            moreOptions.line = graphData;
          }
          await this.apiClient.appRequestAsync(this.appDefinition.name, {
            color: this.appDefinition.lineColor || "#FF0000",
            background: this.appDefinition.backgroundColor || "#000000",
            autoscale: true,
            icon: this.appDefinition.icon,
            lifetime: this.adapter.config.historyAppsRefreshInterval + 60,
            // Remove app if there is no update in configured interval (+ buffer)
            pos: this.appDefinition.position,
            ...moreOptions
          }).catch((error) => {
            this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}": ${error}`);
          });
          refreshed = true;
        } else {
          this.adapter.log.debug(`[refreshHistoryApp] Going to remove app "${this.appDefinition.name}" (no history data)`);
          await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
            this.adapter.log.warn(`[refreshHistoryApp] Unable to remove app "${this.appDefinition.name}" (no history data): ${error}`);
          });
        }
      }
      this.adapter.log.debug(`re-creating history apps timeout (${(_a = this.adapter.config.historyAppsRefreshInterval) != null ? _a : 300} seconds)`);
      this.refreshTimeout = this.refreshTimeout || this.adapter.setTimeout(
        () => {
          this.refreshTimeout = void 0;
          this.refresh();
        },
        this.adapter.config.historyAppsRefreshInterval * 1e3 || 5 * 60 * 1e3
      );
      return refreshed;
    }
    async unloadAsync() {
      if (this.refreshTimeout) {
        this.adapter.log.debug(`clearing history app timeout for "${this.getName()}"`);
        this.adapter.clearTimeout(this.refreshTimeout);
      }
      await super.unloadAsync();
    }
  }
  AppType2.History = History;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=history.js.map

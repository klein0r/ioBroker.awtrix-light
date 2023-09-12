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
var custom_exports = {};
__export(custom_exports, {
  AppType: () => AppType
});
module.exports = __toCommonJS(custom_exports);
var import_abstract = require("./abstract");
var AppType;
((AppType2) => {
  class Custom extends import_abstract.AppType.AbstractApp {
    constructor(apiClient, adapter, definition) {
      super(apiClient, adapter, definition);
      this.appDefinition = definition;
      this.objCache = void 0;
    }
    async init() {
      var _a, _b;
      const text = String(this.appDefinition.text).trim();
      const appVisibleState = await this.adapter.getStateAsync(`apps.${this.appDefinition.name}.visible`);
      const appVisible = appVisibleState ? appVisibleState.val : true;
      if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
        await this.adapter.setStateAsync(`apps.${this.appDefinition.name}.visible`, { val: appVisible, ack: true, c: "initCustomApp" });
      }
      if (!appVisible) {
        this.adapter.log.debug(`[initCustomApp] Going to remove app "${this.appDefinition.name}" (was hidden by state: apps.${this.appDefinition.name}.visible)`);
        await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
          this.adapter.log.warn(`[initCustomApp] Unable to remove app "${this.appDefinition.name}" (hidden by state): ${error}`);
        });
      } else if (this.appDefinition.objId && text.includes("%s")) {
        try {
          const objId = this.appDefinition.objId;
          const obj = await this.adapter.getForeignObjectAsync(objId);
          if (obj && obj.type === "state") {
            const state = await this.adapter.getForeignStateAsync(objId);
            this.objCache = {
              val: state && state.ack ? state.val : void 0,
              type: obj == null ? void 0 : obj.common.type,
              unit: (_a = obj == null ? void 0 : obj.common) == null ? void 0 : _a.unit,
              ts: state ? state.ts : Date.now()
            };
            const supportedTypes = ["string", "number", "mixed"];
            if ((obj == null ? void 0 : obj.common.type) && !supportedTypes.includes(obj.common.type)) {
              this.adapter.log.warn(
                `[initCustomApp] Object of app "${this.appDefinition.name}" with objId "${objId}" has invalid type: ${obj.common.type} instead of ${supportedTypes.join(", ")}`
              );
            }
            if (text.includes("%u") && !((_b = obj == null ? void 0 : obj.common) == null ? void 0 : _b.unit)) {
              this.adapter.log.warn(
                `[initCustomApp] Object of app "${this.appDefinition.name}" (${objId}) has no unit - remove "%u" from text or define unit in object (common.unit)`
              );
            }
            if (state && !state.ack) {
              this.adapter.log.info(`[initCustomApp] State value of app "${this.appDefinition.name}" (${objId}) is not acknowledged (ack: false) - waiting for new value`);
            }
            await this.adapter.subscribeForeignStatesAsync(objId);
            await this.adapter.subscribeForeignObjectsAsync(objId);
            this.adapter.log.debug(`[initCustomApp] Found app "${this.appDefinition.name}" with objId "${objId}" - subscribed to changes`);
            await this.refresh();
          } else {
            this.adapter.log.warn(`[initCustomApp] App "${this.appDefinition.name}" was configured with invalid objId "${objId}": Invalid type ${obj == null ? void 0 : obj.type}`);
          }
        } catch (error) {
          this.adapter.log.error(`[initCustomApp] Unable to get object information for app "${this.appDefinition.name}": ${error}`);
        }
      } else if (text.length > 0) {
        this.adapter.log.debug(`[initCustomApp] Creating app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and static text "${this.appDefinition.text}"`);
        if (this.appDefinition.objId) {
          this.adapter.log.warn(
            `[initCustomApp] App "${this.appDefinition.name}" was defined with objId "${this.appDefinition.objId}" but "%s" is not used in the text - state changes will be ignored`
          );
        }
        const displayText = text.replace("%u", "").trim();
        if (displayText.length > 0) {
          await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText)).catch((error) => {
            this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}" with static text: ${error}`);
          });
        } else {
          this.adapter.log.debug(`[initCustomApp] Going to remove app "${this.appDefinition.name}" with static text (empty text)`);
          await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
            this.adapter.log.warn(`[initCustomApp] Unable to remove app "${this.appDefinition.name}" with static text (empty text): ${error}`);
          });
        }
      }
      super.init();
    }
    createAppRequestObj(text, val) {
      const moreOptions = {};
      if (this.appDefinition.useBackgroundEffect) {
        moreOptions.effect = this.appDefinition.backgroundEffect;
      } else if (this.appDefinition.backgroundColor) {
        moreOptions.background = this.appDefinition.backgroundColor;
      }
      if (this.appDefinition.rainbow) {
        moreOptions.rainbow = true;
      } else if (this.appDefinition.textColor) {
        moreOptions.color = this.appDefinition.textColor;
      }
      if (this.appDefinition.noScroll) {
        moreOptions.noScroll = true;
      } else {
        if (this.appDefinition.scrollSpeed > 0) {
          moreOptions.scrollSpeed = this.appDefinition.scrollSpeed;
        }
        if (this.appDefinition.repeat > 0) {
          moreOptions.repeat = this.appDefinition.repeat;
        }
      }
      if (this.appDefinition.icon) {
        moreOptions.icon = this.appDefinition.icon;
      }
      if (this.appDefinition.duration > 0) {
        moreOptions.duration = this.appDefinition.duration;
      }
      if (typeof val === "number") {
        if (this.appDefinition.thresholdLtActive && val < this.appDefinition.thresholdLtValue) {
          this.adapter.log.debug(`[createAppRequestObj] LT < custom app "${this.appDefinition.name}" has a value (${val}) less than ${this.appDefinition.thresholdLtValue} - overriding values`);
          if (this.appDefinition.thresholdLtIcon) {
            moreOptions.icon = this.appDefinition.thresholdLtIcon;
          }
          if (this.appDefinition.thresholdLtTextColor) {
            moreOptions.color = this.appDefinition.thresholdLtTextColor;
            moreOptions.rainbow = false;
          }
          if (this.appDefinition.thresholdLtBackgroundColor) {
            moreOptions.background = this.appDefinition.thresholdLtBackgroundColor;
            if (this.appDefinition.useBackgroundEffect) {
              delete moreOptions.effect;
            }
          }
        } else if (this.appDefinition.thresholdGtActive && val > this.appDefinition.thresholdGtValue) {
          this.adapter.log.debug(`[createAppRequestObj] GT > custom app "${this.appDefinition.name}" has a value (${val}) greater than ${this.appDefinition.thresholdGtValue} - overriding values`);
          if (this.appDefinition.thresholdGtIcon) {
            moreOptions.icon = this.appDefinition.thresholdGtIcon;
          }
          if (this.appDefinition.thresholdGtTextColor) {
            moreOptions.color = this.appDefinition.thresholdGtTextColor;
            moreOptions.rainbow = false;
          }
          if (this.appDefinition.thresholdGtBackgroundColor) {
            moreOptions.background = this.appDefinition.thresholdGtBackgroundColor;
            if (this.appDefinition.useBackgroundEffect) {
              delete moreOptions.effect;
            }
          }
        }
      }
      return {
        text,
        textCase: 2,
        pos: this.appDefinition.position,
        ...moreOptions
      };
    }
    async refresh() {
      var _a, _b;
      if (this.apiClient.isConnected()) {
        const text = String(this.appDefinition.text).trim();
        if (this.objCache && text.includes("%s")) {
          this.adapter.log.debug(`[refreshCustomApp] Refreshing custom app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and text "${this.appDefinition.text}"`);
          try {
            const appVisibleState = await this.adapter.getStateAsync(`apps.${this.appDefinition.name}.visible`);
            const appVisible = appVisibleState ? appVisibleState.val : true;
            if (appVisible) {
              const val = this.objCache.val;
              if (typeof val !== "undefined") {
                let newVal = val;
                if (this.objCache.type === "number") {
                  const oldVal = typeof val !== "number" ? parseFloat(val) : val;
                  const decimals = typeof this.appDefinition.decimals === "string" ? parseInt(this.appDefinition.decimals) : (_a = this.appDefinition.decimals) != null ? _a : 3;
                  if (!isNaN(oldVal) && oldVal % 1 !== 0) {
                    let countDecimals = String(val).split(".")[1].length || 2;
                    if (countDecimals > decimals) {
                      countDecimals = decimals;
                    }
                    const numFormat = this.adapter.config.numberFormat;
                    if (numFormat === "system") {
                      newVal = this.adapter.formatValue(oldVal, countDecimals);
                    } else if ([".,", ",."].includes(numFormat)) {
                      newVal = this.adapter.formatValue(oldVal, countDecimals, numFormat);
                    } else if (numFormat === ".") {
                      newVal = oldVal.toFixed(countDecimals);
                    } else if (numFormat === ",") {
                      newVal = oldVal.toFixed(countDecimals).replace(".", ",");
                    }
                    this.adapter.log.debug(`[refreshCustomApp] formatted value of objId "${this.appDefinition.objId}" from ${oldVal} to ${newVal} (${countDecimals} decimals) with "${numFormat}"`);
                  }
                }
                const displayText = text.replace("%s", newVal).replace("%u", (_b = this.objCache.unit) != null ? _b : "").trim();
                if (displayText.length > 0) {
                  await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText, val)).catch((error) => {
                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                  });
                } else {
                  this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (empty text)`);
                  await this.apiClient.appRequestAsync(this.appDefinition.name).catch((error) => {
                    this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" (empty text): ${error}`);
                  });
                }
              } else {
                this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (no state data)`);
                await this.apiClient.appRequestAsync(this.appDefinition.name).catch((error) => {
                  this.adapter.log.warn(`Unable to remove customApp app "${this.appDefinition.name}" (no state data): ${error}`);
                });
              }
            }
          } catch (error) {
            this.adapter.log.error(`[refreshCustomApp] Unable to refresh app "${this.appDefinition.name}": ${error}`);
          }
        }
      }
    }
    async stateChanged(id, state) {
      if (this.objCache) {
        if (id && state && id === this.appDefinition.objId) {
          if (state.ack) {
            if (state.val !== this.objCache.val) {
              this.adapter.log.debug(`[onStateChange] received state change of objId "${id}" from ${this.objCache.val} to ${state.val} (ts: ${state.ts})`);
              if (this.objCache.ts + this.adapter.config.ignoreNewValueForAppInTimeRange * 1e3 < state.ts) {
                this.objCache.val = this.objCache.type === "mixed" ? String(state.val) : state.val;
                this.objCache.ts = state.ts;
                this.refresh();
              } else {
                this.adapter.log.debug(
                  `[onStateChange] ignoring customApps state change of objId "${id}" to ${state.val} - refreshes too fast (within ${this.adapter.config.ignoreNewValueForAppInTimeRange} seconds) - Last update: ${this.adapter.formatDate(this.objCache.ts, "YYYY-MM-DD hh:mm:ss.sss")}`
                );
              }
            }
          } else {
            this.adapter.log.debug(`[onStateChange] ignoring customApps state change of "${id}" to ${state.val} - ack is false`);
          }
        }
      }
    }
    async objectChanged(id, obj) {
      var _a;
      if (this.objCache) {
        if (id && id === this.appDefinition.objId) {
          if (!obj) {
            this.objCache = void 0;
          } else {
            this.objCache.type = obj == null ? void 0 : obj.common.type;
            this.objCache.unit = (_a = obj == null ? void 0 : obj.common) == null ? void 0 : _a.unit;
            this.refresh();
          }
        }
      }
    }
  }
  AppType2.Custom = Custom;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=custom.js.map

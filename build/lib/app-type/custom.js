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
      this.isStaticText = false;
      this.isBackgroundOny = true;
      this.cooldownTimeout = null;
    }
    async init() {
      var _a, _b;
      const text = String(this.appDefinition.text).trim();
      if (text.length > 0) {
        if (this.appDefinition.objId && text.includes("%s")) {
          try {
            const objId = this.appDefinition.objId;
            const obj = await this.adapter.getForeignObjectAsync(objId);
            if (obj && obj.type === "state") {
              const state = await this.adapter.getForeignStateAsync(objId);
              this.isStaticText = false;
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
              this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" with objId "${objId}" - subscribed to changes`);
            } else {
              this.adapter.log.warn(`[initCustomApp] App "${this.appDefinition.name}" was configured with invalid objId "${objId}": Invalid type ${obj == null ? void 0 : obj.type}`);
            }
          } catch (error) {
            this.adapter.log.error(`[initCustomApp] Unable to get object information for app "${this.appDefinition.name}": ${error}`);
          }
        } else {
          this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" with static text`);
          this.isStaticText = true;
        }
      } else if (this.appDefinition.useBackgroundEffect && this.appDefinition.backgroundEffect) {
        this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" with background only`);
        this.isBackgroundOny = true;
      }
      return super.init();
    }
    createAppRequestObj(text, val) {
      const app = {
        pos: this.appDefinition.position
      };
      if (text !== "") {
        app.text = text;
        app.textCase = 2;
      }
      if (this.appDefinition.useBackgroundEffect) {
        app.effect = this.appDefinition.backgroundEffect;
      } else if (this.appDefinition.backgroundColor) {
        app.background = this.appDefinition.backgroundColor;
      }
      if (this.appDefinition.rainbow) {
        app.rainbow = true;
      } else if (this.appDefinition.textColor) {
        app.color = this.appDefinition.textColor;
      }
      if (this.appDefinition.noScroll) {
        app.noScroll = true;
      } else {
        if (this.appDefinition.scrollSpeed > 0) {
          app.scrollSpeed = this.appDefinition.scrollSpeed;
        }
        if (this.appDefinition.repeat > 0) {
          app.repeat = this.appDefinition.repeat;
        }
      }
      if (this.appDefinition.icon) {
        app.icon = this.appDefinition.icon;
      }
      if (this.appDefinition.duration > 0) {
        app.duration = this.appDefinition.duration;
      }
      if (typeof val === "number") {
        if (this.appDefinition.thresholdLtActive && val < this.appDefinition.thresholdLtValue) {
          this.adapter.log.debug(
            `[createAppRequestObj] LT < custom app "${this.appDefinition.name}" has a value (${val}) less than ${this.appDefinition.thresholdLtValue} - overriding values`
          );
          if (this.appDefinition.thresholdLtIcon) {
            app.icon = this.appDefinition.thresholdLtIcon;
          }
          if (this.appDefinition.thresholdLtTextColor) {
            app.color = this.appDefinition.thresholdLtTextColor;
            app.rainbow = false;
          }
          if (this.appDefinition.thresholdLtBackgroundColor) {
            app.background = this.appDefinition.thresholdLtBackgroundColor;
            if (this.appDefinition.useBackgroundEffect) {
              delete app.effect;
            }
          }
        } else if (this.appDefinition.thresholdGtActive && val > this.appDefinition.thresholdGtValue) {
          this.adapter.log.debug(
            `[createAppRequestObj] GT > custom app "${this.appDefinition.name}" has a value (${val}) greater than ${this.appDefinition.thresholdGtValue} - overriding values`
          );
          if (this.appDefinition.thresholdGtIcon) {
            app.icon = this.appDefinition.thresholdGtIcon;
          }
          if (this.appDefinition.thresholdGtTextColor) {
            app.color = this.appDefinition.thresholdGtTextColor;
            app.rainbow = false;
          }
          if (this.appDefinition.thresholdGtBackgroundColor) {
            app.background = this.appDefinition.thresholdGtBackgroundColor;
            if (this.appDefinition.useBackgroundEffect) {
              delete app.effect;
            }
          }
        }
      } else if (this.appDefinition.thresholdLtActive || this.appDefinition.thresholdGtActive) {
        this.adapter.log.warn(`[createAppRequestObj] Found enabled thresholds for custom app "${this.appDefinition.name}" - data type is invalid (${typeof val})`);
      }
      return app;
    }
    async refresh() {
      var _a, _b;
      let refreshed = false;
      if (await super.refresh()) {
        const text = String(this.appDefinition.text).trim();
        if (this.objCache && !this.isStaticText) {
          this.adapter.log.debug(`[refreshCustomApp] Refreshing custom app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and text "${this.appDefinition.text}"`);
          try {
            if (this.isVisible) {
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
                    this.adapter.log.debug(
                      `[refreshCustomApp] formatted value of objId "${this.appDefinition.objId}" from ${oldVal} to ${newVal} (${countDecimals} decimals) with "${numFormat}"`
                    );
                  }
                }
                const displayText = text.replace("%s", newVal).replace("%u", (_b = this.objCache.unit) != null ? _b : "").trim();
                if (displayText.length > 0) {
                  await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText, val)).catch((error) => {
                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                  });
                  refreshed = true;
                } else {
                  this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (empty text)`);
                  await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
                    this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" (empty text): ${error}`);
                  });
                }
              } else {
                this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (no state data)`);
                await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
                  this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" (no state data): ${error}`);
                });
              }
            }
          } catch (error) {
            this.adapter.log.error(`[refreshCustomApp] Unable to refresh app "${this.appDefinition.name}": ${error}`);
          }
        } else if (this.isStaticText) {
          this.adapter.log.debug(`[refreshCustomApp] Creating app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and static text "${this.appDefinition.text}"`);
          if (this.appDefinition.objId) {
            this.adapter.log.warn(
              `[refreshCustomApp] App "${this.appDefinition.name}" was defined with objId "${this.appDefinition.objId}" but "%s" is not used in the text - state changes will be ignored`
            );
          }
          const displayText = text.replace("%u", "").trim();
          if (displayText.length > 0) {
            await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText)).catch((error) => {
              this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}" with static text: ${error}`);
            });
            refreshed = true;
          } else {
            this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" with static text (empty text)`);
            await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
              this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" with static text (empty text): ${error}`);
            });
          }
        } else if (this.isBackgroundOny) {
          await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj("")).catch((error) => {
            this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}" with background only: ${error}`);
          });
          refreshed = true;
        }
      }
      return refreshed;
    }
    async stateChanged(id, state) {
      if (this.objCache && !this.isStaticText) {
        if (id && state && id === this.appDefinition.objId) {
          if (state.ack) {
            if (state.val !== this.objCache.val) {
              this.adapter.log.debug(`[onStateChange] "${this.appDefinition.name}" received state change of objId "${id}" from ${this.objCache.val} to ${state.val} (ts: ${state.ts})`);
              if (this.objCache.ts + this.adapter.config.ignoreNewValueForAppInTimeRange * 1e3 < state.ts) {
                this.objCache.val = this.objCache.type === "mixed" ? String(state.val) : state.val;
                this.objCache.ts = state.ts;
                this.clearCooldownTimeout();
                this.refresh();
              } else {
                this.adapter.log.debug(
                  `[onStateChange] "${this.appDefinition.name}" ignoring customApps state change of objId "${id}" to ${state.val} - refreshes too fast (within ${this.adapter.config.ignoreNewValueForAppInTimeRange} seconds) - Last update: ${this.adapter.formatDate(this.objCache.ts, "YYYY-MM-DD hh:mm:ss.sss")}`
                );
                this.clearCooldownTimeout();
                this.cooldownTimeout = this.adapter.setTimeout(
                  () => {
                    this.cooldownTimeout = null;
                    if (this.objCache) {
                      this.objCache.val = this.objCache.type === "mixed" ? String(state.val) : state.val;
                      this.objCache.ts = state.ts;
                      this.refresh();
                    }
                  },
                  (this.adapter.config.ignoreNewValueForAppInTimeRange + 5) * 1e3
                );
              }
            }
          } else {
            this.adapter.log.debug(`[onStateChange] "${this.appDefinition.name}" ignoring state change of "${id}" to ${state.val} - ack is false`);
          }
        }
      }
    }
    async objectChanged(id, obj) {
      var _a;
      if (this.objCache && !this.isStaticText) {
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
    clearCooldownTimeout() {
      if (this.cooldownTimeout) {
        this.adapter.clearTimeout(this.cooldownTimeout);
        this.cooldownTimeout = null;
      }
    }
    async unloadAsync() {
      if (this.cooldownTimeout) {
        this.adapter.log.debug(`clearing custom app cooldown timeout for "${this.getName()}"`);
        this.adapter.clearTimeout(this.cooldownTimeout);
      }
      await super.unloadAsync();
    }
  }
  AppType2.Custom = Custom;
})(AppType || (AppType = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppType
});
//# sourceMappingURL=custom.js.map

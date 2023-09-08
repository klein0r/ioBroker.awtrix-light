"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_axios = __toESM(require("axios"));
var import_color_convert = require("./lib/color-convert");
const NATIVE_APPS = ["time", "date", "temp", "hum", "bat"];
class AwtrixLight extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "awtrix-light",
      useFormatDate: true
    });
    this.supportedVersion = "0.84";
    this.displayedVersionWarning = false;
    this.apiConnected = false;
    this.refreshStateTimeout = null;
    this.refreshHistoryAppsTimeout = null;
    this.downloadScreenContentInterval = null;
    this.customAppsForeignStates = {};
    this.backgroundEffects = [
      "Fade",
      "MovingLine",
      "BrickBreaker",
      "PingPong",
      "Radar",
      "Checkerboard",
      "Fireworks",
      "PlasmaCloud",
      "Ripple",
      "Snake",
      "Pacifica",
      "TheaterChase",
      "Plasma",
      "Matrix",
      "SwirlIn",
      "SwirlOut",
      "LookingEyes",
      "TwinklingStars",
      "ColorWaves"
    ];
    this.lastErrorCode = -1;
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("objectChange", this.onObjectChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.setApiConnected(false);
    await this.upgradeFromPreviousVersion();
    await this.subscribeStatesAsync("*");
    if (!this.config.awtrixIp) {
      this.log.error(`IP address not configured - please check instance configuration and restart`);
      return;
    } else {
      this.log.info(`Starting - connecting to http://${this.config.awtrixIp}/`);
    }
    if (this.config.foreignSettingsInstance && this.config.foreignSettingsInstance !== this.namespace) {
      await this.subscribeForeignObjectsAsync(`system.adapter.${this.config.foreignSettingsInstance}`);
      await this.importForeignSettings();
    }
    if (!this.config.customPositions) {
      this.log.debug(`[onReady] Setting position of each app as ordered in instance configuration (custom positions are disabled)`);
      let pos = 0;
      for (const customApp of this.config.customApps) {
        customApp.position = pos++;
      }
      for (const historyApp of this.config.historyApps) {
        historyApp.position = pos++;
      }
      for (const expertApp of this.config.expertApps) {
        expertApp.position = pos++;
      }
    } else {
      this.log.debug(`[onReady] Custom positions are enabled - using app positions of instance configuration`);
    }
    this.refreshState();
  }
  async upgradeFromPreviousVersion() {
    this.log.debug(`Upgrading objects from previous version`);
    await this.delObjectAsync("apps.eyes", { recursive: true });
  }
  async importForeignSettings() {
    var _a, _b, _c;
    try {
      this.log.info(`Using settings of other instance: ${this.config.foreignSettingsInstance}`);
      const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.config.foreignSettingsInstance}`);
      if (instanceObj && instanceObj.native) {
        if (!((_a = instanceObj.native) == null ? void 0 : _a.foreignSettingsInstance)) {
          this.config.customApps = instanceObj.native.customApps;
          this.config.ignoreNewValueForAppInTimeRange = instanceObj.native.ignoreNewValueForAppInTimeRange;
          this.config.historyApps = instanceObj.native.historyApps;
          this.config.historyAppsRefreshInterval = instanceObj.native.historyAppsRefreshInterval;
          this.config.autoDeleteForeignApps = instanceObj.native.autoDeleteForeignApps;
          this.config.removeAppsOnStop = instanceObj.native.removeAppsOnStop;
          this.config.expertApps = instanceObj.native.expertApps;
          this.log.debug(`[importForeignSettings] Copied settings from foreign instance "system.adapter.${this.config.foreignSettingsInstance}"`);
        } else {
          throw new Error(`Foreign instance uses instance settings of ${(_b = instanceObj == null ? void 0 : instanceObj.native) == null ? void 0 : _b.foreignSettingsInstance} - (nothing imported)`);
        }
      } else {
        throw new Error(`Unable to load instance settings of ${(_c = instanceObj == null ? void 0 : instanceObj.native) == null ? void 0 : _c.foreignSettingsInstance} (nothing imported)`);
      }
    } catch (err) {
      this.log.error(`Unable to import settings of other instance: ${err}`);
    }
  }
  async onStateChange(id, state) {
    var _a, _b, _c;
    if (id && state && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, id)) {
      if (state.ack) {
        if (state.val !== this.customAppsForeignStates[id].val) {
          this.log.debug(`[onStateChange] received state change of objId "${id}" from ${this.customAppsForeignStates[id].val} to ${state.val} (ts: ${state.ts})`);
          if (this.customAppsForeignStates[id].ts + this.config.ignoreNewValueForAppInTimeRange * 1e3 < state.ts) {
            this.customAppsForeignStates[id].val = this.customAppsForeignStates[id].type === "mixed" ? String(state.val) : state.val;
            this.customAppsForeignStates[id].ts = state.ts;
            this.refreshCustomApps(id);
          } else {
            this.log.debug(
              `[onStateChange] ignoring customApps state change of objId "${id}" to ${state.val} - refreshes too fast (within ${this.config.ignoreNewValueForAppInTimeRange} seconds) - Last update: ${this.formatDate(this.customAppsForeignStates[id].ts, "YYYY-MM-DD hh:mm:ss.sss")}`
            );
          }
        }
      } else {
        this.log.debug(`[onStateChange] ignoring customApps state change of "${id}" to ${state.val} - ack is false`);
      }
    }
    if (id && state && !state.ack) {
      const idNoNamespace = this.removeNamespace(id);
      this.log.debug(`state ${idNoNamespace} changed: ${state.val}`);
      if (this.apiConnected) {
        if (idNoNamespace.startsWith("settings.")) {
          this.log.debug(`changing setting ${idNoNamespace} power to ${state.val}`);
          const settingsObj = await this.getObjectAsync(idNoNamespace);
          if (settingsObj && ((_a = settingsObj.native) == null ? void 0 : _a.settingsKey)) {
            this.buildRequestAsync("settings", "POST", { [settingsObj.native.settingsKey]: state.val }).then(async (response) => {
              if (response.status === 200 && response.data === "OK") {
                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
              }
              await this.refreshSettings();
            }).catch((error) => {
              this.log.warn(`(settings) Unable to execute action: ${error}`);
            });
          } else {
            this.log.warn(`Unable to change setting of ${id} - settingsKey not found`);
          }
        } else if (idNoNamespace === "display.power") {
          this.log.debug(`changing display power to ${state.val}`);
          this.buildRequestAsync("power", "POST", { power: state.val }).then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
            }
          }).catch((error) => {
            this.log.warn(`(power) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace.startsWith("display.moodlight.")) {
          this.updateMoodlightByStates().then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
            }
          }).catch((error) => {
            this.log.warn(`(moodlight) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "device.update") {
          this.log.info("performing firmware update");
          this.buildRequestAsync("doupdate", "POST").then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              this.log.info("started firmware update");
            }
          }).catch((error) => {
            this.log.warn(`(doupdate) Unable to execute firmware update (maybe this is already the newest version): ${error}`);
          });
        } else if (idNoNamespace === "device.reboot") {
          this.buildRequestAsync("reboot", "POST").then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              this.log.info("rebooting device");
              this.setApiConnected(false);
            }
          }).catch((error) => {
            this.log.warn(`(reboot) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "apps.next") {
          this.log.debug("switching to next app");
          this.buildRequestAsync("nextapp", "POST").catch((error) => {
            this.log.warn(`(nextapp) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "apps.prev") {
          this.log.debug("switching to previous app");
          this.buildRequestAsync("previousapp", "POST").catch((error) => {
            this.log.warn(`(previousapp) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace.startsWith("apps.")) {
          if (idNoNamespace.endsWith(".activate")) {
            if (state.val) {
              const sourceObj = await this.getObjectAsync(idNoNamespace);
              if (sourceObj && ((_b = sourceObj.native) == null ? void 0 : _b.name)) {
                this.log.debug(`activating app ${sourceObj.native.name}`);
                this.buildRequestAsync("switch", "POST", { name: sourceObj.native.name }).catch((error) => {
                  this.log.warn(`(switch) Unable to execute action: ${error}`);
                });
              }
            } else {
              this.log.warn(`Received invalid value for state ${idNoNamespace}`);
            }
          } else if (idNoNamespace.endsWith(".visible")) {
            const sourceObj = await this.getObjectAsync(idNoNamespace);
            if (sourceObj && ((_c = sourceObj.native) == null ? void 0 : _c.name)) {
              this.log.debug(`changing visibility of app ${sourceObj.native.name} to ${state.val}`);
              await this.setStateAsync(idNoNamespace, { val: state.val, ack: true, c: "onStateChange" });
              await this.initAllApps();
            }
          } else {
            await this.initExpertApps();
          }
        } else if (idNoNamespace.match(/indicator\.[0-9]{1}\..*$/g)) {
          const matches = idNoNamespace.match(/indicator\.([0-9]{1})\.(.*)$/);
          const indicatorNo = matches ? parseInt(matches[1]) : void 0;
          const action = matches ? matches[2] : void 0;
          this.log.debug(`Changed indicator ${indicatorNo} with action ${action}`);
          if (indicatorNo && indicatorNo >= 1) {
            this.updateIndicatorByStates(indicatorNo).then(async (response) => {
              if (response.status === 200 && response.data === "OK") {
                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
              }
            }).catch((error) => {
              this.log.warn(`(indicator) Unable to perform action: ${error}`);
            });
          }
        }
      } else {
        this.log.warn(`Unable to perform action for ${idNoNamespace} - API is not connected (device not reachable?)`);
      }
    }
  }
  async onObjectChange(id, obj) {
    var _a;
    if (id && id == `system.adapter.${this.config.foreignSettingsInstance}`) {
      await this.importForeignSettings();
      if (this.apiConnected) {
        await this.createAppObjects();
        await this.initAllApps();
      }
    }
    if (id && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, id)) {
      if (!obj) {
        delete this.customAppsForeignStates[id];
      } else {
        this.customAppsForeignStates[id].type = obj == null ? void 0 : obj.common.type;
        this.customAppsForeignStates[id].unit = (_a = obj == null ? void 0 : obj.common) == null ? void 0 : _a.unit;
        this.refreshCustomApps(id);
      }
    }
  }
  onMessage(obj) {
    this.log.debug(`[onMessage] received command "${obj.command}" with message: ${JSON.stringify(obj.message)}`);
    if (obj && obj.message) {
      if (obj.command === "getBackgroundEffects") {
        this.sendTo(
          obj.from,
          obj.command,
          this.backgroundEffects.map((v) => ({ value: v, label: v })),
          obj.callback
        );
      } else if (obj.command === "notification" && typeof obj.message === "object") {
        if (this.apiConnected) {
          const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null));
          if (msgFiltered.repeat !== void 0 && msgFiltered.repeat <= 0) {
            delete msgFiltered.repeat;
          }
          if (msgFiltered.duration !== void 0 && msgFiltered.duration <= 0) {
            delete msgFiltered.duration;
          }
          this.buildRequestAsync("notify", "POST", msgFiltered).then((response) => {
            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
          }).catch((error) => {
            this.sendTo(obj.from, obj.command, { error }, obj.callback);
          });
        } else {
          this.sendTo(obj.from, obj.command, { error: "API is not connected (device offline ?)" }, obj.callback);
        }
      } else if (obj.command === "sound" && typeof obj.message === "object") {
        if (this.apiConnected) {
          const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null));
          this.buildRequestAsync("sound", "POST", msgFiltered).then((response) => {
            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
          }).catch((error) => {
            this.sendTo(obj.from, obj.command, { error }, obj.callback);
          });
        } else {
          this.sendTo(obj.from, obj.command, { error: "API is not connected (device offline ?)" }, obj.callback);
        }
      } else {
        this.log.error(`[onMessage] Received incomplete message via "sendTo"`);
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, { error: "Incomplete message" }, obj.callback);
        }
      }
    } else if (obj.callback) {
      this.sendTo(obj.from, obj.command, { error: "Invalid message" }, obj.callback);
    }
  }
  async setApiConnected(connection) {
    if (connection !== this.apiConnected) {
      await this.setStateChangedAsync("info.connection", { val: connection, ack: true });
      this.apiConnected = connection;
      if (connection) {
        this.log.debug("API is online");
        try {
          await this.refreshSettings();
          await this.refreshBackgroundEffects();
          await this.refreshTransitions();
          await this.createAppObjects();
          await this.initAllApps();
          await this.subscribeForeignStatesAsync(Object.keys(this.customAppsForeignStates));
          for (let i = 1; i <= 3; i++) {
            await this.updateIndicatorByStates(i);
          }
          await this.updateMoodlightByStates();
          this.buildRequestAsync("notify", "POST", {
            duration: 2,
            draw: [
              {
                dc: [16, 4, 3, "#164477"],
                dl: [16, 3, 16, 8, "#3399cc"],
                dp: [16, 1, "#3399cc"]
              }
            ]
          }).catch((error) => {
            this.log.warn(error);
          });
          if (this.config.downloadScreenContent && !this.downloadScreenContentInterval) {
            this.log.debug(`[setApiConnected] Downloading screen contents every ${this.config.downloadScreenContentInterval} seconds`);
            this.downloadScreenContentInterval = this.setInterval(() => {
              if (this.apiConnected) {
                this.buildRequestAsync("screen", "GET").then(async (response) => {
                  if (response.status === 200) {
                    const pixelData = response.data;
                    const width = 640;
                    const height = 160;
                    const scaleX = width / 32;
                    const scaleY = height / 8;
                    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 160">`;
                    for (let y = 0; y < 8; y++) {
                      for (let x = 0; x < 32; x++) {
                        const color = (0, import_color_convert.rgb565to888StrSvg)(pixelData[y * 32 + x]);
                        svg += `
  <rect style="fill: ${color}; stroke: #000000; stroke-width: 2px;" `;
                        svg += `x="${x * scaleX}" y="${y * scaleY}" width="${scaleX}" height="${scaleY}"/>`;
                      }
                    }
                    svg += "\n</svg>";
                    await this.setStateAsync("display.content", { val: svg, ack: true });
                  }
                }).catch((error) => {
                  this.log.debug(`(screen) received error: ${JSON.stringify(error)}`);
                });
              }
            }, this.config.downloadScreenContentInterval * 1e3);
          } else {
            await this.setStateAsync("display.content", { val: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"/>`, ack: true, c: "Feature disabled", q: 1 });
          }
        } catch (error) {
          this.log.error(`[setApiConnected] Unable to refresh settings, apps or indicators: ${error}`);
        }
      } else {
        if (this.downloadScreenContentInterval) {
          this.clearInterval(this.downloadScreenContentInterval);
          this.downloadScreenContentInterval = null;
        }
        await this.unsubscribeForeignStatesAsync(Object.keys(this.customAppsForeignStates));
        this.log.debug("API is offline");
      }
    }
  }
  refreshState() {
    this.log.debug("refreshing device state");
    this.buildRequestAsync("stats", "GET").then(async (response) => {
      if (response.status === 200) {
        const content = response.data;
        this.setApiConnected(true);
        if (this.isNewerVersion(content.version, this.supportedVersion) && !this.displayedVersionWarning) {
          this.log.warn(`You should update your Awtrix Light - supported version of this adapter is ${this.supportedVersion} (or later). Your current version is ${content.version}`);
          this.displayedVersionWarning = true;
        }
        await this.setStateChangedAsync("meta.version", { val: content.version, ack: true });
        await this.setStateChangedAsync("sensor.lux", { val: parseInt(content.lux), ack: true });
        await this.setStateChangedAsync("sensor.temp", { val: parseInt(content.temp), ack: true });
        await this.setStateChangedAsync("sensor.humidity", { val: parseInt(content.hum), ack: true });
        await this.setStateChangedAsync("display.brightness", { val: content.bri, ack: true });
        await this.setStateChangedAsync("device.battery", { val: content.bat, ack: true });
        await this.setStateChangedAsync("device.wifiSignal", { val: content.wifi_signal, ack: true });
        await this.setStateChangedAsync("device.freeRAM", { val: content.ram, ack: true });
        await this.setStateChangedAsync("device.uptime", { val: parseInt(content.uptime), ack: true });
      }
    }).catch((error) => {
      this.log.debug(`(stats) received error - API is now offline: ${JSON.stringify(error)}`);
      this.setApiConnected(false);
    });
    this.log.debug("re-creating refresh state timeout");
    this.refreshStateTimeout = this.refreshStateTimeout || this.setTimeout(() => {
      this.refreshStateTimeout = null;
      this.refreshState();
    }, 6e4);
  }
  async refreshSettings() {
    return new Promise((resolve, reject) => {
      this.buildRequestAsync("settings", "GET").then(async (response) => {
        var _a, _b, _c, _d;
        if (response.status === 200) {
          const content = response.data;
          const settingsStates = await this.getObjectViewAsync("system", "state", {
            startkey: `${this.namespace}.settings.`,
            endkey: `${this.namespace}.settings.\u9999`
          });
          const knownSettings = {};
          for (const settingsObj of settingsStates.rows) {
            if ((_b = (_a = settingsObj.value) == null ? void 0 : _a.native) == null ? void 0 : _b.settingsKey) {
              knownSettings[this.removeNamespace((_d = (_c = settingsObj.value) == null ? void 0 : _c.native) == null ? void 0 : _d.settingsKey)] = {
                id: settingsObj.id,
                role: settingsObj.value.common.role
              };
            }
          }
          for (const [settingsKey, val] of Object.entries(content)) {
            if (Object.prototype.hasOwnProperty.call(knownSettings, settingsKey)) {
              if (knownSettings[settingsKey].role === "level.color.rgb") {
                const newVal = (0, import_color_convert.rgb565to888Str)(val);
                this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${newVal} (converted from ${val})`);
                await this.setStateChangedAsync(knownSettings[settingsKey].id, { val: newVal, ack: true, c: "Updated from API (converted from RGB565)" });
              } else {
                this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${val}`);
                await this.setStateChangedAsync(knownSettings[settingsKey].id, { val, ack: true, c: "Updated from API" });
              }
            }
          }
        }
        resolve(response.status);
      }).catch((error) => {
        this.log.warn(`(settings) Received error: ${JSON.stringify(error)}`);
        reject(error);
      });
    });
  }
  async refreshBackgroundEffects() {
    return new Promise((resolve, reject) => {
      this.buildRequestAsync("effects").then((response) => {
        if (response.status === 200) {
          this.log.debug(`[refreshBackgroundEffects] Existing effects "${JSON.stringify(response.data)}"`);
          this.backgroundEffects = response.data;
          resolve(true);
        } else {
          reject(`${response.status}: ${response.data}`);
        }
      }).catch(reject);
    });
  }
  async refreshTransitions() {
    return new Promise((resolve, reject) => {
      this.buildRequestAsync("transitions").then((response) => {
        if (response.status === 200) {
          this.log.debug(`[refreshTransitions] Existing transitions "${JSON.stringify(response.data)}"`);
          const states = {};
          for (let i = 0; i < response.data.length; i++) {
            states[i] = response.data[i];
          }
          this.extendObjectAsync("settings.appTransitionEffect", {
            common: {
              states
            }
          }).then(() => {
            resolve();
          });
        } else {
          reject(`${response.status}: ${response.data}`);
        }
      }).catch(reject);
    });
  }
  async removeApp(name) {
    return new Promise((resolve, reject) => {
      if (this.apiConnected) {
        this.buildAppRequestAsync(name).then((response) => {
          if (response.status === 200 && response.data === "OK") {
            this.log.debug(`[removeApp] Removed customApp app "${name}"`);
            resolve(true);
          } else {
            reject(`${response.status}: ${response.data}`);
          }
        }).catch(reject);
      } else {
        reject("API not connected");
      }
    });
  }
  async initAllApps() {
    await this.initCustomApps();
    await this.initHistoryApps();
    await this.initExpertApps();
  }
  async initCustomApps() {
    var _a, _b;
    if (this.apiConnected) {
      for (const customApp of this.config.customApps) {
        if (customApp.name) {
          const text = String(customApp.text).trim();
          const appVisibleState = await this.getStateAsync(`apps.${customApp.name}.visible`);
          const appVisible = appVisibleState ? appVisibleState.val : true;
          if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
            await this.setStateAsync(`apps.${customApp.name}.visible`, { val: appVisible, ack: true, c: "initCustomApps" });
          }
          if (!appVisible) {
            this.log.debug(`[initCustomApps] Going to remove custom app "${customApp.name}" (was hidden by state: apps.${customApp.name}.visible)`);
            await this.removeApp(customApp.name).catch((error) => {
              this.log.warn(`Unable to remove customApp app "${customApp.name}" (hidden by state): ${error}`);
            });
          } else if (customApp.objId && text.includes("%s")) {
            try {
              const objId = customApp.objId;
              if (!Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, objId)) {
                const obj = await this.getForeignObjectAsync(objId);
                if (obj && obj.type === "state") {
                  const state = await this.getForeignStateAsync(objId);
                  this.customAppsForeignStates[objId] = {
                    val: state && state.ack ? state.val : void 0,
                    type: obj == null ? void 0 : obj.common.type,
                    unit: (_a = obj == null ? void 0 : obj.common) == null ? void 0 : _a.unit,
                    ts: state ? state.ts : Date.now()
                  };
                  const supportedTypes = ["string", "number", "mixed"];
                  if ((obj == null ? void 0 : obj.common.type) && !supportedTypes.includes(obj.common.type)) {
                    this.log.warn(
                      `[initCustomApps] Object of app "${customApp.name}" with objId "${objId}" has invalid type: ${obj.common.type} instead of ${supportedTypes.join(", ")}`
                    );
                  }
                  if (text.includes("%u") && !((_b = obj == null ? void 0 : obj.common) == null ? void 0 : _b.unit)) {
                    this.log.warn(
                      `[initCustomApps] Object of custom app "${customApp.name}" (${objId}) has no unit - remove "%u" from text or define unit in object (common.unit)`
                    );
                  }
                  if (state && !state.ack) {
                    this.log.info(`[initCustomApps] State value of custom app "${customApp.name}" (${objId}) is not acknowledged (ack: false) - waiting for new value`);
                  }
                  await this.subscribeForeignStatesAsync(objId);
                  await this.subscribeForeignObjectsAsync(objId);
                  this.log.debug(`[initCustomApps] Found custom app "${customApp.name}" with objId "${objId}" - subscribed to changes`);
                } else {
                  this.log.warn(`[initCustomApps] Custom app "${customApp.name}" was configured with invalid objId "${objId}": Invalid type ${obj == null ? void 0 : obj.type}`);
                }
              } else {
                this.log.debug(`[initCustomApps] Found custom app "${customApp.name}" with objId "${objId}" - already subscribed to changes`);
              }
            } catch (error) {
              this.log.error(`[initCustomApps] Unable to get object information for custom app "${customApp.name}": ${error}`);
            }
          } else if (text.length > 0) {
            this.log.debug(`[initCustomApps] Creating custom app "${customApp.name}" with icon "${customApp.icon}" and static text "${customApp.text}"`);
            if (customApp.objId) {
              this.log.warn(
                `[initCustomApps] Custom app "${customApp.name}" was defined with objId "${customApp.objId}" but "%s" is not used in the text - state changes will be ignored`
              );
            }
            const displayText = text.replace("%u", "").trim();
            if (displayText.length > 0) {
              await this.buildAppRequestAsync(customApp.name, this.createAppRequestObj(customApp, displayText)).catch((error) => {
                this.log.warn(`(custom?name=${customApp.name}) Unable to create custom app "${customApp.name}" with static text: ${error}`);
              });
            } else {
              this.log.debug(`[initCustomApps] Going to remove custom app "${customApp.name}" with static text (empty text)`);
              await this.removeApp(customApp.name).catch((error) => {
                this.log.warn(`Unable to remove customApp app "${customApp.name}" with static text (empty text): ${error}`);
              });
            }
          }
        } else {
          this.log.warn(`[initCustomApps] Found custom app without name (skipped) - please check instance configuartion`);
        }
      }
      for (const objId of Object.keys(this.customAppsForeignStates)) {
        await this.refreshCustomApps(objId);
      }
    }
  }
  async refreshCustomApps(objId) {
    var _a, _b;
    if (this.apiConnected && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, objId)) {
      this.log.debug(`[refreshCustomApps] Refreshing custom apps for objId "${objId}" with data ${JSON.stringify(this.customAppsForeignStates[objId])}`);
      for (const customApp of this.config.customApps) {
        if (customApp.name) {
          const text = String(customApp.text).trim();
          if (customApp.objId && customApp.objId === objId && text.includes("%s")) {
            this.log.debug(`[refreshCustomApps] Refreshing custom app "${customApp.name}" with icon "${customApp.icon}" and text "${customApp.text}"`);
            try {
              const appVisibleState = await this.getStateAsync(`apps.${customApp.name}.visible`);
              const appVisible = appVisibleState ? appVisibleState.val : true;
              if (appVisible) {
                const val = this.customAppsForeignStates[objId].val;
                if (typeof val !== "undefined") {
                  let newVal = val;
                  if (this.customAppsForeignStates[objId].type === "number") {
                    const oldVal = typeof val !== "number" ? parseFloat(val) : val;
                    const decimals = typeof customApp.decimals === "string" ? parseInt(customApp.decimals) : (_a = customApp.decimals) != null ? _a : 3;
                    if (!isNaN(oldVal) && oldVal % 1 !== 0) {
                      let countDecimals = String(val).split(".")[1].length || 2;
                      if (countDecimals > decimals) {
                        countDecimals = decimals;
                      }
                      const numFormat = this.config.numberFormat;
                      if (numFormat === "system") {
                        newVal = this.formatValue(oldVal, countDecimals);
                      } else if ([".,", ",."].includes(numFormat)) {
                        newVal = this.formatValue(oldVal, countDecimals, numFormat);
                      } else if (numFormat === ".") {
                        newVal = oldVal.toFixed(countDecimals);
                      } else if (numFormat === ",") {
                        newVal = oldVal.toFixed(countDecimals).replace(".", ",");
                      }
                      this.log.debug(`[refreshCustomApps] formatted value of objId "${objId}" from ${oldVal} to ${newVal} (${countDecimals} decimals) with "${numFormat}"`);
                    }
                  }
                  const displayText = text.replace("%s", newVal).replace("%u", (_b = this.customAppsForeignStates[objId].unit) != null ? _b : "").trim();
                  if (displayText.length > 0) {
                    await this.buildAppRequestAsync(customApp.name, this.createAppRequestObj(customApp, displayText, val)).catch((error) => {
                      this.log.warn(`(custom?name=${customApp.name}) Unable to update custom app "${customApp.name}": ${error}`);
                    });
                  } else {
                    this.log.debug(`[refreshCustomApps] Going to remove custom app "${customApp.name}" (empty text)`);
                    await this.removeApp(customApp.name).catch((error) => {
                      this.log.warn(`Unable to remove customApp app "${customApp.name}" (empty text): ${error}`);
                    });
                  }
                } else {
                  this.log.debug(`[refreshCustomApps] Going to remove custom app "${customApp.name}" (no state data)`);
                  await this.removeApp(customApp.name).catch((error) => {
                    this.log.warn(`Unable to remove customApp app "${customApp.name}" (no state data): ${error}`);
                  });
                }
              }
            } catch (error) {
              this.log.error(`[refreshCustomApps] Unable to refresh custom app "${customApp.name}": ${error}`);
            }
          }
        }
      }
    }
  }
  createAppRequestObj(customApp, text, val) {
    const moreOptions = {};
    if (customApp.useBackgroundEffect) {
      moreOptions.effect = customApp.backgroundEffect;
    } else if (customApp.backgroundColor) {
      moreOptions.background = customApp.backgroundColor;
    }
    if (customApp.rainbow) {
      moreOptions.rainbow = true;
    } else if (customApp.textColor) {
      moreOptions.color = customApp.textColor;
    }
    if (customApp.noScroll) {
      moreOptions.noScroll = true;
    } else {
      if (customApp.scrollSpeed > 0) {
        moreOptions.scrollSpeed = customApp.scrollSpeed;
      }
      if (customApp.repeat > 0) {
        moreOptions.repeat = customApp.repeat;
      }
    }
    if (customApp.icon) {
      moreOptions.icon = customApp.icon;
    }
    if (customApp.duration > 0) {
      moreOptions.duration = customApp.duration;
    }
    if (typeof val === "number") {
      if (customApp.thresholdLtActive && val < customApp.thresholdLtValue) {
        this.log.debug(`[createAppRequestObj] LT < custom app "${customApp.name}" has a value (${val}) less than ${customApp.thresholdLtValue} - overriding values`);
        if (customApp.thresholdLtIcon) {
          moreOptions.icon = customApp.thresholdLtIcon;
        }
        if (customApp.thresholdLtTextColor) {
          moreOptions.color = customApp.thresholdLtTextColor;
          moreOptions.rainbow = false;
        }
        if (customApp.thresholdLtBackgroundColor) {
          moreOptions.background = customApp.thresholdLtBackgroundColor;
          if (customApp.useBackgroundEffect) {
            delete moreOptions.effect;
          }
        }
      } else if (customApp.thresholdGtActive && val > customApp.thresholdGtValue) {
        this.log.debug(`[createAppRequestObj] GT > custom app "${customApp.name}" has a value (${val}) greater than ${customApp.thresholdGtValue} - overriding values`);
        if (customApp.thresholdGtIcon) {
          moreOptions.icon = customApp.thresholdGtIcon;
        }
        if (customApp.thresholdGtTextColor) {
          moreOptions.color = customApp.thresholdGtTextColor;
          moreOptions.rainbow = false;
        }
        if (customApp.thresholdGtBackgroundColor) {
          moreOptions.background = customApp.thresholdGtBackgroundColor;
          if (customApp.useBackgroundEffect) {
            delete moreOptions.effect;
          }
        }
      }
    }
    return {
      text,
      textCase: 2,
      pos: customApp.position,
      ...moreOptions
    };
  }
  async initHistoryApps() {
    var _a, _b, _c, _d;
    if (this.apiConnected && this.config.historyApps.length > 0) {
      const validSourceInstances = [];
      for (const historyApp of this.config.historyApps) {
        if (historyApp.sourceInstance && !validSourceInstances.includes(historyApp.sourceInstance)) {
          const sourceInstanceObj = await this.getForeignObjectAsync(`system.adapter.${historyApp.sourceInstance}`);
          if (sourceInstanceObj && ((_a = sourceInstanceObj.common) == null ? void 0 : _a.getHistory)) {
            const sourceInstanceAliveState = await this.getForeignStateAsync(`system.adapter.${historyApp.sourceInstance}.alive`);
            if (sourceInstanceAliveState && sourceInstanceAliveState.val) {
              this.log.debug(`[initHistoryApps] Found valid source instance for history data: ${historyApp.sourceInstance}`);
              validSourceInstances.push(historyApp.sourceInstance);
            } else {
              this.log.warn(`[initHistoryApps] Unable to get history data of "${historyApp.sourceInstance}": instance not running (stopped)`);
            }
          } else {
            this.log.warn(`[initHistoryApps] Unable to get history data of "${historyApp.sourceInstance}": no valid source for getHistory()`);
          }
        }
      }
      for (const historyApp of this.config.historyApps) {
        if (historyApp.name) {
          if (historyApp.objId && historyApp.sourceInstance) {
            this.log.debug(`[initHistoryApps] getting history data for app "${historyApp.name}" of "${historyApp.objId}" from ${historyApp.sourceInstance}`);
            try {
              const appVisibleState = await this.getStateAsync(`apps.${historyApp.name}.visible`);
              const appVisible = appVisibleState ? appVisibleState.val : true;
              if (appVisibleState && !(appVisibleState == null ? void 0 : appVisibleState.ack)) {
                await this.setStateAsync(`apps.${historyApp.name}.visible`, { val: appVisible, ack: true, c: "initHistoryApps" });
              }
              if (!appVisible) {
                this.log.debug(`[initHistoryApps] Going to remove history app "${historyApp.name}" (was hidden by state: apps.${historyApp.name}.visible)`);
                await this.removeApp(historyApp.name).catch((error) => {
                  this.log.warn(`Unable to remove history app "${historyApp.name}" (hidden by state): ${error}`);
                });
              } else if (validSourceInstances.includes(historyApp.sourceInstance)) {
                const sourceObj = await this.getForeignObjectAsync(historyApp.objId);
                if (sourceObj && Object.prototype.hasOwnProperty.call((_c = (_b = sourceObj == null ? void 0 : sourceObj.common) == null ? void 0 : _b.custom) != null ? _c : {}, historyApp.sourceInstance)) {
                  const itemCount = historyApp.icon ? 11 : 16;
                  const historyData = await this.sendToAsync(historyApp.sourceInstance, "getHistory", {
                    id: historyApp.objId,
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
                  this.log.debug(
                    `[initHistoryApps] History data for app "${historyApp.name}" of "${historyApp.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(lineData)}`
                  );
                  if (lineData.length > 0) {
                    const moreOptions = {};
                    if (historyApp.duration > 0) {
                      moreOptions.duration = historyApp.duration;
                    }
                    if (historyApp.repeat > 0) {
                      moreOptions.repeat = historyApp.repeat;
                    }
                    await this.buildAppRequestAsync(historyApp.name, {
                      color: historyApp.lineColor || "#FF0000",
                      background: historyApp.backgroundColor || "#000000",
                      line: lineData,
                      autoscale: true,
                      icon: historyApp.icon,
                      lifetime: this.config.historyAppsRefreshInterval + 60,
                      pos: historyApp.position,
                      ...moreOptions
                    }).catch((error) => {
                      this.log.warn(`(custom?name=${historyApp.name}) Unable to create history app "${historyApp.name}": ${error}`);
                    });
                  } else {
                    this.log.debug(`[initHistoryApps] Going to remove history app "${historyApp.name}" (no history data)`);
                    await this.removeApp(historyApp.name).catch((error) => {
                      this.log.warn(`Unable to remove history app "${historyApp.name}" (no history data): ${error}`);
                    });
                  }
                } else {
                  this.log.info(`[initHistoryApps] Unable to get history data for app "${historyApp.name}" of "${historyApp.objId}": logging is not configured for this object`);
                }
              } else {
                this.log.info(`[initHistoryApps] Unable to get history data for app "${historyApp.name}" of "${historyApp.objId}": source invalid or unavailable`);
              }
            } catch (error) {
              this.log.error(`[initHistoryApps] Unable to get history data for app "${historyApp.name}" of "${historyApp.objId}": ${error}`);
            }
          }
        } else {
          this.log.warn(`[initHistoryApps] Found history app without name (skipped) - please check instance configuartion`);
        }
      }
    }
    if (this.config.historyApps.length > 0) {
      this.log.debug(`re-creating history apps timeout (${(_d = this.config.historyAppsRefreshInterval) != null ? _d : 300} seconds)`);
      this.refreshHistoryAppsTimeout = this.refreshHistoryAppsTimeout || this.setTimeout(
        () => {
          this.refreshHistoryAppsTimeout = null;
          this.initHistoryApps();
        },
        this.config.historyAppsRefreshInterval * 1e3 || 300 * 1e3
      );
    }
  }
  async initExpertApps() {
  }
  async createAppObjects() {
    return new Promise((resolve, reject) => {
      if (this.apiConnected) {
        this.buildRequestAsync("apps", "GET").then(async (response) => {
          if (response.status === 200) {
            const content = response.data;
            const appPath = "apps";
            const customApps = this.config.customApps.map((a) => a.name);
            const historyApps = this.config.historyApps.map((a) => a.name);
            const expertApps = this.config.expertApps.map((a) => a.name);
            const existingApps = content.map((a) => a.name);
            const allApps = [...NATIVE_APPS, ...customApps, ...historyApps, ...expertApps];
            this.log.debug(`[createAppObjects] existing apps on awtrix light: ${JSON.stringify(existingApps)}`);
            const appsAll = [];
            const appsKeep = [];
            const existingChannels = await this.getChannelsOfAsync(appPath);
            if (existingChannels) {
              for (const existingChannel of existingChannels) {
                const id = this.removeNamespace(existingChannel._id);
                if (id.split(".").length === 2) {
                  appsAll.push(id);
                }
              }
            }
            for (const name of allApps) {
              appsKeep.push(`${appPath}.${name}`);
              this.log.debug(`[createAppObjects] found (keep): ${appPath}.${name}`);
              const isCustomApp = customApps.includes(name);
              const isHistoryApp = historyApps.includes(name);
              const isExpertApp = expertApps.includes(name);
              await this.extendObjectAsync(`${appPath}.${name}`, {
                type: "channel",
                common: {
                  name: `App`,
                  desc: `${name}${isCustomApp ? " (custom app)" : ""}${isHistoryApp ? " (history app)" : ""}${isExpertApp ? " (expert app)" : ""}`
                },
                native: {
                  isNativeApp: NATIVE_APPS.includes(name),
                  isCustomApp,
                  isHistoryApp,
                  isExpertApp
                }
              });
              await this.setObjectNotExistsAsync(`${appPath}.${name}.activate`, {
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
                    "zh-cn": "\u542F\u7528"
                  },
                  type: "boolean",
                  role: "button",
                  read: false,
                  write: true
                },
                native: {
                  name
                }
              });
              if (isCustomApp || isHistoryApp || isExpertApp) {
                await this.setObjectNotExistsAsync(`${appPath}.${name}.visible`, {
                  type: "state",
                  common: {
                    name: {
                      en: "Visible",
                      de: "Sichtbar",
                      ru: "\u0412\u0438\u0434\u0438\u043C\u044B\u0439",
                      pt: "Vis\xEDvel",
                      nl: "Vertaling:",
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
                  native: {
                    name
                  }
                });
                if (isExpertApp) {
                  await this.setObjectNotExistsAsync(`${appPath}.${name}.text`, {
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
                      write: true
                    },
                    native: {
                      name
                    }
                  });
                }
              }
            }
            for (const app of appsAll) {
              if (!appsKeep.includes(app)) {
                await this.delObjectAsync(app, { recursive: true });
                this.log.debug(`[createAppObjects] deleted: ${app}`);
              }
            }
            if (this.config.autoDeleteForeignApps) {
              for (const name of existingApps.filter((a) => !allApps.includes(a))) {
                this.log.info(`[createAppObjects] Deleting unknown app on awtrix light with name "${name}"`);
                try {
                  await this.removeApp(name).catch((error) => {
                    this.log.warn(`Unable to remove unknown app "${name}": ${error}`);
                  });
                } catch (error) {
                  this.log.error(`[createAppObjects] Unable to delete unknown app ${name}: ${error}`);
                }
              }
            }
            resolve(appsKeep.length);
          } else {
            this.log.warn(`[createAppObjects] received status code: ${response.status}`);
            reject(`received status code: ${response.status}`);
          }
        }).catch((error) => {
          this.log.debug(`[createAppObjects] received error: ${JSON.stringify(error)}`);
          reject(error);
        });
      }
    });
  }
  async updateIndicatorByStates(index) {
    this.log.debug(`Updating indicator with index ${index}`);
    const indicatorStates = await this.getStatesAsync(`indicator.${index}.*`);
    const indicatorValues = Object.entries(indicatorStates).reduce(
      (acc, [objId, state]) => ({
        ...acc,
        [this.removeNamespace(objId)]: state.val
      }),
      {}
    );
    const postObj = {
      color: indicatorValues[`indicator.${index}.color`]
    };
    if (postObj.color !== "0") {
      const blink = indicatorValues[`indicator.${index}.blink`];
      if (blink > 0) {
        postObj.blink = blink;
      }
    }
    return this.buildRequestAsync(`indicator${index}`, "POST", indicatorValues[`indicator.${index}.active`] ? postObj : void 0);
  }
  async updateMoodlightByStates() {
    this.log.debug(`Updating moodlight`);
    const moodlightStates = await this.getStatesAsync("display.moodlight.*");
    const moodlightValues = Object.entries(moodlightStates).reduce(
      (acc, [objId, state]) => ({
        ...acc,
        [this.removeNamespace(objId)]: state.val
      }),
      {}
    );
    const postObj = {
      brightness: moodlightValues["display.moodlight.brightness"],
      color: String(moodlightValues["display.moodlight.color"]).toUpperCase()
    };
    return this.buildRequestAsync("moodlight", "POST", moodlightValues["display.moodlight.active"] ? postObj : void 0);
  }
  async buildAppRequestAsync(name, data) {
    return this.buildRequestAsync(`custom?name=${name}`, "POST", data);
  }
  async buildRequestAsync(service, method, data) {
    return new Promise((resolve, reject) => {
      const url = `/api/${service}`;
      const timeout = this.config.httpTimeout * 1e3 || 3e3;
      if (this.config.awtrixIp) {
        if (data) {
          this.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);
        } else {
          this.log.debug(`sending "${method}" request to "${url}" without data`);
        }
        (0, import_axios.default)({
          method,
          data,
          baseURL: `http://${this.config.awtrixIp}:80`,
          url,
          timeout,
          auth: {
            username: this.config.userName,
            password: this.config.userPassword
          },
          validateStatus: (status) => {
            return [200, 201].indexOf(status) > -1;
          },
          responseType: "json"
        }).then((response) => {
          this.log.debug(`received ${response.status} response from "${url}" with content: ${JSON.stringify(response.data)}`);
          this.lastErrorCode = -1;
          resolve(response);
        }).catch((error) => {
          if (error.response) {
            if (error.response.status === 401) {
              this.log.warn("Unable to perform request. Looks like the device is protected with username / password. Check instance configuration!");
            } else {
              this.log.warn(`received ${error.response.status} response from ${url} with content: ${JSON.stringify(error.response.data)}`);
            }
          } else if (error.request) {
            if (error.code === this.lastErrorCode) {
              this.log.debug(error.message);
            } else {
              this.log.info(`error ${error.code} from ${url}: ${error.message}`);
              this.lastErrorCode = error.code;
            }
          } else {
            this.log.error(error.message);
          }
          reject(error);
        });
      } else {
        reject("Device IP is not configured");
      }
    });
  }
  removeNamespace(id) {
    const re = new RegExp(this.namespace + "*\\.", "g");
    return id.replace(re, "");
  }
  async onUnload(callback) {
    try {
      if (this.config.removeAppsOnStop) {
        const customApps = this.config.customApps.map((a) => a.name);
        const historyApps = this.config.historyApps.map((a) => a.name);
        for (const name of [...customApps, ...historyApps]) {
          this.log.info(`[onUnload] Deleting app on awtrix light with name "${name}"`);
          try {
            await this.removeApp(name).catch((error) => {
              this.log.warn(`Unable to remove unknown app "${name}": ${error}`);
            });
          } catch (error) {
            this.log.error(`[onUnload] Unable to delete app ${name}: ${error}`);
          }
        }
      }
      await this.setApiConnected(false);
      if (this.refreshStateTimeout) {
        this.log.debug("clearing refresh state timeout");
        this.clearTimeout(this.refreshStateTimeout);
      }
      if (this.refreshHistoryAppsTimeout) {
        this.log.debug("clearing history apps timeout");
        this.clearTimeout(this.refreshHistoryAppsTimeout);
      }
      if (this.downloadScreenContentInterval) {
        this.clearInterval(this.downloadScreenContentInterval);
        this.downloadScreenContentInterval = null;
      }
      callback();
    } catch (e) {
      callback();
    }
  }
  isNewerVersion(oldVer, newVer) {
    const oldParts = oldVer.split(".");
    const newParts = newVer.split(".");
    for (let i = 0; i < newParts.length; i++) {
      const a = ~~newParts[i];
      const b = ~~oldParts[i];
      if (a > b)
        return true;
      if (a < b)
        return false;
    }
    return false;
  }
}
if (require.main !== module) {
  module.exports = (options) => new AwtrixLight(options);
} else {
  (() => new AwtrixLight())();
}
//# sourceMappingURL=main.js.map

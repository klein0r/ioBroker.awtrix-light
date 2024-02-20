"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var main_exports = {};
__export(main_exports, {
  AwtrixLight: () => AwtrixLight
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var import_color_convert = require("./lib/color-convert");
var import_api = require("./lib/api");
var import_custom = require("./lib/app-type/custom");
var import_expert = require("./lib/app-type/expert");
var import_history = require("./lib/app-type/history");
const NATIVE_APPS = ["Time", "Date", "Temperature", "Humidity", "Battery"];
class AwtrixLight extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "awtrix-light",
      useFormatDate: true
    });
    this.supportedVersion = "0.94";
    this.displayedVersionWarning = false;
    this.apiClient = null;
    this.apiConnected = false;
    this.refreshStateTimeout = null;
    this.downloadScreenContentInterval = null;
    this.apps = [];
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
      this.apiClient = new import_api.AwtrixApi.Client(this, this.config.awtrixIp, 80, this.config.httpTimeout, this.config.userName, this.config.userPassword);
    }
    if (this.config.foreignSettingsInstance && this.config.foreignSettingsInstance !== this.namespace) {
      await this.subscribeForeignObjectsAsync(`system.adapter.${this.config.foreignSettingsInstance}`);
      await this.importForeignSettings();
    }
    let pos = 0;
    for (const customApp of this.config.customApps) {
      if (!this.findAppWithName(customApp.name)) {
        if (!this.config.customPositions) {
          customApp.position = pos++;
        }
        this.apps.push(new import_custom.AppType.Custom(this.apiClient, this, customApp));
      }
    }
    for (const historyApp of this.config.historyApps) {
      if (!this.findAppWithName(historyApp.name)) {
        if (!this.config.customPositions) {
          historyApp.position = pos++;
        }
        this.apps.push(new import_history.AppType.History(this.apiClient, this, historyApp));
      }
    }
    for (const expertApp of this.config.expertApps) {
      if (!this.findAppWithName(expertApp.name)) {
        if (!this.config.customPositions) {
          expertApp.position = pos++;
        }
        this.apps.push(new import_expert.AppType.Expert(this.apiClient, this, expertApp));
      }
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
    if (id && state && !state.ack) {
      const idNoNamespace = this.removeNamespace(id);
      this.log.debug(`state ${idNoNamespace} changed: ${state.val}`);
      if (this.apiClient.isConnected()) {
        if (idNoNamespace.startsWith("settings.")) {
          this.log.debug(`changing setting ${idNoNamespace} power to ${state.val}`);
          const settingsObj = await this.getObjectAsync(idNoNamespace);
          if (settingsObj && ((_a = settingsObj.native) == null ? void 0 : _a.settingsKey)) {
            (_b = this.apiClient) == null ? void 0 : _b.settingsRequestAsync({ key: settingsObj.native.settingsKey, value: state.val }).then(async (response) => {
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
          this.apiClient.requestAsync("power", "POST", { power: state.val }).then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
            }
          }).catch((error) => {
            this.log.warn(`(power) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "device.sleep") {
          this.log.debug(`enable sleep mode of device for ${state.val} seconds`);
          this.apiClient.requestAsync("sleep", "POST", { sleep: state.val }).then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
              this.setApiConnected(false);
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
          this.apiClient.requestAsync("doupdate", "POST").then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              this.log.info("started firmware update");
              this.setApiConnected(false);
            }
          }).catch((error) => {
            this.log.warn(`(doupdate) Unable to execute firmware update (maybe this is already the newest version): ${error}`);
          });
        } else if (idNoNamespace === "device.reboot") {
          this.apiClient.requestAsync("reboot", "POST").then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              this.log.info("rebooting device");
              this.setApiConnected(false);
            }
          }).catch((error) => {
            this.log.warn(`(reboot) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "notification.dismiss") {
          this.apiClient.requestAsync("notify/dismiss", "POST").then(async (response) => {
            if (response.status === 200 && response.data === "OK") {
              this.log.info("dismissed notifications");
            }
          }).catch((error) => {
            this.log.warn(`(notify/dismiss) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "apps.next") {
          this.log.debug("switching to next app");
          this.apiClient.requestAsync("nextapp", "POST").catch((error) => {
            this.log.warn(`(nextapp) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace === "apps.prev") {
          this.log.debug("switching to previous app");
          this.apiClient.requestAsync("previousapp", "POST").catch((error) => {
            this.log.warn(`(previousapp) Unable to execute action: ${error}`);
          });
        } else if (idNoNamespace.startsWith("apps.")) {
          if (idNoNamespace.endsWith(".activate")) {
            if (state.val) {
              const sourceObj = await this.getObjectAsync(idNoNamespace);
              if (sourceObj && ((_c = sourceObj.native) == null ? void 0 : _c.name)) {
                this.log.debug(`activating app ${sourceObj.native.name}`);
                this.apiClient.requestAsync("switch", "POST", { name: sourceObj.native.name }).catch((error) => {
                  this.log.warn(`(switch) Unable to execute action: ${error}`);
                });
              }
            } else {
              this.log.warn(`Received invalid value for state ${idNoNamespace}`);
            }
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async onObjectChange(id, obj) {
    if (id && id == `system.adapter.${this.config.foreignSettingsInstance}`) {
      await this.importForeignSettings();
      this.restart();
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
        if (this.apiClient.isConnected()) {
          const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null));
          if (msgFiltered.repeat !== void 0 && msgFiltered.repeat <= 0) {
            delete msgFiltered.repeat;
          }
          if (msgFiltered.duration !== void 0 && msgFiltered.duration <= 0) {
            delete msgFiltered.duration;
          }
          this.apiClient.requestAsync("notify", "POST", msgFiltered).then((response) => {
            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
          }).catch((error) => {
            this.sendTo(obj.from, obj.command, { error }, obj.callback);
          });
        } else {
          this.sendTo(obj.from, obj.command, { error: "API is not connected (device offline ?)" }, obj.callback);
        }
      } else if (obj.command === "sound" && typeof obj.message === "object") {
        if (this.apiClient.isConnected()) {
          const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null));
          this.apiClient.requestAsync("sound", "POST", msgFiltered).then((response) => {
            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
          }).catch((error) => {
            this.sendTo(obj.from, obj.command, { error }, obj.callback);
          });
        } else {
          this.sendTo(obj.from, obj.command, { error: "API is not connected (device offline ?)" }, obj.callback);
        }
      } else if (obj.command === "rtttl" && typeof obj.message === "string") {
        this.apiClient.requestAsync("rtttl", "POST", obj.message).then((response) => {
          this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
        }).catch((error) => {
          this.sendTo(obj.from, obj.command, { error }, obj.callback);
        });
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
          this.apiClient.requestAsync("notify", "POST", {
            duration: 2,
            draw: [
              {
                dc: [16, 4, 3, "#164477"],
                // [x, y, r, cl] Draw a circle with center at (x, y), radius r, and color cl
                dl: [16, 3, 16, 8, "#3399cc"],
                // [x0, y0, x1, y1, cl] Draw a line from (x0, y0) to (x1, y1) with color cl
                dp: [16, 1, "#3399cc"]
                // [x, y, cl] Draw a pixel at position (x, y) with color cl
              }
            ]
          }).catch((error) => {
            this.log.warn(error);
          });
          await this.refreshSettings();
          await this.refreshBackgroundEffects();
          await this.refreshTransitions();
          await this.createAppObjects();
          for (const app of this.apps) {
            if (await app.init()) {
              await app.refresh();
            }
          }
          for (let i = 1; i <= 3; i++) {
            await this.updateIndicatorByStates(i);
          }
          await this.updateMoodlightByStates();
          if (this.config.downloadScreenContent && !this.downloadScreenContentInterval) {
            this.log.debug(`[setApiConnected] Downloading screen contents every ${this.config.downloadScreenContentInterval} seconds`);
            this.downloadScreenContentInterval = this.setInterval(() => {
              if (this.apiClient.isConnected()) {
                this.apiClient.requestAsync("screen", "GET").then(async (response) => {
                  if (response.status === 200) {
                    const pixelData = response.data;
                    const width = 640;
                    const height = 160;
                    const scaleX = width / 32;
                    const scaleY = height / 8;
                    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 160">`;
                    for (let y = 0; y < 8; y++) {
                      for (let x = 0; x < 32; x++) {
                        const color = (0, import_color_convert.rgb565to888Str)(pixelData[y * 32 + x]);
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
        this.log.debug("API is offline");
      }
    }
  }
  refreshState() {
    this.log.debug("refreshing device state");
    this.apiClient.getStatsAsync().then(async (content) => {
      await this.setApiConnected(true);
      if (this.isNewerVersion(content.version, this.supportedVersion) && !this.displayedVersionWarning) {
        this.log.warn(`You should update your Awtrix Light - supported version of this adapter is ${this.supportedVersion} (or later). Your current version is ${content.version}`);
        this.displayedVersionWarning = true;
      }
      await this.setStateChangedAsync("meta.uid", { val: content.uid, ack: true });
      await this.setStateChangedAsync("meta.version", { val: content.version, ack: true });
      await this.setStateChangedAsync("sensor.lux", { val: parseInt(content.lux), ack: true });
      await this.setStateChangedAsync("sensor.temp", { val: parseInt(content.temp), ack: true });
      await this.setStateChangedAsync("sensor.humidity", { val: parseInt(content.hum), ack: true });
      await this.setStateChangedAsync("display.brightness", { val: content.bri, ack: true });
      await this.setStateChangedAsync("device.battery", { val: content.bat, ack: true });
      await this.setStateChangedAsync("device.ipAddress", { val: content.ip_address, ack: true });
      await this.setStateChangedAsync("device.wifiSignal", { val: content.wifi_signal, ack: true });
      await this.setStateChangedAsync("device.freeRAM", { val: content.ram, ack: true });
      await this.setStateChangedAsync("device.uptime", { val: parseInt(content.uptime), ack: true });
    }).catch((error) => {
      this.log.debug(`(stats) received error - API is now offline: ${JSON.stringify(error)}`);
      this.setApiConnected(false);
    });
    this.log.debug("re-creating refresh state timeout");
    this.refreshStateTimeout = this.refreshStateTimeout || this.setTimeout(() => {
      this.refreshStateTimeout = null;
      this.refreshState();
    }, 60 * 1e3);
  }
  async refreshSettings() {
    return new Promise((resolve, reject) => {
      this.apiClient.requestAsync("settings", "GET").then(async (response) => {
        var _a, _b;
        if (response.status === 200) {
          const content = response.data;
          const settingsStates = await this.getObjectViewAsync("system", "state", {
            startkey: `${this.namespace}.settings.`,
            endkey: `${this.namespace}.settings.\u9999`
          });
          const knownSettings = {};
          for (const settingsObj of settingsStates.rows) {
            if ((_b = (_a = settingsObj.value) == null ? void 0 : _a.native) == null ? void 0 : _b.settingsKey) {
              knownSettings[settingsObj.value.native.settingsKey] = {
                id: this.removeNamespace(settingsObj.id),
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
      this.apiClient.requestAsync("effects").then((response) => {
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
      this.apiClient.requestAsync("transitions").then((response) => {
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
  findAppWithName(name) {
    return this.apps.find((app) => app.getName() === name);
  }
  async createAppObjects() {
    return new Promise((resolve, reject) => {
      if (this.apiClient.isConnected()) {
        this.apiClient.requestAsync("apps", "GET").then(async (response) => {
          if (response.status === 200) {
            const content = response.data;
            const customApps = this.config.customApps.map((a) => a.name);
            const historyApps = this.config.historyApps.map((a) => a.name);
            const expertApps = this.config.expertApps.map((a) => a.name);
            const existingApps = content.map((a) => a.name);
            const allApps = [...NATIVE_APPS, ...customApps, ...historyApps, ...expertApps];
            this.log.debug(`[createAppObjects] existing apps on awtrix light: ${JSON.stringify(existingApps)}`);
            const appsAll = [];
            const appsKeep = [];
            const existingChannels = await this.getChannelsOfAsync("apps");
            if (existingChannels) {
              for (const existingChannel of existingChannels) {
                const id = this.removeNamespace(existingChannel._id);
                if (id.split(".").length === 2) {
                  appsAll.push(id);
                }
              }
            }
            for (const name of allApps) {
              appsKeep.push(`apps.${name}`);
              this.log.debug(`[createAppObjects] found (keep): apps.${name}`);
              const isCustomApp = customApps.includes(name);
              const isHistoryApp = historyApps.includes(name);
              const isExpertApp = expertApps.includes(name);
              await this.extendObjectAsync(`apps.${name}`, {
                type: "channel",
                common: {
                  name: `App ${name}`,
                  desc: `${isCustomApp ? "custom app" : ""}${isHistoryApp ? "history app" : ""}${isExpertApp ? "expert app" : ""}`
                },
                native: {
                  isNativeApp: NATIVE_APPS.includes(name),
                  isCustomApp,
                  isHistoryApp,
                  isExpertApp
                }
              });
              await this.setObjectNotExistsAsync(`apps.${name}.activate`, {
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
                    //uk: 'Активувати',
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
              const app = this.findAppWithName(name);
              if (app) {
                await app.createObjects();
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
                  await this.apiClient.removeAppAsync(name).catch((error) => {
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
      } else {
        reject("API_OFFLINE");
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
      } else {
        const fade = indicatorValues[`indicator.${index}.fade`];
        postObj.fade = fade;
      }
    }
    return this.apiClient.indicatorRequestAsync(index, indicatorValues[`indicator.${index}.active`] ? postObj : void 0);
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
    return this.apiClient.requestAsync("moodlight", "POST", moodlightValues["display.moodlight.active"] ? postObj : void 0);
  }
  removeNamespace(id) {
    const re = new RegExp(this.namespace + "*\\.", "g");
    return id.replace(re, "");
  }
  async onUnload(callback) {
    try {
      for (const app of this.apps) {
        await app.unloadAsync();
      }
      await this.setApiConnected(false);
      if (this.refreshStateTimeout) {
        this.log.debug("clearing refresh state timeout");
        this.clearTimeout(this.refreshStateTimeout);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AwtrixLight
});
//# sourceMappingURL=main.js.map

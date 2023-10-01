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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var api_exports = {};
__export(api_exports, {
  AwtrixApi: () => AwtrixApi
});
module.exports = __toCommonJS(api_exports);
var import_axios = __toESM(require("axios"));
var AwtrixApi;
((AwtrixApi2) => {
  class Client {
    constructor(adapter, ipAddress, port, httpTimeout, userName, userPassword) {
      this.adapter = adapter;
      this.ipAddress = ipAddress;
      this.port = port;
      this.httpTimeout = httpTimeout;
      this.adapter.log.info(`Starting - connecting to http://${this.ipAddress}:${this.port}/`);
      this.apiConnected = false;
      if (userName) {
        this.auth = {
          username: userName,
          password: userPassword
        };
      }
      this.lastErrorCode = -1;
    }
    isConnected() {
      return this.apiConnected;
    }
    async getStatsAsync() {
      return new Promise((resolve, reject) => {
        this.requestAsync("stats", "GET").then(async (response) => {
          if (response.status === 200) {
            this.apiConnected = true;
            resolve(response.data);
          } else {
            reject(response);
          }
        }).catch((error) => {
          this.apiConnected = false;
          reject(error);
        });
      });
    }
    async removeAppAsync(name) {
      return new Promise((resolve, reject) => {
        if (this.apiConnected) {
          this.appRequestAsync(name).then((response) => {
            if (response.status === 200 && response.data === "OK") {
              this.adapter.log.debug(`[removeApp] Removed customApp app "${name}"`);
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
    async settingsRequestAsync(data) {
      return this.requestAsync("settings", "POST", { [data.key]: data.value });
    }
    async appRequestAsync(name, data) {
      return this.requestAsync(`custom?name=${name}`, "POST", data);
    }
    async requestAsync(service, method, data) {
      return new Promise((resolve, reject) => {
        const url = `/api/${service}`;
        const timeout = this.httpTimeout * 1e3 || 3e3;
        if (this.ipAddress) {
          if (data) {
            this.adapter.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);
          } else {
            this.adapter.log.debug(`sending "${method}" request to "${url}" without data`);
          }
          (0, import_axios.default)({
            method,
            data,
            baseURL: `http://${this.ipAddress}:${this.port}`,
            url,
            timeout,
            auth: this.auth,
            validateStatus: (status) => {
              return [200, 201].indexOf(status) > -1;
            },
            responseType: "json",
            headers: {
              "Content-Type": typeof data === "string" ? "text/plain" : "application/json"
            }
          }).then((response) => {
            this.adapter.log.debug(`received ${response.status} response from "${url}" with content: ${JSON.stringify(response.data)}`);
            this.lastErrorCode = -1;
            resolve(response);
          }).catch((error) => {
            if (error.response) {
              if (error.response.status === 401) {
                this.adapter.log.warn("Unable to perform request. Looks like the device is protected with username / password. Check instance configuration!");
              } else {
                this.adapter.log.warn(`received ${error.response.status} response from ${url} with content: ${JSON.stringify(error.response.data)}`);
              }
            } else if (error.request) {
              if (error.code === this.lastErrorCode) {
                this.adapter.log.debug(error.message);
              } else {
                this.adapter.log.info(`error ${error.code} from ${url}: ${error.message}`);
                this.lastErrorCode = error.code;
              }
            } else {
              this.adapter.log.error(error.message);
            }
            reject(error);
          });
        } else {
          reject("Device IP is not configured");
        }
      });
    }
  }
  AwtrixApi2.Client = Client;
})(AwtrixApi || (AwtrixApi = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AwtrixApi
});
//# sourceMappingURL=api.js.map

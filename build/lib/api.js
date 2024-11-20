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
var api_exports = {};
__export(api_exports, {
  AwtrixApi: () => AwtrixApi
});
module.exports = __toCommonJS(api_exports);
var import_axios = __toESM(require("axios"));
var AwtrixApi;
((AwtrixApi2) => {
  class Client {
    adapter;
    axiosInstance = void 0;
    apiConnected = false;
    lastErrorCode = -1;
    constructor(adapter, ipAddress, port, httpTimeout, userName, userPassword) {
      this.adapter = adapter;
      this.adapter.log.info(`Starting - connecting to http://${ipAddress}:${port}/`);
      let httpAuth = void 0;
      if (userName) {
        httpAuth = {
          username: userName,
          password: userPassword
        };
      }
      this.axiosInstance = import_axios.default.create({
        baseURL: `http://${ipAddress}:${port}/api/`,
        timeout: httpTimeout * 1e3 || 3e3,
        auth: httpAuth,
        validateStatus: (status) => {
          return [200, 201].indexOf(status) > -1;
        },
        responseType: "json"
      });
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
    async indicatorRequestAsync(index, data) {
      return this.requestAsync(`indicator${index}`, "POST", data);
    }
    async appRequestAsync(name, data) {
      return this.requestAsync(`custom?name=${name}`, "POST", data);
    }
    async requestAsync(url, method, data) {
      return new Promise((resolve, reject) => {
        if (data) {
          this.adapter.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);
        } else {
          this.adapter.log.debug(`sending "${method}" request to "${url}" without data`);
        }
        this.axiosInstance.request({
          url,
          method,
          data,
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

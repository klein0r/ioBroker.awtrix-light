import axios, { AxiosResponse } from 'axios';
import { AwtrixLight } from '../main';

export namespace AwtrixApi {
    export type App = {
        text?: string;
        textCase?: number;
        topText?: boolean;
        textOffset?: number;
        center?: boolean;
        color?: string;
        gradient?: string;
        blinkText?: number;
        fadeText?: number;
        background?: string;
        rainbow?: boolean;
        icon?: string;
        pushIcon?: number;
        repeat?: number;
        duration?: number;
        bar?: Array<number>;
        line?: Array<number>;
        autoscale?: boolean;
        progress?: number;
        progressC?: string;
        progressBC?: string;
        pos?: number;
        draw?: Array<object>;
        lifetime?: number;
        lifetimeMode?: number;
        noScroll?: boolean;
        scrollSpeed?: number;
        effect?: string;
        effectSettings?: Array<object>;
        save?: boolean;
    }

    export type Settings = {
        key: string,
        value: any;
    }

    export type Indicator = {
        color?: string;
        blink?: number;
    }

    export type Moodlight = {
        brightness?: number;
        color?: string;
    }

    export class Client {
        private adapter: AwtrixLight;

        private ipAddress: string;
        private port: number;
        private httpTimeout: number;
        
        private apiConnected: boolean;
        private auth: axios.AxiosBasicCredentials | undefined;

        private lastErrorCode: number;

        public constructor(adapter: AwtrixLight, ipAddress: string, port: number, httpTimeout: number, userName: string, userPassword: string) {
            this.adapter = adapter;

            this.ipAddress = ipAddress;
            this.port = port;
            this.httpTimeout = httpTimeout;

            this.adapter.log.info(`Starting - connecting to http://${this.ipAddress}:${this.port}/`);

            this.apiConnected = false;

            if (userName) {
                this.auth = {
                    username: userName,
                    password: userPassword,
                };
            }

            this.lastErrorCode = -1;
        }

        public isConnected() {
            return this.apiConnected;
        }

        public async getStatsAsync() : Promise<any> {
            return new Promise<any>((resolve, reject) => {
                this.requestAsync('stats', 'GET')
                    .then(async (response) => {
                        if (response.status === 200) {
                            this.apiConnected = true;
                            resolve(response.data);
                        } else {
                            reject(response);
                        }
                    })
                    .catch((error) => {
                        this.apiConnected = false;
                        reject(error);
                    });
            });
        }

        public async removeAppAsync(name: string): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                if (this.apiConnected) {
                    this.appRequestAsync(name)
                        .then((response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.adapter.log.debug(`[removeApp] Removed customApp app "${name}"`);
                                resolve(true);
                            } else {
                                reject(`${response.status}: ${response.data}`);
                            }
                        })
                        .catch(reject);
                } else {
                    reject('API not connected');
                }
            });
        }

        public async settingsRequestAsync(data: AwtrixApi.Settings): Promise<AxiosResponse> {
            return this.requestAsync('settings', 'POST', { [data.key]: data.value })
        }

        public async appRequestAsync(name: string, data?: AwtrixApi.App): Promise<AxiosResponse> {
            return this.requestAsync(`custom?name=${name}`, 'POST', data);
        }

        public async requestAsync(service: string, method?: string, data?: object): Promise<AxiosResponse> {
            return new Promise<AxiosResponse>((resolve, reject) => {
                const url = `/api/${service}`;
                const timeout = this.httpTimeout * 1000 || 3000;

                if (this.ipAddress) {
                    if (data) {
                        this.adapter.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);
                    } else {
                        this.adapter.log.debug(`sending "${method}" request to "${url}" without data`);
                    }

                    axios({
                        method,
                        data,
                        baseURL: `http://${this.ipAddress}:${this.port}`,
                        url,
                        timeout,
                        auth: this.auth,
                        validateStatus: (status) => {
                            return [200, 201].indexOf(status) > -1;
                        },
                        responseType: 'json',
                    })
                        .then((response) => {
                            this.adapter.log.debug(`received ${response.status} response from "${url}" with content: ${JSON.stringify(response.data)}`);

                            // no error - clear up reminder
                            this.lastErrorCode = -1;

                            resolve(response);
                        })
                        .catch((error) => {
                            if (error.response) {
                                // The request was made and the server responded with a status code

                                if (error.response.status === 401) {
                                    this.adapter.log.warn('Unable to perform request. Looks like the device is protected with username / password. Check instance configuration!');
                                } else {
                                    this.adapter.log.warn(`received ${error.response.status} response from ${url} with content: ${JSON.stringify(error.response.data)}`);
                                }
                            } else if (error.request) {
                                // The request was made but no response was received
                                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                                // http.ClientRequest in node.js

                                // avoid spamming of the same error when stuck in a reconnection loop
                                if (error.code === this.lastErrorCode) {
                                    this.adapter.log.debug(error.message);
                                } else {
                                    this.adapter.log.info(`error ${error.code} from ${url}: ${error.message}`);
                                    this.lastErrorCode = error.code;
                                }
                            } else {
                                // Something happened in setting up the request that triggered an Error
                                this.adapter.log.error(error.message);
                            }

                            reject(error);
                        });
                } else {
                    reject('Device IP is not configured');
                }
            });
        }
    }
}

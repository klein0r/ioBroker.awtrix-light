'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios').default;
const adapterName = require('./package.json').name.split('.').pop();

class AwtrixLight extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: adapterName,
        });

        this.supportedVersion = '0.62';
        this.displayedVersionWarning = false;

        this.refreshStateTimeout = null;

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.setState('info.connection', { val: false, ack: true });

        await this.subscribeStatesAsync('*');

        this.refreshState();
    }

    /**
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (id && state && !state.ack) {
            const idNoNamespace = this.removeNamespace(id);

            this.log.debug(`state ${idNoNamespace} changed: ${state.val}`);

            if (idNoNamespace === 'display.power') {
                this.log.debug(`changing display power to ${state.val}`);

                this.buildRequest(
                    'power',
                    async (content) => {
                        if (content === 'OK') {
                            await this.setStateChangedAsync('display.power', { val: state.val, ack: true });
                        }
                    },
                    'POST',
                    {
                        power: state.val,
                    },
                );
            } else if (idNoNamespace === 'apps.next') {
                this.log.debug('switching to next app');

                this.buildRequest('nextapp', null, 'POST', null);
            } else if (idNoNamespace === 'apps.prev') {
                this.log.debug('switching to previous app');

                this.buildRequest('previousapp', null, 'POST', null);
            }
        }
    }

    /**
     * @param {ioBroker.Message} obj
     */
    onMessage(obj) {
        this.log.debug(`[onMessage] received message: ${JSON.stringify(obj.message)}`);

        if (obj && obj.message) {
            // Notification
            if (obj.command === 'notification' && typeof obj.message === 'object') {
                // Todo
            } else {
                this.log.error(`[onMessage] Received incomplete message via "sendTo"`);

                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, { error: 'Incomplete message' }, obj.callback);
                }
            }
        } else if (obj.callback) {
            this.sendTo(obj.from, obj.command, { error: 'Invalid message' }, obj.callback);
        }
    }

    refreshState() {
        this.log.debug('refreshing device state');

        this.buildRequest(
            'stats',
            async (content) => {
                await this.setStateAsync('info.connection', { val: true, ack: true });

                if (this.isNewerVersion(content.version, this.supportedVersion) && !this.displayedVersionWarning) {
                    this.log.warn(`You should update your Awtrix Light - supported version of this adapter is ${this.supportedVersion} (or later). Your current version is ${content.version}`);
                    this.displayedVersionWarning = true; // Just show once
                }

                await this.setStateChangedAsync('meta.version', { val: content.version, ack: true });

                await this.setStateChangedAsync('sensor.lux', { val: parseInt(content.lux), ack: true });
                await this.setStateChangedAsync('sensor.temp', { val: parseInt(content.temp), ack: true });
                await this.setStateChangedAsync('sensor.humidity', { val: parseInt(content.hum), ack: true });
            },
            'GET',
            null,
        );

        this.log.debug('re-creating refresh state timeout');
        this.refreshStateTimeout =
            this.refreshStateTimeout ||
            setTimeout(() => {
                this.refreshStateTimeout = null;
                this.refreshState();
            }, 60000);
    }

    buildRequest(service, callback, method, data) {
        const url = `/api/${service}`;

        if (this.config.awtrixIp) {
            this.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);

            axios({
                method: method,
                data: data,
                baseURL: `http://${this.config.awtrixIp}:80`,
                url: url,
                timeout: 3000,
                responseType: 'json',
            })
                .then((response) => {
                    this.log.debug(`received ${response.status} response from "${url}" with content: ${JSON.stringify(response.data)}`);

                    if (response && callback && typeof callback === 'function') {
                        callback(response.data, response.status);
                    }
                })
                .catch((error) => {
                    if (error.response) {
                        // The request was made and the server responded with a status code

                        this.log.warn(`received error ${error.response.status} response from "${url}" with content: ${JSON.stringify(error.response.data)}`);
                    } else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                        // http.ClientRequest in node.js
                        this.log.info(error.message);

                        this.setStateAsync('info.connection', { val: false, ack: true });
                    } else {
                        // Something happened in setting up the request that triggered an Error
                        this.log.error(error.message);

                        this.setStateAsync('info.connection', { val: false, ack: true });
                    }
                });
        }
    }

    removeNamespace(id) {
        const re = new RegExp(this.namespace + '*\\.', 'g');
        return id.replace(re, '');
    }

    /**
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.setStateAsync('info.connection', { val: false, ack: true });

            if (this.refreshStateTimeout) {
                this.log.debug('clearing refresh state timeout');
                clearTimeout(this.refreshStateTimeout);
            }

            callback();
        } catch (e) {
            callback();
        }
    }

    isNewerVersion(oldVer, newVer) {
        const oldParts = oldVer.split('.');
        const newParts = newVer.split('.');
        for (let i = 0; i < newParts.length; i++) {
            const a = ~~newParts[i]; // parse int
            const b = ~~oldParts[i]; // parse int
            if (a > b) return true;
            if (a < b) return false;
        }
        return false;
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new AwtrixLight(options);
} else {
    // otherwise start the instance directly
    new AwtrixLight();
}

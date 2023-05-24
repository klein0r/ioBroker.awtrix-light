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

        this.supportedVersion = '0.66';
        this.displayedVersionWarning = false;

        this.apiConnected = false;

        this.refreshStateTimeout = null;
        this.refreshAppTimeout = null;

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.setApiConnected(false);

        await this.subscribeStatesAsync('*');

        try {
            await this.refreshState();
            this.refreshApps();

            for (let i = 1; i <= 3; i++) {
                await this.updateIndicatorByStates(i);
            }

            await this.updateMoodlightByStates();
        } catch (err) {
            this.log.error(`[onReady] Startup error: ${err}`);
        }
    }

    /**
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (id && state && !state.ack) {
            const idNoNamespace = this.removeNamespace(id);

            this.log.debug(`state ${idNoNamespace} changed: ${state.val}`);

            if (this.apiConnected) {
                if (idNoNamespace === 'display.power') {
                    this.log.debug(`changing display power to ${state.val}`);

                    this.buildRequestAsync('power', 'POST', { power: state.val }).then(async (response) => {
                        if (response.status === 200 && response.data === 'OK') {
                            await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                        }
                    });
                } else if (idNoNamespace.startsWith('display.moodlight.')) {
                    this.updateMoodlightByStates().then(async (response) => {
                        if (response.status === 200 && response.data === 'OK') {
                            await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                        }
                    });
                } else if (idNoNamespace === 'device.update') {
                    this.log.info('performing firmware update');

                    this.buildRequestAsync('doupdate', 'POST')
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.log.info('started firmware update');
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`Unable to perform firmware update (maybe this is already the newest version): ${error}`);
                        });
                } else if (idNoNamespace === 'device.reboot') {
                    this.buildRequestAsync('reboot', 'POST').then(async (response) => {
                        if (response.status === 200 && response.data === 'OK') {
                            this.log.info('rebooting device');
                            this.setApiConnected(false);
                        }
                    });
                } else if (idNoNamespace === 'apps.next') {
                    this.log.debug('switching to next app');

                    this.buildRequestAsync('nextapp', 'POST');
                } else if (idNoNamespace === 'apps.prev') {
                    this.log.debug('switching to previous app');

                    this.buildRequestAsync('previousapp', 'POST');
                } else if (idNoNamespace.startsWith('apps.')) {
                    if (idNoNamespace.endsWith('.visible')) {
                        const obj = await this.getObjectAsync(idNoNamespace);
                        if (obj && obj.native?.name) {
                            this.buildRequestAsync('apps', 'POST', [{ name: obj.native.name, show: state.val }]).then(async (response) => {
                                if (response.status === 200 && response.data === 'OK') {
                                    await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                                }
                            });
                        }
                    } else if (idNoNamespace.endsWith('.activate')) {
                        if (state.val) {
                            const obj = await this.getObjectAsync(idNoNamespace);
                            if (obj && obj.native?.name) {
                                this.buildRequestAsync('switch', 'POST', { name: obj.native.name });
                            }
                        }
                    }
                } else if (idNoNamespace.match(/indicator\.[0-9]{1}\..*$/g)) {
                    const matches = idNoNamespace.match(/indicator\.([0-9]{1})\.(.*)$/);
                    const indicatorNo = matches ? parseInt(matches[1]) : undefined;
                    const action = matches ? matches[2] : undefined;

                    this.log.debug(`Changed indicator ${indicatorNo} with action ${action}`);

                    if (indicatorNo && indicatorNo >= 1) {
                        this.updateIndicatorByStates(indicatorNo).then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                            }
                        });
                    }
                }
            } else {
                this.log.error(`Unable to perform action for ${idNoNamespace} - API is not connected (device not reachable?)`);
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
                if (this.apiConnected) {
                    this.buildRequestAsync('notify', 'POST', obj.message)
                        .then((response) => {
                            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
                        })
                        .catch((error) => {
                            this.sendTo(obj.from, obj.command, { error }, obj.callback);
                        });
                } else {
                    this.sendTo(obj.from, obj.command, { error: 'API is not connected (device offline ?)' }, obj.callback);
                }
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

    setApiConnected(connection) {
        this.setStateChangedAsync('info.connection', { val: connection, ack: true });
        this.apiConnected = connection;

        if (!connection) {
            this.log.debug('API is offline');
        }
    }

    async refreshState() {
        return new Promise((resolve, reject) => {
            this.log.debug('refreshing device state');

            this.log.debug('re-creating refresh state timeout');
            this.refreshStateTimeout =
                this.refreshStateTimeout ||
                setTimeout(() => {
                    this.refreshStateTimeout = null;
                    this.refreshState();
                }, 60000);

            this.buildRequestAsync('stats', 'GET')
                .then(async (response) => {
                    if (response.status === 200) {
                        const content = response.data;

                        this.setApiConnected(true);

                        if (this.isNewerVersion(content.version, this.supportedVersion) && !this.displayedVersionWarning) {
                            this.log.warn(`You should update your Awtrix Light - supported version of this adapter is ${this.supportedVersion} (or later). Your current version is ${content.version}`);
                            this.displayedVersionWarning = true; // Just show once
                        }

                        await this.setStateChangedAsync('meta.version', { val: content.version, ack: true });

                        await this.setStateChangedAsync('sensor.lux', { val: parseInt(content.lux), ack: true });
                        await this.setStateChangedAsync('sensor.temp', { val: parseInt(content.temp), ack: true });
                        await this.setStateChangedAsync('sensor.humidity', { val: parseInt(content.hum), ack: true });
                    }

                    resolve(response.status);
                })
                .catch((error) => {
                    this.log.debug(`(stats) received error - API is now offline: ${JSON.stringify(error)}`);
                    this.setApiConnected(false);

                    reject(error);
                });
        });
    }

    refreshApps() {
        if (this.apiConnected) {
            this.buildRequestAsync('apps', 'GET')
                .then(async (response) => {
                    if (response.status === 200) {
                        const content = response.data;

                        const appPath = 'apps';
                        const nativeApps = ['time', 'eyes', 'date', 'temp', 'hum'];
                        const currentApps = content.map((a) => a.name);

                        this.getChannelsOf(appPath, async (err, states) => {
                            const appsAll = [];
                            const appsKeep = [];

                            // Collect all apps
                            if (states) {
                                for (let i = 0; i < states.length; i++) {
                                    const id = this.removeNamespace(states[i]._id);

                                    // Check if the state is a direct child (e.g. apps.temp)
                                    if (id.split('.').length === 2) {
                                        appsAll.push(id);
                                    }
                                }
                            }

                            // Create new app structure
                            for (const name of nativeApps.concat(currentApps.filter((a) => !nativeApps.includes(a)))) {
                                appsKeep.push(`${appPath}.${name}`);
                                this.log.debug(`[apps] found (keep): ${appPath}.${name}`);

                                await this.setObjectNotExistsAsync(`${appPath}.${name}`, {
                                    type: 'channel',
                                    common: {
                                        name: `App ${name}`,
                                    },
                                    native: {},
                                });

                                await this.setObjectNotExistsAsync(`${appPath}.${name}.activate`, {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Activate',
                                            de: 'Aktivieren',
                                            ru: 'Активировать',
                                            pt: 'Ativar',
                                            nl: 'Activeren',
                                            fr: 'Activer',
                                            it: 'Attivare',
                                            es: 'Activar',
                                            pl: 'Aktywuj',
                                            'zh-cn': '启用',
                                        },
                                        type: 'boolean',
                                        role: 'button',
                                        read: false,
                                        write: true,
                                    },
                                    native: {
                                        name,
                                    },
                                });

                                await this.setObjectNotExistsAsync(`${appPath}.${name}.visible`, {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Visible',
                                            de: 'Sichtbar',
                                            ru: 'Видимый',
                                            pt: 'Visível',
                                            nl: 'Vertaling:',
                                            fr: 'Visible',
                                            it: 'Visibile',
                                            es: 'Visible',
                                            pl: 'Widoczny',
                                            uk: 'Вибрані',
                                            'zh-cn': '不可抗辩',
                                        },
                                        type: 'boolean',
                                        role: 'indicator',
                                        read: true,
                                        write: true,
                                    },
                                    native: {
                                        name,
                                    },
                                });
                                await this.setStateChangedAsync(`${appPath}.${name}.visible`, { val: currentApps.includes(name), ack: true });
                            }

                            // Delete non existent apps
                            for (let i = 0; i < appsAll.length; i++) {
                                const id = appsAll[i];

                                if (appsKeep.indexOf(id) === -1) {
                                    await this.delObjectAsync(id, { recursive: true });
                                    this.log.debug(`[apps] deleted: ${id}`);
                                }
                            }
                        });
                    }
                })
                .catch((error) => {
                    this.log.debug(`(apps) received error: ${JSON.stringify(error)}`);
                });
        }

        this.log.debug('[apps] re-creating refresh timeout');
        this.refreshAppTimeout =
            this.refreshAppTimeout ||
            setTimeout(() => {
                this.refreshAppTimeout = null;
                this.refreshApps();
            }, 60000 * 60);
    }

    async updateIndicatorByStates(index) {
        this.log.debug(`Updating indicator with index ${index}`);

        const indicatorStates = await this.getStatesAsync(`indicator.${index}.*`);
        const indicatorValues = Object.entries(indicatorStates).reduce(
            (acc, [objId, state]) => ({
                ...acc,
                [this.removeNamespace(objId)]: state.val,
            }),
            {},
        );

        const postObj = {
            color: indicatorValues[`indicator.${index}.color`],
        };

        if (postObj.color !== '0') {
            if (indicatorValues[`indicator.${index}.blink`] > 0) {
                postObj.blink = indicatorValues[`indicator.${index}.blink`];
            }
        }

        return this.buildRequestAsync(`indicator${index}`, 'POST', indicatorValues[`indicator.${index}.active`] ? postObj : '');
    }

    async updateMoodlightByStates() {
        this.log.debug(`Updating moodlight`);

        const moodlightStates = await this.getStatesAsync('display.moodlight.*');
        const moodlightValues = Object.entries(moodlightStates).reduce(
            (acc, [objId, state]) => ({
                ...acc,
                [this.removeNamespace(objId)]: state.val,
            }),
            {},
        );

        const postObj = {
            brightness: moodlightValues['display.moodlight.brightness'],
            color: String(moodlightValues['display.moodlight.color']).toUpperCase(),
        };

        return this.buildRequestAsync('moodlight', 'POST', moodlightValues['display.moodlight.active'] ? postObj : '');
    }

    buildRequestAsync(service, method, data) {
        return new Promise((resolve, reject) => {
            const url = `/api/${service}`;

            if (this.config.awtrixIp) {
                if (data) {
                    this.log.debug(`sending "${method}" request to "${url}" with data: ${JSON.stringify(data)}`);
                } else {
                    this.log.debug(`sending "${method}" request to "${url}" without data`);
                }

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

                        // no error - clear up reminder
                        delete this.lastErrorCode;

                        resolve(response);
                    })
                    .catch((error) => {
                        if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn(`received ${error.response.status} response from ${url} with content: ${JSON.stringify(error.response.data)}`);
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js

                            // avoid spamming of the same error when stuck in a reconnection loop
                            if (error.code === this.lastErrorCode) {
                                this.log.debug(error.message);
                            } else {
                                this.log.info(`error ${error.code} from ${url}: ${error.message}`);
                                this.lastErrorCode = error.code;
                            }
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.error(error.message);
                        }

                        reject(error);
                    });
            } else {
                reject('Device IP is not configured');
            }
        });
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
            this.setApiConnected(false);

            if (this.refreshStateTimeout) {
                this.log.debug('clearing refresh state timeout');
                clearTimeout(this.refreshStateTimeout);
            }

            if (this.refreshAppTimeout) {
                this.log.debug('clearing refresh app timeout');
                clearTimeout(this.refreshAppTimeout);
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

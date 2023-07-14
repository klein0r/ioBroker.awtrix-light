'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios').default;
const colorConvert = require('./lib/color-convert');
const adapterName = require('./package.json').name.split('.').pop();

const NATIVE_APPS = ['time', 'eyes', 'date', 'temp', 'hum', 'bat'];

class AwtrixLight extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: adapterName,
            useFormatDate: true,
        });

        this.supportedVersion = '0.70';
        this.displayedVersionWarning = false;

        this.apiConnected = false;

        this.refreshStateTimeout = null;
        this.refreshHistoryAppsTimeout = null;
        this.downloadScreenContentInterval = null;

        this.customAppsForeignStates = {};

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.setApiConnected(false);

        await this.subscribeStatesAsync('*');

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

        this.refreshState();
    }

    async importForeignSettings() {
        try {
            this.log.info(`Using settings of other instance: ${this.config.foreignSettingsInstance}`);

            const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.config.foreignSettingsInstance}`);

            if (instanceObj && instanceObj.native) {
                if (!instanceObj.native?.foreignSettingsInstance) {
                    // Copy values
                    const copySettings = ['customApps', 'ignoreNewValueForAppInTimeRange', 'historyApps', 'historyAppsRefreshInterval', 'autoDeleteForeignApps', 'removeAppsOnStop'];

                    for (const setting of copySettings) {
                        this.config[setting] = instanceObj.native[setting];
                        this.log.debug(`[importForeignSettings] Copied setting ${setting} from foreign instance "system.adapter.${this.config.foreignSettingsInstance}"`);
                    }
                } else {
                    throw new Error(`Foreign instance uses instance settings of ${instanceObj?.native?.foreignSettingsInstance} - (nothing imported)`);
                }
            } else {
                throw new Error(`Unable to load instance settings of ${instanceObj?.native?.foreignSettingsInstance} (nothing imported)`);
            }
        } catch (err) {
            this.log.error(`Unable to import settings of other instance: ${err}`);
        }
    }

    /**
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (id && state && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, id)) {
            if (state.ack) {
                // Just refresh if value has changed
                if (state.val !== this.customAppsForeignStates[id].val) {
                    if (this.customAppsForeignStates[id].ts + this.config.ignoreNewValueForAppInTimeRange * 1000 < state.ts) {
                        this.customAppsForeignStates[id].val = state?.val;
                        this.customAppsForeignStates[id].ts = state.ts;

                        this.refreshCustomApps(id);
                    } else {
                        this.log.debug(
                            `[onStateChange] ignoring customApps state change of "${id}" to ${state.val} - refreshes too fast (within ${
                                this.config.ignoreNewValueForAppInTimeRange
                            } seconds) - Last update: ${this.formatDate(this.customAppsForeignStates[id].ts, 'YYYY-MM-DD hh:mm:ss.sss')}`,
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
                if (idNoNamespace.startsWith('settings.')) {
                    this.log.debug(`changing setting ${idNoNamespace} power to ${state.val}`);

                    const settingsObj = await this.getObjectAsync(idNoNamespace);
                    if (settingsObj && settingsObj.native?.settingsKey) {
                        this.buildRequestAsync('settings', 'POST', { [settingsObj.native.settingsKey]: state.val })
                            .then(async (response) => {
                                if (response.status === 200 && response.data === 'OK') {
                                    await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                                }

                                await this.refreshSettings();
                            })
                            .catch((error) => {
                                this.log.warn(`(settings) Unable to execute action: ${error}`);
                            });
                    } else {
                        this.log.warn(`Unable to change setting of ${id} - settingsKey not found`);
                    }
                } else if (idNoNamespace === 'display.power') {
                    this.log.debug(`changing display power to ${state.val}`);

                    this.buildRequestAsync('power', 'POST', { power: state.val })
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(power) Unable to execute action: ${error}`);
                        });
                } else if (idNoNamespace.startsWith('display.moodlight.')) {
                    this.updateMoodlightByStates()
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(moodlight) Unable to execute action: ${error}`);
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
                            this.log.warn(`(doupdate) Unable to execute firmware update (maybe this is already the newest version): ${error}`);
                        });
                } else if (idNoNamespace === 'device.reboot') {
                    this.buildRequestAsync('reboot', 'POST')
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.log.info('rebooting device');
                                this.setApiConnected(false);
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(reboot) Unable to execute action: ${error}`);
                        });
                } else if (idNoNamespace === 'apps.next') {
                    this.log.debug('switching to next app');

                    this.buildRequestAsync('nextapp', 'POST').catch((error) => {
                        this.log.warn(`(nextapp) Unable to execute action: ${error}`);
                    });
                } else if (idNoNamespace === 'apps.prev') {
                    this.log.debug('switching to previous app');

                    this.buildRequestAsync('previousapp', 'POST').catch((error) => {
                        this.log.warn(`(previousapp) Unable to execute action: ${error}`);
                    });
                } else if (idNoNamespace.startsWith('apps.')) {
                    if (idNoNamespace.endsWith('.activate')) {
                        if (state.val) {
                            const sourceObj = await this.getObjectAsync(idNoNamespace);
                            if (sourceObj && sourceObj.native?.name) {
                                this.log.debug(`activating app ${sourceObj.native.name}`);

                                this.buildRequestAsync('switch', 'POST', { name: sourceObj.native.name }).catch((error) => {
                                    this.log.warn(`(switch) Unable to execute action: ${error}`);
                                });
                            }
                        } else {
                            this.log.warn(`Received invalid value for state ${idNoNamespace}`);
                        }
                    } else if (idNoNamespace.endsWith('.visible')) {
                        const sourceObj = await this.getObjectAsync(idNoNamespace);
                        if (sourceObj && sourceObj.native?.name) {
                            this.log.debug(`changing visibility of app ${sourceObj.native.name} to ${state.val}`);

                            await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });

                            this.initCustomApps();
                            this.initHistoryApps();
                        }
                    }
                } else if (idNoNamespace.match(/indicator\.[0-9]{1}\..*$/g)) {
                    const matches = idNoNamespace.match(/indicator\.([0-9]{1})\.(.*)$/);
                    const indicatorNo = matches ? parseInt(matches[1]) : undefined;
                    const action = matches ? matches[2] : undefined;

                    this.log.debug(`Changed indicator ${indicatorNo} with action ${action}`);

                    if (indicatorNo && indicatorNo >= 1) {
                        this.updateIndicatorByStates(indicatorNo)
                            .then(async (response) => {
                                if (response.status === 200 && response.data === 'OK') {
                                    await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                                }
                            })
                            .catch((error) => {
                                this.log.warn(`(indicator) Unable to perform action: ${error}`);
                            });
                    }
                }
            } else {
                this.log.error(`Unable to perform action for ${idNoNamespace} - API is not connected (device not reachable?)`);
            }
        }
    }

    /**
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    async onObjectChange(id, obj) {
        // Imported settings changed
        if (id && id == `system.adapter.${this.config.foreignSettingsInstance}`) {
            await this.importForeignSettings();

            // Refresh apps (may have changed)
            if (this.apiConnected) {
                await this.createAppObjects();
                await this.initCustomApps();
                await this.initHistoryApps();
            }
        }

        if (id && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, id)) {
            if (!obj) {
                delete this.customAppsForeignStates[id];
            } else {
                this.customAppsForeignStates[id] = {
                    type: obj?.common.type,
                    unit: obj?.common?.unit,
                };

                this.refreshCustomApps(id);
            }
        }
    }

    /**
     * @param {ioBroker.Message} obj
     */
    onMessage(obj) {
        this.log.debug(`[onMessage] received message: ${JSON.stringify(obj.message)}`);

        if (obj && obj.message) {
            if (obj.command === 'notification' && typeof obj.message === 'object') {
                // Notification
                if (this.apiConnected) {
                    const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null)); // eslint-disable-line no-unused-vars

                    this.buildRequestAsync('notify', 'POST', msgFiltered)
                        .then((response) => {
                            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
                        })
                        .catch((error) => {
                            this.sendTo(obj.from, obj.command, { error }, obj.callback);
                        });
                } else {
                    this.sendTo(obj.from, obj.command, { error: 'API is not connected (device offline ?)' }, obj.callback);
                }
            } else if (obj.command === 'timer' && typeof obj.message === 'object') {
                // Timer
                if (this.apiConnected) {
                    const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null)); // eslint-disable-line no-unused-vars

                    this.buildRequestAsync('timer', 'POST', msgFiltered)
                        .then((response) => {
                            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
                        })
                        .catch((error) => {
                            this.sendTo(obj.from, obj.command, { error }, obj.callback);
                        });
                } else {
                    this.sendTo(obj.from, obj.command, { error: 'API is not connected (device offline ?)' }, obj.callback);
                }
            } else if (obj.command === 'sound' && typeof obj.message === 'object') {
                // Sound
                if (this.apiConnected) {
                    const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null)); // eslint-disable-line no-unused-vars

                    this.buildRequestAsync('sound', 'POST', msgFiltered)
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

    async setApiConnected(connection) {
        if (connection !== this.apiConnected) {
            await this.setStateChangedAsync('info.connection', { val: connection, ack: true });
            this.apiConnected = connection;

            if (connection) {
                // API was offline - refresh all states
                this.log.debug('API is online');

                try {
                    // settings
                    await this.refreshSettings();

                    // apps
                    await this.createAppObjects();
                    await this.initCustomApps();
                    await this.initHistoryApps();

                    // indicators
                    for (let i = 1; i <= 3; i++) {
                        await this.updateIndicatorByStates(i);
                    }

                    // moodlight
                    await this.updateMoodlightByStates();

                    if (this.config.downloadScreenContent && !this.downloadScreenContentInterval) {
                        this.log.debug(`[setApiConnected] Downloading screen contents every ${this.config.downloadScreenContentInterval} seconds`);

                        this.downloadScreenContentInterval = this.setInterval(() => {
                            if (this.apiConnected) {
                                this.buildRequestAsync('screen', 'GET')
                                    .then(async (response) => {
                                        if (response.status === 200) {
                                            const pixelData = response.data;
                                            const width = 640;
                                            const height = 160;
                                            const scaleX = width / 32;
                                            const scaleY = height / 8;

                                            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

                                            for (let y = 0; y < 8; y++) {
                                                for (let x = 0; x < 32; x++) {
                                                    const color = colorConvert.rgb565to888Str(pixelData[y * 32 + x]);
                                                    svg += `\n  <rect style="fill: ${color}; stroke: #000000; stroke-width: 2px;" x="${x * scaleX}" y="${y * scaleY}" width="${scaleX}" height="${scaleY}"/>`
                                                }
                                            }

                                            svg += '\n</svg>';

                                            await this.setStateAsync('display.content', { val: svg, ack: true });
                                        }
                                    })
                                    .catch((error) => {
                                        this.log.debug(`(screen) received error: ${JSON.stringify(error)}`);
                                    });
                            }
                        }, this.config.downloadScreenContentInterval * 1000);
                    }
                } catch (error) {
                    this.log.error(`[setApiConnected] Unable to refresh settings, apps or indicators: ${error}`);
                }
            } else {
                if (this.downloadScreenContentInterval) {
                    this.clearInterval(this.downloadScreenContentInterval);
                    this.downloadScreenContentInterval = null;
                }
                this.log.debug('API is offline');
            }
        }
    }

    refreshState() {
        this.log.debug('refreshing device state');

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

                    await this.setStateChangedAsync('display.brightness', { val: content.bri, ack: true });

                    await this.setStateChangedAsync('device.battery', { val: content.bat, ack: true });
                    await this.setStateChangedAsync('device.wifiSignal', { val: content.wifi_signal, ack: true });
                    await this.setStateChangedAsync('device.freeRAM', { val: content.ram, ack: true });
                    await this.setStateChangedAsync('device.uptime', { val: parseInt(content.uptime), ack: true });
                }
            })
            .catch((error) => {
                this.log.debug(`(stats) received error - API is now offline: ${JSON.stringify(error)}`);
                this.setApiConnected(false);
            });

        this.log.debug('re-creating refresh state timeout');
        this.refreshStateTimeout =
            this.refreshStateTimeout ||
            this.setTimeout(() => {
                this.refreshStateTimeout = null;
                this.refreshState();
            }, 60000);
    }

    async refreshSettings() {
        return new Promise((resolve, reject) => {
            this.buildRequestAsync('settings', 'GET')
                .then(async (response) => {
                    if (response.status === 200) {
                        const content = response.data;

                        const settingsStates = await this.getObjectViewAsync('system', 'state', {
                            startkey: `${this.namespace}.settings.`,
                            endkey: `${this.namespace}.settings.\u9999`,
                        });

                        // Find all available settings objects with settingsKey
                        const knownSettings = {};
                        for (const settingsObj of settingsStates.rows) {
                            if (settingsObj.value?.native?.settingsKey) {
                                knownSettings[this.removeNamespace(settingsObj.value?.native?.settingsKey)] = {
                                    id: settingsObj.id,
                                    role: settingsObj.value.common.role,
                                };
                            }
                        }

                        for (const [settingsKey, val] of Object.entries(content)) {
                            if (Object.prototype.hasOwnProperty.call(knownSettings, settingsKey)) {
                                if (knownSettings[settingsKey].role === 'level.color.rgb') {
                                    const newVal = colorConvert.rgb565to888Str(val);
                                    this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${newVal} (converted from ${val})`);

                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val: newVal, ack: true, c: 'Updated from API (converted from RGB565)' });
                                } else {
                                    this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${val}`);

                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val, ack: true, c: 'Updated from API' });
                                }
                            }
                        }
                    }

                    resolve(response.status);
                })
                .catch((error) => {
                    this.log.warn(`(settings) Received error: ${JSON.stringify(error)}`);

                    reject(error);
                });
        });
    }

    async removeApp(name) {
        return new Promise((resolve, reject) => {
            if (this.apiConnected) {
                this.buildRequestAsync(`custom?name=${name}`, 'POST')
                    .then((response) => {
                        if (response.status === 200 && response.data === 'OK') {
                            this.log.debug(`[removeApp] Removed customApp app "${name}"`);
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

    async initCustomApps() {
        if (this.apiConnected) {
            for (const customApp of this.config.customApps) {
                if (customApp.name) {
                    const text = String(customApp.text).trim();
                    const appVisibleState = await this.getStateAsync(`apps.${customApp.name}.visible`);
                    const appVisible = appVisibleState ? appVisibleState.val : true;

                    // Ack if changed while instance was stopped
                    if (appVisibleState && !appVisibleState?.ack) {
                        await this.setStateAsync(`apps.${customApp.name}.visible`, { val: appVisible, ack: true });
                    }

                    if (!appVisible) {
                        this.log.debug(`[initCustomApps] Going to remove custom app "${customApp.name}" (was hidden by state: apps.${customApp.name}.visible)`);

                        await this.removeApp(customApp.name).catch((error) => {
                            this.log.warn(`Unable to remove customApp app "${customApp.name}" (hidden by state): ${error}`);
                        });
                    } else if (customApp.objId && text.includes('%s')) {
                        try {
                            const objId = customApp.objId;
                            if (!Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, objId)) {
                                const obj = await this.getForeignObjectAsync(objId);
                                if (obj && obj.type === 'state') {
                                    const state = await this.getForeignStateAsync(objId);

                                    this.customAppsForeignStates[objId] = {
                                        val: state && state.ack ? state.val : undefined,
                                        type: obj?.common.type,
                                        unit: obj?.common?.unit,
                                        ts: state ? state.ts : Date.now(),
                                    };

                                    if (obj?.common.type && !['string', 'number'].includes(obj.common.type)) {
                                        this.log.warn(`[initCustomApps] Object of app "${customApp.name}" with id ${objId} has invalid type: ${obj.common.type}`);
                                    }

                                    if (text.includes('%u') && !obj?.common?.unit) {
                                        this.log.warn(
                                            `[initCustomApps] Object of custom app "${customApp.name}" (${objId}) has no unit - remove "%u" from text or define unit in object (common.unit)`,
                                        );
                                    }

                                    if (state && !state.ack) {
                                        this.log.info(`[initCustomApps] State value of custom app "${customApp.name}" (${objId}) is not acknowledged (ack: false) - waiting for new value`);
                                    }

                                    await this.subscribeForeignStatesAsync(objId);
                                    await this.subscribeForeignObjectsAsync(objId);

                                    this.log.debug(`[initCustomApps] Found custom app "${customApp.name}" with objId ${objId} - subscribed to changes`);
                                }
                            } else {
                                this.log.debug(`[initCustomApps] Found custom app "${customApp.name}" with objId ${objId} - already subscribed to changes`);
                            }
                        } catch (error) {
                            this.log.error(`[initCustomApps] Unable to get object information for ${customApp.name}: ${error}`);
                        }
                    } else if (text.length > 0) {
                        // App with static text (no %s specified)
                        this.log.debug(`[initCustomApps] Creating custom app "${customApp.name}" with icon "${customApp.icon}" and static text "${customApp.text}"`);

                        if (customApp.objId) {
                            this.log.warn(
                                `[initCustomApps] Custom app "${customApp.name}" was defined with object id ${customApp.objId} but "%s" is not used in the text - state changes will be ignored`,
                            );
                        }

                        const displayText = text.replace('%u', '').trim();

                        if (displayText.length > 0) {
                            await this.buildRequestAsync(`custom?name=${customApp.name}`, 'POST', this.createAppRequestObj(customApp, displayText)).catch((error) => {
                                this.log.warn(`(custom?name=${customApp.name}) Unable to create custom app "${customApp.name}" with static text: ${error}`);
                            });
                        } else {
                            // Empty text => remove app
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

            // Trigger update for all found objIds
            for (const objId of Object.keys(this.customAppsForeignStates)) {
                await this.refreshCustomApps(objId);
            }
        }
    }

    async refreshCustomApps(objId) {
        if (this.apiConnected) {
            for (const customApp of this.config.customApps) {
                if (customApp.name) {
                    const text = String(customApp.text).trim();

                    if (customApp.objId && customApp.objId === objId && text.includes('%s')) {
                        this.log.debug(`[refreshCustomApp] Refreshing custom app "${customApp.name}" with icon "${customApp.icon}" and text "${customApp.text}"`);

                        try {
                            const appVisibleState = await this.getStateAsync(`apps.${customApp.name}.visible`);
                            const appVisible = appVisibleState ? appVisibleState.val : true;

                            if (appVisible) {
                                const val = this.customAppsForeignStates[objId].val;

                                if (typeof val !== 'undefined') {
                                    let newVal = val;

                                    if (this.customAppsForeignStates[objId].type === 'number') {
                                        const decimals = customApp.decimals ?? 3;

                                        if (!isNaN(val) && val % 1 !== 0) {
                                            let countDecimals = String(val).split('.')[1].length || 2;

                                            if (countDecimals > decimals) {
                                                countDecimals = decimals; // limit
                                            }

                                            newVal = this.formatValue(val, countDecimals);
                                            this.log.debug(`[refreshCustomApp] formatted value of "${objId}" from ${val} to ${newVal} (${countDecimals} decimals)`);
                                        }
                                    }

                                    const displayText = text
                                        .replace('%s', newVal)
                                        .replace('%u', this.customAppsForeignStates[objId].unit ?? '')
                                        .trim();

                                    if (displayText.length > 0) {
                                        await this.buildRequestAsync(`custom?name=${customApp.name}`, 'POST', this.createAppRequestObj(customApp, displayText, val)).catch((error) => {
                                            this.log.warn(`(custom?name=${customApp.name}) Unable to update custom app "${customApp.name}": ${error}`);
                                        });
                                    } else {
                                        // Empty text => remove app
                                        this.log.debug(`[refreshCustomApps] Going to remove custom app "${customApp.name}" (empty text)`);

                                        await this.removeApp(customApp.name).catch((error) => {
                                            this.log.warn(`Unable to remove customApp app "${customApp.name}" (empty text): ${error}`);
                                        });
                                    }
                                } else {
                                    // No state value => remove app
                                    this.log.debug(`[refreshCustomApps] Going to remove custom app "${customApp.name}" (no state data)`);

                                    await this.removeApp(customApp.name).catch((error) => {
                                        this.log.warn(`Unable to remove customApp app "${customApp.name}" (no state data): ${error}`);
                                    });
                                }
                            }
                        } catch (error) {
                            this.log.error(`[refreshCustomApp] Unable to refresh custom app "${customApp.name}": ${error}`);
                        }
                    }
                }
            }
        }
    }

    createAppRequestObj(customApp, text, val) {
        const moreOptions = {
            background: customApp.backgroundColor || '#000000'
        };

        // Set rainbow colors OR text color
        if (customApp.rainbow) {
            moreOptions.rainbow = true;
        } else if (customApp.textColor) {
            moreOptions.color = customApp.textColor;
        }

        // Set noScroll OR scroll speed
        if (customApp.noScroll) {
            moreOptions.noScroll = true;
        } else if (customApp.scrollSpeed > 0) {
            moreOptions.scrollSpeed = customApp.scrollSpeed;
        }

        // Icon
        if (customApp.icon) {
            moreOptions.icon = customApp.icon;
        }

        // Duration
        if (customApp.duration > 0) {
            moreOptions.duration = customApp.duration;
        }

        // thresholds
        if (!isNaN(val)) {
            if (customApp.thresholdLtActive && val < customApp.thresholdLtValue) {
                this.log.debug(`[createAppRequestObj] LT < custom app "${customApp.name}" has a value (${val}) less than ${customApp.thresholdLtValue} - overriding values`);

                if (customApp.thresholdLtIcon) {
                    moreOptions.icon = customApp.thresholdLtIcon;
                }
                if (customApp.thresholdLtTextColor) {
                    moreOptions.color = customApp.thresholdLtTextColor;
                    moreOptions.rainbow = false; // disable rainbow
                }
                if (customApp.thresholdLtBackgroundColor) {
                    moreOptions.background = customApp.thresholdLtBackgroundColor;
                }
            } else if (customApp.thresholdGtActive && val > customApp.thresholdGtValue) {
                this.log.debug(`[createAppRequestObj] GT > custom app "${customApp.name}" has a value (${val}) greater than ${customApp.thresholdGtValue} - overriding values`);

                if (customApp.thresholdGtIcon) {
                    moreOptions.icon = customApp.thresholdGtIcon;
                }
                if (customApp.thresholdGtTextColor) {
                    moreOptions.color = customApp.thresholdGtTextColor;
                    moreOptions.rainbow = false; // disable rainbow
                }
                if (customApp.thresholdGtBackgroundColor) {
                    moreOptions.background = customApp.thresholdGtBackgroundColor;
                }
            }
        }

        return {
            text,
            textCase: 2, // show as sent
            repeat: customApp.repeat || 1,
            ...moreOptions,
        };
    }

    async initHistoryApps() {
        if (this.apiConnected && this.config.historyApps.length > 0) {
            const validSourceInstances = [];

            // Check for valid history instances (once)
            for (const historyApp of this.config.historyApps) {
                if (historyApp.sourceInstance && !validSourceInstances.includes(historyApp.sourceInstance)) {
                    const sourceInstanceObj = await this.getForeignObjectAsync(`system.adapter.${historyApp.sourceInstance}`);

                    if (sourceInstanceObj && sourceInstanceObj.common?.getHistory) {
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

                            // Ack if changed while instance was stopped
                            if (appVisibleState && !appVisibleState?.ack) {
                                await this.setStateAsync(`apps.${historyApp.name}.visible`, { val: appVisible, ack: true });
                            }

                            if (!appVisible) {
                                this.log.debug(`[initHistoryApps] Going to remove history app "${historyApp.name}" (was hidden by state: apps.${historyApp.name}.visible)`);

                                await this.removeApp(historyApp.name).catch((error) => {
                                    this.log.warn(`Unable to remove history app "${historyApp.name}" (hidden by state): ${error}`);
                                });
                            } else if (validSourceInstances.includes(historyApp.sourceInstance)) {
                                const sourceObj = await this.getForeignObjectAsync(historyApp.objId);

                                if (sourceObj && Object.prototype.hasOwnProperty.call(sourceObj?.common?.custom ?? {}, historyApp.sourceInstance)) {
                                    const itemCount = historyApp.icon ? 11 : 16; // Can display 11 values with icon or 16 values without icon

                                    const historyData = await this.sendToAsync(historyApp.sourceInstance, 'getHistory', {
                                        id: historyApp.objId,
                                        options: {
                                            start: 1,
                                            end: Date.now(),
                                            aggregate: 'none',
                                            limit: itemCount,
                                            returnNewestEntries: true,
                                            ignoreNull: 0,
                                            removeBorderValues: true,
                                            ack: true,
                                        },
                                    });
                                    const lineData = historyData?.result
                                        .filter((state) => typeof state.val === 'number' && state.ack)
                                        .map((state) => Math.round(state.val))
                                        .slice(itemCount * -1);

                                    this.log.debug(
                                        `[initHistoryApps] History data for app "${historyApp.name}" of "${historyApp.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(lineData)}`,
                                    );

                                    if (lineData.length > 0) {
                                        const moreOptions = {};

                                        // Duration
                                        if (historyApp.duration > 0) {
                                            moreOptions.icon = historyApp.duration;
                                        }

                                        await this.buildRequestAsync(`custom?name=${historyApp.name}`, 'POST', {
                                            color: historyApp.lineColor ?? '#FF0000',
                                            background: historyApp.backgroundColor || '#000000',
                                            line: lineData,
                                            autoscale: true,
                                            icon: historyApp.icon,
                                            repeat: historyApp.repeat || 1,
                                            lifetime: this.config.historyAppsRefreshInterval + 60, // Remove app if there is no update in configured interval (+ buffer)
                                            ...moreOptions,
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
            this.log.debug(`re-creating history apps timeout (${this.config.historyAppsRefreshInterval ?? 300} seconds)`);
            this.refreshHistoryAppsTimeout =
                this.refreshHistoryAppsTimeout ||
                this.setTimeout(
                    () => {
                        this.refreshHistoryAppsTimeout = null;
                        this.initHistoryApps();
                    },
                    this.config.historyAppsRefreshInterval * 1000 || 300 * 1000,
                );
        }
    }

    createAppObjects() {
        return new Promise((resolve, reject) => {
            if (this.apiConnected) {
                this.buildRequestAsync('apps', 'GET')
                    .then(async (response) => {
                        if (response.status === 200) {
                            const content = response.data;

                            const appPath = 'apps';
                            const customApps = this.config.customApps.map((a) => a.name);
                            const historyApps = this.config.historyApps.map((a) => a.name);
                            const existingApps = content.map((a) => a.name);

                            this.log.debug(`[createAppObjects] existing apps on awtrix light: ${JSON.stringify(existingApps)}`);

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

                                // Create new app structure for all native apps and apps of instance configuration
                                for (const name of [...NATIVE_APPS, ...customApps, ...historyApps]) {
                                    appsKeep.push(`${appPath}.${name}`);
                                    this.log.debug(`[createAppObjects] found (keep): ${appPath}.${name}`);

                                    await this.extendObjectAsync(`${appPath}.${name}`, {
                                        type: 'channel',
                                        common: {
                                            name: `App`,
                                            desc: `${name}${customApps.includes(name) ? ' (custom app)' : ''}${historyApps.includes(name) ? ' (history app)' : ''}`,
                                        },
                                        native: {
                                            isNativeApp: NATIVE_APPS.includes(name),
                                            isCustomApp: customApps.includes(name),
                                            isHistoryApp: historyApps.includes(name),
                                        },
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

                                    // "Own" apps can be hidden via states
                                    if (customApps.includes(name) || historyApps.includes(name)) {
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
                                                role: 'switch.enable',
                                                read: true,
                                                write: true,
                                                def: true,
                                            },
                                            native: {
                                                name,
                                            },
                                        });
                                    }
                                }

                                // Delete non existent apps
                                for (let i = 0; i < appsAll.length; i++) {
                                    const id = appsAll[i];

                                    if (appsKeep.indexOf(id) === -1) {
                                        await this.delObjectAsync(id, { recursive: true });
                                        this.log.debug(`[createAppObjects] deleted: ${id}`);
                                    }
                                }

                                if (this.config.autoDeleteForeignApps) {
                                    // Delete unknown apps on awtrix light
                                    for (const name of existingApps.filter((a) => !NATIVE_APPS.includes(a) && !customApps.includes(a) && !historyApps.includes(a))) {
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
                            });
                        } else {
                            this.log.warn(`[createAppObjects] received status code: ${response.status}`);

                            reject(`received status code: ${response.status}`);
                        }
                    })
                    .catch((error) => {
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
            const timeoutMs = this.config.httpTimeout * 1000 || 3000;

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
                    timeout: timeoutMs,
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
    async onUnload(callback) {
        try {
            if (this.config.removeAppsOnStop) {
                const customApps = this.config.customApps.map((a) => a.name);
                const historyApps = this.config.historyApps.map((a) => a.name);

                // Delete unknown apps on awtrix light
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
                this.log.debug('clearing refresh state timeout');
                this.clearTimeout(this.refreshStateTimeout);
            }

            if (this.refreshHistoryAppsTimeout) {
                this.log.debug('clearing history apps timeout');
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

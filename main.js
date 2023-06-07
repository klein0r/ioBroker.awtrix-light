'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios').default;
const colorConvert = require('./lib/color-convert');
const adapterName = require('./package.json').name.split('.').pop();

const DEFAULT_DURATION = 5;

class AwtrixLight extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: adapterName,
        });

        this.supportedVersion = '0.68';
        this.displayedVersionWarning = false;

        this.apiConnected = false;
        this.refreshStateTimeout = null;
        this.refreshHistoryAppsTimeout = null;
        this.customAppsForeignStates = {};

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.setApiConnected(false);

        try {
            await this.refreshState();
            await this.initCustomApps();
            await this.initHistoryApps();
            this.createAppObjects();

            for (let i = 1; i <= 3; i++) {
                await this.updateIndicatorByStates(i);
            }

            await this.updateMoodlightByStates();

            await this.subscribeStatesAsync('*');
        } catch (err) {
            this.log.error(`[onReady] Startup error: ${err}`);
        }
    }

    /**
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (id && state && state.ack && Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, id)) {
            // Just refresh if value has changed
            if (state.val !== this.customAppsForeignStates[id].val) {
                const now = Date.now();

                if (this.customAppsForeignStates[id].ts + this.config.ignoreNewValueForAppInTimeRange * 1000 < now) {
                    this.customAppsForeignStates[id].val = state?.val;
                    this.customAppsForeignStates[id].ts = now;

                    this.refreshCustomApps(id);
                } else {
                    this.log.debug(`[onStateChange] ignoring customApps state change of "${id}" to ${state.val} - refreshes too fast (within ${this.config.ignoreNewValueForAppInTimeRange} seconds)`);
                }
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
                                this.log.warn(`Unable to perform display action: ${error}`);
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
                            this.log.warn(`Unable to perform display action: ${error}`);
                        });
                } else if (idNoNamespace.startsWith('display.moodlight.')) {
                    this.updateMoodlightByStates()
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`Unable to perform moodlight action: ${error}`);
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
                            this.log.warn(`Unable to execute firmware update (maybe this is already the newest version): ${error}`);
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
                            this.log.warn(`Unable to execute "reboot" action: ${error}`);
                        });
                } else if (idNoNamespace === 'apps.next') {
                    this.log.debug('switching to next app');

                    this.buildRequestAsync('nextapp', 'POST').catch((error) => {
                        this.log.warn(`Unable to execute "nextapp" action: ${error}`);
                    });
                } else if (idNoNamespace === 'apps.prev') {
                    this.log.debug('switching to previous app');

                    this.buildRequestAsync('previousapp', 'POST').catch((error) => {
                        this.log.warn(`Unable to execute "previousapp" action: ${error}`);
                    });
                } else if (idNoNamespace.startsWith('apps.')) {
                    if (idNoNamespace.endsWith('.visible')) {
                        const obj = await this.getObjectAsync(idNoNamespace);
                        if (obj && obj.native?.name) {
                            this.log.debug(`changing visibility of app ${obj.native.name} to ${state.val}`);

                            this.buildRequestAsync('apps', 'POST', [{ name: obj.native.name, show: state.val }])
                                .then(async (response) => {
                                    if (response.status === 200 && response.data === 'OK') {
                                        await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                                    }
                                })
                                .catch((error) => {
                                    this.log.warn(`Unable to execute app visibility action: ${error}`);
                                });
                        }
                    } else if (idNoNamespace.endsWith('.activate')) {
                        if (state.val) {
                            const obj = await this.getObjectAsync(idNoNamespace);
                            if (obj && obj.native?.name) {
                                this.log.debug(`activating app ${obj.native.name}`);

                                this.buildRequestAsync('switch', 'POST', { name: obj.native.name }).catch((error) => {
                                    this.log.warn(`Unable to execute app activation: ${error}`);
                                });
                            }
                        } else {
                            this.log.warn(`Received invalid value for state ${idNoNamespace}`);
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
                                this.log.warn(`Unable to perform indicator action: ${error}`);
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
    onObjectChange(id, obj) {
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
            } else if (obj.command === 'timer' && typeof obj.message === 'object') {
                // Timer
                if (this.apiConnected) {
                    this.buildRequestAsync('timer', 'POST', obj.message)
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
                    this.buildRequestAsync('sound', 'POST', obj.message)
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
                    this.refreshState().catch((error) => {
                        this.log.debug(`Unable to refresh state: ${error}`);
                    });
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

                        await this.setStateChangedAsync('display.brightness', { val: content.bri, ack: true });

                        await this.setStateChangedAsync('device.battery', { val: content.bat, ack: true });
                        await this.setStateChangedAsync('device.uptime', { val: parseInt(content.uptime), ack: true });

                        await this.refreshSettings();
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

    refreshSettings() {
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
                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val: colorConvert.rgb565to888Str(val), ack: true, c: 'Updated from API (converted from RGB565)' });
                                } else {
                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val, ack: true, c: 'Updated from API' });
                                }
                            }
                        }
                    }

                    resolve(response.status);
                })
                .catch((error) => {
                    this.log.debug(`(settings) received error: ${JSON.stringify(error)}`);

                    reject(error);
                });
        });
    }

    async initCustomApps() {
        for (const customApp of this.config.customApps) {
            if (customApp.name) {
                const text = String(customApp.text).trim();

                if (customApp.objId && text.includes('%s')) {
                    try {
                        const objId = customApp.objId;
                        if (!Object.prototype.hasOwnProperty.call(this.customAppsForeignStates, objId)) {
                            const obj = await this.getForeignObjectAsync(objId);
                            if (obj) {
                                const state = await this.getForeignStateAsync(objId);

                                this.customAppsForeignStates[objId] = {
                                    val: state ? state.val : undefined,
                                    type: obj?.common.type,
                                    unit: obj?.common?.unit,
                                    ts: Date.now(),
                                };

                                await this.subscribeForeignStatesAsync(objId);
                                await this.subscribeForeignObjectsAsync(objId);

                                this.log.debug(`[initCustomApps] Found custom app "${customApp.name}" with objId ${objId} - subscribed to changes`);
                            }
                        }
                    } catch (error) {
                        this.log.error(`[initCustomApps] Unable to get object information for ${customApp.name}: ${error}`);
                    }
                } else if (text.length > 0) {
                    // App with static text (no objId specified)
                    this.log.debug(`[initCustomApps] Creating custom app "${customApp.name}" with icon "${customApp.icon}" and static text "${customApp.text}"`);

                    await this.buildRequestAsync(`custom?name=${customApp.name}`, 'POST', {
                        text: text,
                        icon: customApp.icon,
                        duration: customApp.duration || DEFAULT_DURATION,
                    }).catch((error) => {
                        this.log.warn(`[initCustomApps] Unable to create custom app "${customApp.name}" with static text: ${error}`);
                    });
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

    async refreshCustomApps(objId) {
        if (this.apiConnected) {
            for (const customApp of this.config.customApps) {
                if (customApp.name) {
                    const text = String(customApp.text).trim();

                    if (customApp.objId && customApp.objId === objId && text.includes('%s')) {
                        this.log.debug(`[refreshCustomApp] Refreshing custom app "${customApp.name}" with icon "${customApp.icon}" and text "${customApp.text}"`);

                        try {
                            const val = this.customAppsForeignStates[objId].val;
                            let newVal = val;

                            if (this.customAppsForeignStates[objId].type === 'number') {
                                if (!isNaN(val) && val % 1 !== 0) {
                                    let countDecimals = String(val).split('.')[1].length || 2;

                                    if (countDecimals > 3) {
                                        countDecimals = 3; // limit
                                    }

                                    newVal = this.formatValue(val, countDecimals);
                                    this.log.debug(`[refreshCustomApp] formatted value of "${objId}" from ${val} to ${newVal} (${countDecimals} decimals)`);
                                }
                            }

                            await this.buildRequestAsync(`custom?name=${customApp.name}`, 'POST', {
                                text: text
                                    .replace('%s', newVal)
                                    .replace('%u', this.customAppsForeignStates[objId].unit || '')
                                    .trim(),
                                icon: customApp.icon,
                                duration: customApp.duration || DEFAULT_DURATION,
                            }).catch((error) => {
                                this.log.warn(`[refreshCustomApp] Unable to refresh custom app "${customApp.name}": ${error}`);
                            });
                        } catch (error) {
                            this.log.error(`[refreshCustomApp] Unable to refresh custom app "${customApp.name}": ${error}`);
                        }
                    }
                }
            }
        }
    }

    async initHistoryApps() {
        if (this.apiConnected) {
            for (const historyApp of this.config.historyApps) {
                if (historyApp.name) {
                    if (historyApp.objId && historyApp.sourceInstance) {
                        this.log.debug(`[initHistoryApps] getting history data for app "${historyApp.name}" of "${historyApp.objId}" from ${historyApp.sourceInstance}`);

                        try {
                            const itemCount = historyApp.icon ? 11 : 16;
                            const souceInstanceObj = await this.getForeignObjectAsync(`system.adapter.${historyApp.sourceInstance}`);

                            if (souceInstanceObj && souceInstanceObj.common?.getHistory) {
                                const historyData = await this.sendToAsync(historyApp.sourceInstance, 'getHistory', {
                                    id: historyApp.objId,
                                    options: {
                                        end: Date.now(),
                                        count: itemCount,
                                        aggregate: 'onchange',
                                    },
                                });
                                const lineData = historyData?.result.filter((state) => typeof state.val === 'number').map((state) => Math.round(state.val));

                                if (lineData.length > 0) {
                                    await this.buildRequestAsync(`custom?name=${historyApp.name}`, 'POST', {
                                        color: this.config.historyAppsChartColor,
                                        background: this.config.historyAppsBackgroundColor,
                                        line: lineData,
                                        autoscale: true,
                                        icon: historyApp.icon,
                                        duration: historyApp.duration || DEFAULT_DURATION,
                                    }).catch((error) => {
                                        this.log.warn(`[initHistoryApps] Unable to create history app "${historyApp.name}": ${error}`);
                                    });
                                } else {
                                    await this.buildRequestAsync(`custom?name=${historyApp.name}`, 'POST').catch((error) => {
                                        this.log.warn(`[initHistoryApps] Unable to remove history app "${historyApp.name}": ${error}`);
                                    });
                                }
                            } else {
                                this.log.warn(`[initHistoryApps] Unable to get history data for app "${historyApp.name}" of "${historyApp.objId}": "${historyApp.sourceInstance}" is not valid source`);
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

        this.log.debug(`re-creating history apps timeout (${this.config.historyAppsRefreshInterval} seconds)`);
        this.refreshHistoryAppsTimeout =
            this.refreshHistoryAppsTimeout ||
            setTimeout(() => {
                this.refreshHistoryAppsTimeout = null;
                this.initHistoryApps();
            }, this.config.historyAppsRefreshInterval * 1000 || 300);
    }

    createAppObjects() {
        if (this.apiConnected) {
            this.buildRequestAsync('apps', 'GET')
                .then(async (response) => {
                    if (response.status === 200) {
                        const content = response.data;

                        const appPath = 'apps';
                        const nativeApps = ['time', 'eyes', 'date', 'temp', 'hum', 'bat'];
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
                            for (const name of nativeApps.concat(customApps).concat(historyApps)) {
                                appsKeep.push(`${appPath}.${name}`);
                                this.log.debug(`[createAppObjects] found (keep): ${appPath}.${name}`);

                                await this.extendObjectAsync(`${appPath}.${name}`, {
                                    type: 'channel',
                                    common: {
                                        name: `App`,
                                        desc: `${name}${customApps.includes(name) ? ' (custom app)' : ''}${historyApps.includes(name) ? ' (history app)' : ''}`,
                                    },
                                    native: {
                                        isNativeApp: nativeApps.includes(name),
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

                                if (nativeApps.includes(name)) {
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
                                    await this.setStateChangedAsync(`${appPath}.${name}.visible`, { val: existingApps.includes(name), ack: true });
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
                                for (const name of existingApps.filter((a) => !nativeApps.includes(a) && !customApps.includes(a) && !historyApps.includes(a))) {
                                    this.log.info(`[createAppObjects] Deleting unknown app on awtrix light with name "${name}"`);

                                    try {
                                        await this.buildRequestAsync(`custom?name=${name}`, 'POST').catch((error) => {
                                            this.log.warn(`[createAppObjects] Unable to remove unknown app "${name}": ${error}`);
                                        });
                                    } catch (error) {
                                        this.log.error(`[createAppObjects] Unable to delete custom app ${name}: ${error}`);
                                    }
                                }
                            }
                        });
                    }
                })
                .catch((error) => {
                    this.log.debug(`[createAppObjects] received error: ${JSON.stringify(error)}`);
                });
        }
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

            if (this.refreshHistoryAppsTimeout) {
                this.log.debug('clearing history apps timeout');
                clearTimeout(this.refreshHistoryAppsTimeout);
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

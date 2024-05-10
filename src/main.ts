/*
 * Created with @iobroker/create-adapter v2.5.0
 */

import * as utils from '@iobroker/adapter-core';
import { AxiosResponse } from 'axios';

import { rgb565to888Str } from './lib/color-convert';

import { AwtrixApi } from './lib/api';
import { AppType as AppTypeAbstract } from './lib/app-type/abstract';
import { AppType as AppTypeNative } from './lib/app-type/native';
import { AppType as AppTypeUser } from './lib/app-type/user';
import { AppType as AppTypeCustom } from './lib/app-type/user/custom';
import { AppType as AppTypeExpert } from './lib/app-type/user/expert';
import { AppType as AppTypeHistory } from './lib/app-type/user/history';

const NATIVE_APPS = ['Time', 'Date', 'Temperature', 'Humidity', 'Battery'];

export class AwtrixLight extends utils.Adapter {
    private _isMainInstance: boolean;

    private supportedVersion: string;
    private displayedVersionWarning: boolean;

    private apiClient: AwtrixApi.Client | null;
    private apiConnected: boolean;
    private refreshStateTimeout: ioBroker.Timeout | undefined;
    private downloadScreenContentInterval: ioBroker.Interval | undefined;

    private apps: Array<AppTypeAbstract.AbstractApp>;
    private backgroundEffects: Array<string>;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'awtrix-light',
            useFormatDate: true,
        });

        this._isMainInstance = true;

        this.supportedVersion = '0.96';
        this.displayedVersionWarning = false;

        this.apiClient = null;
        this.apiConnected = false;

        this.refreshStateTimeout = undefined;
        this.downloadScreenContentInterval = undefined;

        this.apps = [];
        this.backgroundEffects = [
            'Fade',
            'MovingLine',
            'BrickBreaker',
            'PingPong',
            'Radar',
            'Checkerboard',
            'Fireworks',
            'PlasmaCloud',
            'Ripple',
            'Snake',
            'Pacifica',
            'TheaterChase',
            'Plasma',
            'Matrix',
            'SwirlIn',
            'SwirlOut',
            'LookingEyes',
            'TwinklingStars',
            'ColorWaves',
        ];

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        this.setApiConnected(false);

        await this.upgradeFromPreviousVersion();
        await this.subscribeStatesAsync('*');

        if (!this.config.awtrixIp) {
            this.log.error(`IP address not configured - please check instance configuration and restart`);
            return;
        } else {
            this.apiClient = new AwtrixApi.Client(this, this.config.awtrixIp, 80, this.config.httpTimeout, this.config.userName, this.config.userPassword);
        }

        if (this.config.foreignSettingsInstance !== '' && this.config.foreignSettingsInstance !== this.namespace) {
            this._isMainInstance = false;

            await this.subscribeForeignObjectsAsync(`system.adapter.${this.config.foreignSettingsInstance}`);
            await this.importForeignSettings();
        }

        // Init all apps
        for (const nativeAppName of NATIVE_APPS) {
            if (!this.findAppWithName(nativeAppName)) {
                this.apps.push(new AppTypeNative.Native(this.apiClient, this, nativeAppName));
            }
        }

        let pos = 0;

        for (const customApp of this.config.customApps) {
            if (!this.findAppWithName(customApp.name)) {
                if (!this.config.customPositions) {
                    customApp.position = pos++;
                }
                this.apps.push(new AppTypeCustom.Custom(this.apiClient, this, customApp));
            }
        }

        for (const historyApp of this.config.historyApps) {
            if (!this.findAppWithName(historyApp.name)) {
                if (!this.config.customPositions) {
                    historyApp.position = pos++;
                }
                this.apps.push(new AppTypeHistory.History(this.apiClient, this, historyApp));
            }
        }

        for (const expertApp of this.config.expertApps) {
            if (!this.findAppWithName(expertApp.name)) {
                if (!this.config.customPositions) {
                    expertApp.position = pos++;
                }
                this.apps.push(new AppTypeExpert.Expert(this.apiClient, this, expertApp));
            }
        }

        this.refreshState();
    }

    private async upgradeFromPreviousVersion(): Promise<void> {
        this.log.debug(`Upgrading objects from previous version`);

        await this.delObjectAsync('apps.eyes', { recursive: true }); // eyes app was removed in firmware 0.71

        await this.extendObjectAsync('settings.calendarHeaderColor', {
            common: {
                type: 'string',
                role: 'level.color.rgb',
                def: '#FF0000',
            },
        });

        await this.extendObjectAsync('settings.calendarBodyColor', {
            common: {
                type: 'string',
                role: 'level.color.rgb',
                def: '#FFFFFF',
            },
        });

        await this.extendObjectAsync('settings.calendarTextColor', {
            common: {
                type: 'string',
                role: 'level.color.rgb',
                def: '#000000',
            },
        });
    }

    private async importForeignSettings(): Promise<void> {
        try {
            this.log.info(`Using settings of other instance: ${this.config.foreignSettingsInstance}`);

            const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.config.foreignSettingsInstance}`);

            if (instanceObj && instanceObj.native) {
                if (!instanceObj.native?.foreignSettingsInstance) {
                    this.config.customApps = instanceObj.native.customApps;
                    this.config.ignoreNewValueForAppInTimeRange = instanceObj.native.ignoreNewValueForAppInTimeRange;
                    this.config.historyApps = instanceObj.native.historyApps;
                    this.config.historyAppsRefreshInterval = instanceObj.native.historyAppsRefreshInterval;
                    this.config.autoDeleteForeignApps = instanceObj.native.autoDeleteForeignApps;
                    this.config.removeAppsOnStop = instanceObj.native.removeAppsOnStop;
                    this.config.expertApps = instanceObj.native.expertApps;
                    this.config.customPositions = instanceObj.native.customPositions;

                    this.log.debug(`[importForeignSettings] Copied settings from foreign instance "system.adapter.${this.config.foreignSettingsInstance}"`);
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

    public isMainInstance(): boolean {
        return this._isMainInstance;
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (id && state && !state.ack) {
            const idNoNamespace = this.removeNamespace(id);

            this.log.debug(`state ${idNoNamespace} changed: ${state.val}`);

            if (this.apiClient!.isConnected()) {
                if (idNoNamespace.startsWith('settings.')) {
                    this.log.debug(`changing setting ${idNoNamespace} power to ${state.val}`);

                    const settingsObj = await this.getObjectAsync(idNoNamespace);
                    if (settingsObj && settingsObj.native?.settingsKey) {
                        this.apiClient!.settingsRequestAsync({ key: settingsObj.native.settingsKey, value: state.val })
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

                    this.apiClient!.requestAsync('power', 'POST', { power: state.val })
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(power) Unable to execute action: ${error}`);
                        });
                } else if (idNoNamespace === 'device.sleep') {
                    this.log.debug(`enable sleep mode of device for ${state.val} seconds`);

                    this.apiClient!.requestAsync('sleep', 'POST', { sleep: state.val })
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                await this.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                                this.setApiConnected(false);
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

                    this.apiClient!.requestAsync('doupdate', 'POST')
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.log.info('started firmware update');
                                this.setApiConnected(false);
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(doupdate) Unable to execute firmware update (maybe this is already the newest version): ${error}`);
                        });
                } else if (idNoNamespace === 'device.reboot') {
                    this.apiClient!.requestAsync('reboot', 'POST')
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.log.info('rebooting device');
                                this.setApiConnected(false);
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(reboot) Unable to execute action: ${error}`);
                        });
                } else if (idNoNamespace === 'notification.dismiss') {
                    this.apiClient!.requestAsync('notify/dismiss', 'POST')
                        .then(async (response) => {
                            if (response.status === 200 && response.data === 'OK') {
                                this.log.info('dismissed notifications');
                            }
                        })
                        .catch((error) => {
                            this.log.warn(`(notify/dismiss) Unable to execute action: ${error}`);
                        });
                } else if (idNoNamespace === 'apps.next') {
                    this.log.debug('switching to next app');

                    this.apiClient!.requestAsync('nextapp', 'POST').catch((error) => {
                        this.log.warn(`(nextapp) Unable to execute action: ${error}`);
                    });
                } else if (idNoNamespace === 'apps.prev') {
                    this.log.debug('switching to previous app');

                    this.apiClient!.requestAsync('previousapp', 'POST').catch((error) => {
                        this.log.warn(`(previousapp) Unable to execute action: ${error}`);
                    });
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
                this.log.warn(`Unable to perform action for ${idNoNamespace} - API is not connected (device not reachable?)`);
            }
        }
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    private async onObjectChange(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
        // Imported settings changed
        if (!this.isMainInstance() && id && id == `system.adapter.${this.config.foreignSettingsInstance}`) {
            await this.importForeignSettings();
            this.restart();
        }
    }

    private onMessage(obj: ioBroker.Message): void {
        this.log.debug(`[onMessage] received command "${obj.command}" with message: ${JSON.stringify(obj.message)}`);

        if (obj && obj.message) {
            if (obj.command === 'getBackgroundEffects') {
                this.sendTo(
                    obj.from,
                    obj.command,
                    this.backgroundEffects.map((v) => ({ value: v, label: v })),
                    obj.callback,
                );
            } else if (obj.command === 'notification' && typeof obj.message === 'object') {
                // Notification
                if (this.apiClient!.isConnected()) {
                    const msgFiltered: AwtrixApi.App = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null)); // eslint-disable-line no-unused-vars

                    // Remove repeat if <= 0
                    if (msgFiltered.repeat !== undefined && msgFiltered.repeat <= 0) {
                        delete msgFiltered.repeat;
                    }

                    // Remove duration if <= 0
                    if (msgFiltered.duration !== undefined && msgFiltered.duration <= 0) {
                        delete msgFiltered.duration;
                    }

                    this.apiClient!.requestAsync('notify', 'POST', msgFiltered)
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
                if (this.apiClient!.isConnected()) {
                    const msgFiltered = Object.fromEntries(Object.entries(obj.message).filter(([_, v]) => v !== null)); // eslint-disable-line no-unused-vars

                    this.apiClient!.requestAsync('sound', 'POST', msgFiltered)
                        .then((response) => {
                            this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
                        })
                        .catch((error) => {
                            this.sendTo(obj.from, obj.command, { error }, obj.callback);
                        });
                } else {
                    this.sendTo(obj.from, obj.command, { error: 'API is not connected (device offline ?)' }, obj.callback);
                }
            } else if (obj.command === 'rtttl' && typeof obj.message === 'string') {
                // RTTTL sounds
                this.apiClient!.requestAsync('rtttl', 'POST', obj.message)
                    .then((response) => {
                        this.sendTo(obj.from, obj.command, { error: null, data: response.data }, obj.callback);
                    })
                    .catch((error) => {
                        this.sendTo(obj.from, obj.command, { error }, obj.callback);
                    });
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

    private async setApiConnected(connection: boolean): Promise<void> {
        if (connection !== this.apiConnected) {
            await this.setStateChangedAsync('info.connection', { val: connection, ack: true });
            this.apiConnected = connection;

            if (connection) {
                // API was offline - refresh all states
                this.log.debug('API is online');

                try {
                    // welcome (ioBroker icon)
                    this.apiClient!.requestAsync('notify', 'POST', {
                        duration: 2,
                        draw: [
                            {
                                dc: [16, 4, 3, '#164477'], // [x, y, r, cl] Draw a circle with center at (x, y), radius r, and color cl
                                dl: [16, 3, 16, 8, '#3399cc'], // [x0, y0, x1, y1, cl] Draw a line from (x0, y0) to (x1, y1) with color cl
                                dp: [16, 1, '#3399cc'], // [x, y, cl] Draw a pixel at position (x, y) with color cl
                            },
                        ],
                    }).catch((error) => {
                        this.log.warn(error);
                    });

                    // settings
                    await this.refreshSettings();
                    await this.refreshBackgroundEffects();
                    await this.refreshTransitions();

                    // apps
                    await this.createAppObjects();

                    for (const app of this.apps) {
                        if (app instanceof AppTypeUser.UserApp) {
                            if (await app.init()) {
                                await app.refresh();
                            }
                        }
                    }

                    // indicators
                    for (let i = 1; i <= 3; i++) {
                        await this.updateIndicatorByStates(i);
                    }

                    // moodlight
                    await this.updateMoodlightByStates();

                    if (this.config.downloadScreenContent && !this.downloadScreenContentInterval) {
                        this.log.debug(`[setApiConnected] Downloading screen contents every ${this.config.downloadScreenContentInterval} seconds`);

                        this.downloadScreenContentInterval = this.setInterval(() => {
                            if (this.apiClient!.isConnected()) {
                                this.apiClient!.requestAsync('screen', 'GET')
                                    .then(async (response) => {
                                        if (response.status === 200) {
                                            const pixelData = response.data;
                                            const width = 640;
                                            const height = 160;
                                            const scaleX = width / 32;
                                            const scaleY = height / 8;

                                            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 160">`;

                                            for (let y = 0; y < 8; y++) {
                                                for (let x = 0; x < 32; x++) {
                                                    const color = rgb565to888Str(pixelData[y * 32 + x]);
                                                    svg += `\n  <rect style="fill: ${color}; stroke: #000000; stroke-width: 2px;" `;
                                                    svg += `x="${x * scaleX}" y="${y * scaleY}" width="${scaleX}" height="${scaleY}"/>`;
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
                    } else {
                        await this.setStateAsync('display.content', { val: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"/>`, ack: true, c: 'Feature disabled', q: 0x01 });
                    }
                } catch (error) {
                    this.log.error(`[setApiConnected] Unable to refresh settings, apps or indicators: ${error}`);
                }
            } else {
                if (this.downloadScreenContentInterval) {
                    this.clearInterval(this.downloadScreenContentInterval);
                    this.downloadScreenContentInterval = undefined;
                }

                this.log.debug('API is offline');
            }
        }
    }

    private refreshState(): void {
        this.log.debug('refreshing device state');

        this.apiClient!.getStatsAsync()
            .then(async (content) => {
                await this.setApiConnected(true);

                if (this.isNewerVersion(content.version, this.supportedVersion) && !this.displayedVersionWarning) {
                    // @ts-expect-error extend scope
                    this.registerNotification('awtrix-light', 'deviceUpdate', `Firmware update: ${content.version} -> ${this.supportedVersion}`);

                    this.log.warn(`You should update your Awtrix Light - supported version of this adapter is ${this.supportedVersion} (or later). Your current version is ${content.version}`);
                    this.displayedVersionWarning = true; // Just show once
                }

                await this.setStateChangedAsync('meta.uid', { val: content.uid, ack: true });
                await this.setStateChangedAsync('meta.version', { val: content.version, ack: true });

                await this.setStateChangedAsync('sensor.lux', { val: parseInt(content.lux), ack: true });
                await this.setStateChangedAsync('sensor.temp', { val: parseInt(content.temp), ack: true });
                await this.setStateChangedAsync('sensor.humidity', { val: parseInt(content.hum), ack: true });

                await this.setStateChangedAsync('display.brightness', { val: content.bri, ack: true });

                await this.setStateChangedAsync('device.battery', { val: content.bat, ack: true });
                await this.setStateChangedAsync('device.ipAddress', { val: content.ip_address, ack: true });
                await this.setStateChangedAsync('device.wifiSignal', { val: content.wifi_signal, ack: true });
                await this.setStateChangedAsync('device.freeRAM', { val: content.ram, ack: true });
                await this.setStateChangedAsync('device.uptime', { val: parseInt(content.uptime), ack: true });
            })
            .catch((error) => {
                this.log.debug(`(stats) received error - API is now offline: ${JSON.stringify(error)}`);
                this.setApiConnected(false);
            });

        this.log.debug('re-creating refresh state timeout');
        this.refreshStateTimeout =
            this.refreshStateTimeout ||
            this.setTimeout(() => {
                this.refreshStateTimeout = undefined;
                this.refreshState();
            }, 60 * 1000);
    }

    private async refreshSettings(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.apiClient!.requestAsync('settings', 'GET')
                .then(async (response) => {
                    if (response.status === 200) {
                        const content = response.data;

                        const settingsStates = await this.getObjectViewAsync('system', 'state', {
                            startkey: `${this.namespace}.settings.`,
                            endkey: `${this.namespace}.settings.\u9999`,
                        });

                        // Find all available settings objects with settingsKey
                        const knownSettings: { [key: string]: { id: string; role: string } } = {};
                        for (const settingsObj of settingsStates.rows) {
                            if (settingsObj.value?.native?.settingsKey) {
                                knownSettings[settingsObj.value.native.settingsKey] = {
                                    id: this.removeNamespace(settingsObj.id),
                                    role: settingsObj.value.common.role,
                                };
                            }
                        }

                        const unknownSettings = [];

                        for (const [settingsKey, val] of Object.entries(content)) {
                            if (Object.prototype.hasOwnProperty.call(knownSettings, settingsKey)) {
                                if (knownSettings[settingsKey].role === 'level.color.rgb') {
                                    const newVal = rgb565to888Str(val as number);
                                    this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${newVal} (converted from ${val})`);

                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val: newVal, ack: true, c: 'Updated from API (converted from RGB565)' });
                                } else {
                                    this.log.debug(`[refreshSettings] updating settings value "${knownSettings[settingsKey].id}" to ${val}`);

                                    await this.setStateChangedAsync(knownSettings[settingsKey].id, { val: val as string | number, ack: true, c: 'Updated from API' });
                                }
                            } else {
                                unknownSettings.push(settingsKey);
                            }
                        }

                        this.log.debug(`[refreshSettings] Missing setting objects for keys: ${JSON.stringify(unknownSettings)}`);
                    }

                    resolve(response.status);
                })
                .catch((error) => {
                    this.log.warn(`(settings) Received error: ${JSON.stringify(error)}`);

                    reject(error);
                });
        });
    }

    private async refreshBackgroundEffects(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.apiClient!.requestAsync('effects')
                .then((response) => {
                    if (response.status === 200) {
                        this.log.debug(`[refreshBackgroundEffects] Existing effects "${JSON.stringify(response.data)}"`);

                        this.backgroundEffects = response.data;

                        resolve(true);
                    } else {
                        reject(`${response.status}: ${response.data}`);
                    }
                })
                .catch(reject);
        });
    }

    private async refreshTransitions(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.apiClient!.requestAsync('transitions')
                .then((response) => {
                    if (response.status === 200) {
                        this.log.debug(`[refreshTransitions] Existing transitions "${JSON.stringify(response.data)}"`);

                        const states: { [key: string]: string } = {};
                        for (let i = 0; i < response.data.length; i++) {
                            states[i] = response.data[i];
                        }

                        this.extendObjectAsync('settings.appTransitionEffect', {
                            common: {
                                states,
                            },
                        }).then(() => {
                            resolve();
                        });
                    } else {
                        reject(`${response.status}: ${response.data}`);
                    }
                })
                .catch(reject);
        });
    }

    private findAppWithName(name: string): AppTypeAbstract.AbstractApp | undefined {
        return this.apps.find((app) => app.getName() === name);
    }

    private async createAppObjects(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            if (this.apiClient!.isConnected()) {
                this.apiClient!.requestAsync('apps', 'GET')
                    .then(async (response) => {
                        if (response.status === 200) {
                            const content = response.data as Array<{ name: string }>;

                            const customApps = this.config.customApps.map((a) => a.name);
                            const historyApps = this.config.historyApps.map((a) => a.name);
                            const expertApps = this.config.expertApps.map((a) => a.name);
                            const existingApps = content.map((a) => a.name);
                            const allApps = [...NATIVE_APPS, ...customApps, ...historyApps, ...expertApps];

                            this.log.debug(`[createAppObjects] existing apps on awtrix light: ${JSON.stringify(existingApps)}`);

                            const appsAll = [];
                            const appsKeep = [];

                            // Collect all existing apps from objects
                            const existingChannels = await this.getChannelsOfAsync('apps');
                            if (existingChannels) {
                                for (const existingChannel of existingChannels) {
                                    const id = this.removeNamespace(existingChannel._id);

                                    // Check if the state is a direct child (e.g. apps.temp)
                                    if (id.split('.').length === 2) {
                                        appsAll.push(id);
                                    }
                                }
                            }

                            // Create new app structure for all native apps and apps of instance configuration
                            for (const name of allApps) {
                                appsKeep.push(`apps.${name}`);
                                this.log.debug(`[createAppObjects] found (keep): apps.${name}`);

                                const isNativeApp = NATIVE_APPS.includes(name);
                                const isCustomApp = customApps.includes(name);
                                const isHistoryApp = historyApps.includes(name);
                                const isExpertApp = expertApps.includes(name);

                                const app = this.findAppWithName(name);
                                if (app) {
                                    await this.extendObjectAsync(`apps.${name}`, {
                                        type: 'channel',
                                        common: {
                                            name: `App ${name}`,
                                            desc: `${app.getDescription()} app`,
                                        },
                                        native: {
                                            isNativeApp,
                                            isCustomApp,
                                            isHistoryApp,
                                            isExpertApp,
                                        },
                                    });

                                    await app.createObjects();
                                }
                            }

                            // Delete non existent apps
                            for (const app of appsAll) {
                                if (!appsKeep.includes(app)) {
                                    await this.delObjectAsync(app, { recursive: true });
                                    this.log.debug(`[createAppObjects] deleted: ${app}`);
                                }
                            }

                            if (this.config.autoDeleteForeignApps) {
                                // Delete unknown apps on awtrix light
                                for (const name of existingApps.filter((a) => !allApps.includes(a))) {
                                    this.log.info(`[createAppObjects] Deleting unknown app on awtrix light with name "${name}"`);

                                    try {
                                        await this.apiClient!.removeAppAsync(name).catch((error) => {
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
                    })
                    .catch((error) => {
                        this.log.debug(`[createAppObjects] received error: ${JSON.stringify(error)}`);

                        reject(error);
                    });
            } else {
                reject('API_OFFLINE');
            }
        });
    }

    private async updateIndicatorByStates(index: number): Promise<AxiosResponse> {
        this.log.debug(`Updating indicator with index ${index}`);

        const indicatorStates = await this.getStatesAsync(`indicator.${index}.*`);
        const indicatorValues: { [key: string]: ioBroker.StateValue } = Object.entries(indicatorStates).reduce(
            (acc, [objId, state]) => ({
                ...acc,
                [this.removeNamespace(objId)]: state.val,
            }),
            {},
        );

        const postObj: AwtrixApi.Indicator = {
            color: indicatorValues[`indicator.${index}.color`] as string,
        };

        if (postObj.color !== '0') {
            const blink = indicatorValues[`indicator.${index}.blink`] as number;
            if (blink > 0) {
                postObj.blink = blink;
            } else {
                const fade = indicatorValues[`indicator.${index}.fade`] as number;
                postObj.fade = fade;
            }
        }

        return this.apiClient!.indicatorRequestAsync(index, indicatorValues[`indicator.${index}.active`] ? postObj : undefined);
    }

    private async updateMoodlightByStates(): Promise<AxiosResponse> {
        this.log.debug(`Updating moodlight`);

        const moodlightStates = await this.getStatesAsync('display.moodlight.*');
        const moodlightValues: { [key: string]: ioBroker.StateValue } = Object.entries(moodlightStates).reduce(
            (acc, [objId, state]) => ({
                ...acc,
                [this.removeNamespace(objId)]: state.val,
            }),
            {},
        );

        const postObj: AwtrixApi.Moodlight = {
            brightness: moodlightValues['display.moodlight.brightness'] as number,
            color: String(moodlightValues['display.moodlight.color']).toUpperCase(),
        };

        return this.apiClient!.requestAsync('moodlight', 'POST', moodlightValues['display.moodlight.active'] ? postObj : undefined);
    }

    public removeNamespace(id: string): string {
        const re = new RegExp(this.namespace + '*\\.', 'g');
        return id.replace(re, '');
    }

    private async onUnload(callback: () => void): Promise<void> {
        try {
            for (const app of this.apps) {
                if (app instanceof AppTypeUser.UserApp) {
                    await app.unloadAsync();
                }
            }

            await this.setApiConnected(false);

            if (this.refreshStateTimeout) {
                this.log.debug('clearing refresh state timeout');
                this.clearTimeout(this.refreshStateTimeout);
            }

            if (this.downloadScreenContentInterval) {
                this.clearInterval(this.downloadScreenContentInterval);
                this.downloadScreenContentInterval = undefined;
            }

            callback();
        } catch (e) {
            callback();
        }
    }

    private isNewerVersion(oldVer: string, newVer: string): boolean {
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
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new AwtrixLight(options);
} else {
    // otherwise start the instance directly
    (() => new AwtrixLight())();
}

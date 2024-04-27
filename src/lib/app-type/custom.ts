import { AwtrixLight } from '../../main';
import { CustomApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    type ObjCache = {
        val: string | ioBroker.StateValue | undefined;
        unit: any;
        type: string;
        ts: number;
    };

    export class Custom extends AbstractAppType.AbstractApp {
        private appDefinition: CustomApp;
        private objCache: ObjCache | undefined;
        private isStaticText: boolean;
        private isBackgroundOny: boolean;
        private cooldownTimeout: ioBroker.Timeout | undefined;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: CustomApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.objCache = undefined;
            this.isStaticText = false;
            this.isBackgroundOny = true;
            this.cooldownTimeout = undefined;
        }

        public override async init(): Promise<boolean> {
            const text = String(this.appDefinition.text).trim();
            if (text.length > 0) {
                if (this.appDefinition.objId && text.includes('%s')) {
                    try {
                        const objId = this.appDefinition.objId;
                        const obj = await this.adapter.getForeignObjectAsync(objId);
                        if (obj && obj.type === 'state') {
                            const state = await this.adapter.getForeignStateAsync(objId);

                            this.isStaticText = false;
                            this.objCache = {
                                val: state && state.ack ? state.val : undefined,
                                type: obj?.common.type,
                                unit: obj?.common?.unit,
                                ts: state ? state.ts : Date.now(),
                            };

                            const supportedTypes = ['string', 'number', 'mixed'];
                            if (obj?.common.type && !supportedTypes.includes(obj.common.type)) {
                                this.adapter.log.warn(
                                    `[initCustomApp] Object of app "${this.appDefinition.name}" with objId "${objId}" has invalid type: ${obj.common.type} instead of ${supportedTypes.join(', ')}`,
                                );
                            }

                            if (text.includes('%u') && !obj?.common?.unit) {
                                this.adapter.log.warn(
                                    `[initCustomApp] Object of app "${this.appDefinition.name}" (${objId}) has no unit - remove "%u" from text or define unit in object (common.unit)`,
                                );
                            }

                            if (state && !state.ack) {
                                this.adapter.log.info(`[initCustomApp] State value of app "${this.appDefinition.name}" (${objId}) is not acknowledged (ack: false) - waiting for new value`);
                            }

                            await this.adapter.subscribeForeignStatesAsync(objId);
                            await this.adapter.subscribeForeignObjectsAsync(objId);

                            this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" (${obj.common.type}) with objId "${objId}" - subscribed to changes`);
                        } else {
                            this.adapter.log.warn(`[initCustomApp] App "${this.appDefinition.name}" was configured with invalid objId "${objId}": Invalid type ${obj?.type}`);
                        }
                    } catch (error) {
                        this.adapter.log.error(`[initCustomApp] Unable to get object information for app "${this.appDefinition.name}": ${error}`);
                    }
                } else {
                    this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" with static text`);
                    this.isStaticText = true;
                }
            } else if (this.appDefinition.useBackgroundEffect && this.appDefinition.backgroundEffect) {
                this.adapter.log.debug(`[initCustomApp] Init app "${this.appDefinition.name}" with background only`);
                this.isBackgroundOny = true;
            }

            return super.init();
        }

        private createAppRequestObj(text: string, val?: ioBroker.StateValue): AwtrixApi.App {
            const app: AwtrixApi.App = {
                pos: this.appDefinition.position,
            };

            if (text !== '') {
                app.text = text;
                app.textCase = 2; // show as sent
            }

            // Background
            if (this.appDefinition.useBackgroundEffect) {
                app.effect = this.appDefinition.backgroundEffect;
            } else if (this.appDefinition.backgroundColor) {
                app.background = this.appDefinition.backgroundColor;
            }

            // Set rainbow colors OR text color
            if (this.appDefinition.rainbow) {
                app.rainbow = true;
            } else if (this.appDefinition.textColor) {
                app.color = this.appDefinition.textColor;
            }

            // Set noScroll OR scroll speed
            if (this.appDefinition.noScroll) {
                app.noScroll = true;
            } else {
                // Scroll speed
                if (this.appDefinition.scrollSpeed > 0) {
                    app.scrollSpeed = this.appDefinition.scrollSpeed;
                }

                // Repeat
                if (this.appDefinition.repeat > 0) {
                    app.repeat = this.appDefinition.repeat;
                }
            }

            // Icon
            if (this.appDefinition.icon) {
                app.icon = this.appDefinition.icon;
            }

            // Duration
            if (this.appDefinition.duration > 0) {
                app.duration = this.appDefinition.duration;
            }

            // Thresholds
            if (typeof val === 'number') {
                if (this.appDefinition.thresholdLtActive && val < this.appDefinition.thresholdLtValue) {
                    this.adapter.log.debug(
                        `[createAppRequestObj] LT < custom app "${this.appDefinition.name}" has a value (${val}) less than ${this.appDefinition.thresholdLtValue} - overriding values`,
                    );

                    if (this.appDefinition.thresholdLtIcon) {
                        app.icon = this.appDefinition.thresholdLtIcon;
                    }
                    if (this.appDefinition.thresholdLtTextColor) {
                        app.color = this.appDefinition.thresholdLtTextColor;
                        app.rainbow = false; // disable rainbow
                    }
                    if (this.appDefinition.thresholdLtBackgroundColor) {
                        app.background = this.appDefinition.thresholdLtBackgroundColor;

                        if (this.appDefinition.useBackgroundEffect) {
                            delete app.effect;
                        }
                    }
                } else if (this.appDefinition.thresholdGtActive && val > this.appDefinition.thresholdGtValue) {
                    this.adapter.log.debug(
                        `[createAppRequestObj] GT > custom app "${this.appDefinition.name}" has a value (${val}) greater than ${this.appDefinition.thresholdGtValue} - overriding values`,
                    );

                    if (this.appDefinition.thresholdGtIcon) {
                        app.icon = this.appDefinition.thresholdGtIcon;
                    }
                    if (this.appDefinition.thresholdGtTextColor) {
                        app.color = this.appDefinition.thresholdGtTextColor;
                        app.rainbow = false; // disable rainbow
                    }
                    if (this.appDefinition.thresholdGtBackgroundColor) {
                        app.background = this.appDefinition.thresholdGtBackgroundColor;

                        if (this.appDefinition.useBackgroundEffect) {
                            delete app.effect;
                        }
                    }
                }
            } else if (this.appDefinition.thresholdLtActive || this.appDefinition.thresholdGtActive) {
                this.adapter.log.warn(`[createAppRequestObj] Found enabled thresholds for custom app "${this.appDefinition.name}" - data type is invalid (${typeof val})`);
            }

            return app;
        }

        public override async refresh(): Promise<boolean> {
            let refreshed = false;

            if (await super.refresh()) {
                const text = String(this.appDefinition.text).trim();

                if (this.objCache && !this.isStaticText) {
                    this.adapter.log.debug(`[refreshCustomApp] Refreshing custom app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and text "${this.appDefinition.text}"`);

                    try {
                        if (this.isVisible) {
                            const val = this.objCache.val;

                            if (typeof val !== 'undefined') {
                                let newVal = val;

                                if (this.objCache.type === 'number') {
                                    const realVal = typeof val !== 'number' ? parseFloat(val as string) : val;
                                    const decimals = typeof this.appDefinition.decimals === 'string' ? parseInt(this.appDefinition.decimals) : this.appDefinition.decimals ?? 3;

                                    if (!isNaN(realVal) && realVal % 1 !== 0) {
                                        const valParts = String(realVal).split('.');
                                        const countDigits = valParts[0].length;
                                        let countDecimals = valParts[1].length || 3;

                                        this.adapter.log.debug(`[refreshCustomApp] value of objId "${this.appDefinition.objId}" has ${countDigits} digits and ${countDecimals} decimals`);

                                        if (countDecimals > decimals) {
                                            countDecimals = decimals; // limit
                                        }

                                        const numFormat = this.adapter.config.numberFormat;

                                        // Dynamic round
                                        if (this.appDefinition.dynamicRound) {
                                            let maxLength = 7; // without icon
                                            if (this.appDefinition.icon) {
                                                maxLength = 5;
                                            }

                                            // digits
                                            maxLength -= countDigits; // substract values in front of decimal point

                                            // If thousands seperator
                                            if (['.,', ',.'].includes(numFormat) && countDigits > 3) {
                                                maxLength -= 1;
                                            }

                                            // unit
                                            maxLength -= this.objCache.unit ? text.trim().replace('%s', '').replace('%u', this.objCache.unit).length : 1;

                                            if (maxLength < countDecimals) {
                                                countDecimals = maxLength >= 0 ? maxLength : 0;
                                            }
                                        }

                                        if (numFormat === 'system') {
                                            newVal = this.adapter.formatValue(realVal, countDecimals);
                                        } else if (['.,', ',.'].includes(numFormat)) {
                                            newVal = this.adapter.formatValue(realVal, countDecimals, numFormat);
                                        } else if (numFormat === '.') {
                                            newVal = realVal.toFixed(countDecimals);
                                        } else if (numFormat === ',') {
                                            newVal = realVal.toFixed(countDecimals).replace('.', ',');
                                        }

                                        this.adapter.log.debug(
                                            `[refreshCustomApp] value (formatted) of objId "${this.appDefinition.objId}" from ${realVal} to ${newVal} (${countDecimals} decimals) with "${numFormat}"`,
                                        );
                                    }
                                }

                                const displayText = text
                                    .replace('%s', newVal as string)
                                    .replace('%u', this.objCache.unit ?? '')
                                    .trim();

                                if (displayText.length > 0) {
                                    await this.apiClient!.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText, val)).catch((error) => {
                                        this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                                    });

                                    refreshed = true;
                                } else {
                                    // Empty text => remove app
                                    this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (empty text)`);

                                    await this.apiClient!.removeAppAsync(this.appDefinition.name).catch((error) => {
                                        this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" (empty text): ${error}`);
                                    });
                                }
                            } else {
                                // No state value => remove app
                                this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" (no state data)`);

                                await this.apiClient!.removeAppAsync(this.appDefinition.name).catch((error) => {
                                    this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" (no state data): ${error}`);
                                });
                            }
                        }
                    } catch (error) {
                        this.adapter.log.error(`[refreshCustomApp] Unable to refresh app "${this.appDefinition.name}": ${error}`);
                    }
                } else if (this.isStaticText) {
                    // App with static text (no %s specified)
                    this.adapter.log.debug(`[refreshCustomApp] Creating app "${this.appDefinition.name}" with icon "${this.appDefinition.icon}" and static text "${this.appDefinition.text}"`);

                    if (this.appDefinition.objId) {
                        this.adapter.log.warn(
                            `[refreshCustomApp] App "${this.appDefinition.name}" was defined with objId "${this.appDefinition.objId}" but "%s" is not used in the text - state changes will be ignored`,
                        );
                    }

                    const displayText = text.replace('%u', '').trim();

                    if (displayText.length > 0) {
                        await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj(displayText)).catch((error) => {
                            this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}" with static text: ${error}`);
                        });

                        refreshed = true;
                    } else {
                        // Empty text => remove app
                        this.adapter.log.debug(`[refreshCustomApp] Going to remove app "${this.appDefinition.name}" with static text (empty text)`);

                        await this.apiClient.removeAppAsync(this.appDefinition.name).catch((error) => {
                            this.adapter.log.warn(`[refreshCustomApp] Unable to remove app "${this.appDefinition.name}" with static text (empty text): ${error}`);
                        });
                    }
                } else if (this.isBackgroundOny) {
                    await this.apiClient.appRequestAsync(this.appDefinition.name, this.createAppRequestObj('')).catch((error) => {
                        this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}" with background only: ${error}`);
                    });

                    refreshed = true;
                }
            }

            return refreshed;
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            if (this.objCache && !this.isStaticText) {
                if (id && state && id === this.appDefinition.objId) {
                    if (state.ack) {
                        // Just refresh if value has changed
                        if (state.val !== this.objCache.val) {
                            this.adapter.log.debug(`[onStateChange] "${this.appDefinition.name}" received state change of objId "${id}" from ${this.objCache.val} to ${state.val} (ts: ${state.ts})`);

                            if (this.objCache.ts + this.ignoreNewValueForAppInTimeRange * 1000 < state.ts) {
                                this.objCache.val = this.objCache.type === 'mixed' ? String(state.val) : state.val;
                                this.objCache.ts = state.ts;

                                this.clearCooldownTimeout();
                                this.refresh();
                            } else {
                                this.adapter.log.debug(
                                    `[onStateChange] "${this.appDefinition.name}" ignoring customApps state change of objId "${id}" to ${state.val} - refreshes too fast (within ${
                                        this.ignoreNewValueForAppInTimeRange
                                    } seconds) - Last update: ${this.adapter.formatDate(this.objCache.ts, 'YYYY-MM-DD hh:mm:ss.sss')}`,
                                );

                                // Set this value as the new value if no new value arrives
                                this.clearCooldownTimeout();
                                this.cooldownTimeout = this.adapter.setTimeout(
                                    () => {
                                        this.cooldownTimeout = undefined;

                                        if (this.objCache) {
                                            this.objCache.val = this.objCache.type === 'mixed' ? String(state.val) : state.val;
                                            this.objCache.ts = state.ts;

                                            this.refresh();
                                        }
                                    },
                                    (this.ignoreNewValueForAppInTimeRange + 1) * 1000, // +1 seconds
                                );
                            }
                        }
                    } else {
                        this.adapter.log.debug(`[onStateChange] "${this.appDefinition.name}" ignoring state change of "${id}" to ${state.val} - ack is false`);
                    }
                }
            }
        }

        protected override async objectChanged(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
            if (this.objCache && !this.isStaticText) {
                if (id && id === this.appDefinition.objId) {
                    if (!obj) {
                        this.objCache = undefined;
                    } else {
                        this.objCache.type = obj?.common.type;
                        this.objCache.unit = obj?.common?.unit;

                        this.refresh();
                    }
                }
            }
        }

        private clearCooldownTimeout(): void {
            if (this.cooldownTimeout) {
                this.adapter.clearTimeout(this.cooldownTimeout);
                this.cooldownTimeout = undefined;
            }
        }

        public override async unloadAsync(): Promise<void> {
            if (this.cooldownTimeout) {
                this.adapter.log.debug(`clearing custom app cooldown timeout for "${this.getName()}"`);
                this.adapter.clearTimeout(this.cooldownTimeout);
            }

            await super.unloadAsync();
        }
    }
}

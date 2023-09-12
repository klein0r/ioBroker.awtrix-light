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

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: CustomApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.objCache = undefined;
            this.isStaticText = false;
        }

        public override async init(): Promise<boolean> {
            const text = String(this.appDefinition.text).trim();
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
                            this.adapter.log.warn(`[initCustomApp] Object of app "${this.appDefinition.name}" (${objId}) has no unit - remove "%u" from text or define unit in object (common.unit)`);
                        }

                        if (state && !state.ack) {
                            this.adapter.log.info(`[initCustomApp] State value of app "${this.appDefinition.name}" (${objId}) is not acknowledged (ack: false) - waiting for new value`);
                        }

                        await this.adapter.subscribeForeignStatesAsync(objId);
                        await this.adapter.subscribeForeignObjectsAsync(objId);

                        this.adapter.log.debug(`[initCustomApp] Found app "${this.appDefinition.name}" with objId "${objId}" - subscribed to changes`);
                    } else {
                        this.adapter.log.warn(`[initCustomApp] App "${this.appDefinition.name}" was configured with invalid objId "${objId}": Invalid type ${obj?.type}`);
                    }
                } catch (error) {
                    this.adapter.log.error(`[initCustomApp] Unable to get object information for app "${this.appDefinition.name}": ${error}`);
                }
            }

            return super.init();
        }

        private createAppRequestObj(text: string, val?: ioBroker.StateValue): AwtrixApi.App {
            const moreOptions: AwtrixApi.App = {};

            // Background
            if (this.appDefinition.useBackgroundEffect) {
                moreOptions.effect = this.appDefinition.backgroundEffect;
            } else if (this.appDefinition.backgroundColor) {
                moreOptions.background = this.appDefinition.backgroundColor;
            }

            // Set rainbow colors OR text color
            if (this.appDefinition.rainbow) {
                moreOptions.rainbow = true;
            } else if (this.appDefinition.textColor) {
                moreOptions.color = this.appDefinition.textColor;
            }

            // Set noScroll OR scroll speed
            if (this.appDefinition.noScroll) {
                moreOptions.noScroll = true;
            } else {
                // Scroll speed
                if (this.appDefinition.scrollSpeed > 0) {
                    moreOptions.scrollSpeed = this.appDefinition.scrollSpeed;
                }

                // Repeat
                if (this.appDefinition.repeat > 0) {
                    moreOptions.repeat = this.appDefinition.repeat;
                }
            }

            // Icon
            if (this.appDefinition.icon) {
                moreOptions.icon = this.appDefinition.icon;
            }

            // Duration
            if (this.appDefinition.duration > 0) {
                moreOptions.duration = this.appDefinition.duration;
            }

            // Thresholds
            if (typeof val === 'number') {
                if (this.appDefinition.thresholdLtActive && val < this.appDefinition.thresholdLtValue) {
                    this.adapter.log.debug(
                        `[createAppRequestObj] LT < custom app "${this.appDefinition.name}" has a value (${val}) less than ${this.appDefinition.thresholdLtValue} - overriding values`,
                    );

                    if (this.appDefinition.thresholdLtIcon) {
                        moreOptions.icon = this.appDefinition.thresholdLtIcon;
                    }
                    if (this.appDefinition.thresholdLtTextColor) {
                        moreOptions.color = this.appDefinition.thresholdLtTextColor;
                        moreOptions.rainbow = false; // disable rainbow
                    }
                    if (this.appDefinition.thresholdLtBackgroundColor) {
                        moreOptions.background = this.appDefinition.thresholdLtBackgroundColor;

                        if (this.appDefinition.useBackgroundEffect) {
                            delete moreOptions.effect;
                        }
                    }
                } else if (this.appDefinition.thresholdGtActive && val > this.appDefinition.thresholdGtValue) {
                    this.adapter.log.debug(
                        `[createAppRequestObj] GT > custom app "${this.appDefinition.name}" has a value (${val}) greater than ${this.appDefinition.thresholdGtValue} - overriding values`,
                    );

                    if (this.appDefinition.thresholdGtIcon) {
                        moreOptions.icon = this.appDefinition.thresholdGtIcon;
                    }
                    if (this.appDefinition.thresholdGtTextColor) {
                        moreOptions.color = this.appDefinition.thresholdGtTextColor;
                        moreOptions.rainbow = false; // disable rainbow
                    }
                    if (this.appDefinition.thresholdGtBackgroundColor) {
                        moreOptions.background = this.appDefinition.thresholdGtBackgroundColor;

                        if (this.appDefinition.useBackgroundEffect) {
                            delete moreOptions.effect;
                        }
                    }
                }
            }

            return {
                text,
                textCase: 2, // show as sent
                pos: this.appDefinition.position,
                ...moreOptions,
            };
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
                                    const oldVal = typeof val !== 'number' ? parseFloat(val as string) : val;
                                    const decimals = typeof this.appDefinition.decimals === 'string' ? parseInt(this.appDefinition.decimals) : this.appDefinition.decimals ?? 3;

                                    if (!isNaN(oldVal) && oldVal % 1 !== 0) {
                                        let countDecimals = String(val).split('.')[1].length || 2;

                                        if (countDecimals > decimals) {
                                            countDecimals = decimals; // limit
                                        }

                                        const numFormat = this.adapter.config.numberFormat;
                                        if (numFormat === 'system') {
                                            newVal = this.adapter.formatValue(oldVal, countDecimals);
                                        } else if (['.,', ',.'].includes(numFormat)) {
                                            newVal = this.adapter.formatValue(oldVal, countDecimals, numFormat);
                                        } else if (numFormat === '.') {
                                            newVal = oldVal.toFixed(countDecimals);
                                        } else if (numFormat === ',') {
                                            newVal = oldVal.toFixed(countDecimals).replace('.', ',');
                                        }

                                        this.adapter.log.debug(
                                            `[refreshCustomApp] formatted value of objId "${this.appDefinition.objId}" from ${oldVal} to ${newVal} (${countDecimals} decimals) with "${numFormat}"`,
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

                            if (this.objCache.ts + this.adapter.config.ignoreNewValueForAppInTimeRange * 1000 < state.ts) {
                                this.objCache.val = this.objCache.type === 'mixed' ? String(state.val) : state.val;
                                this.objCache.ts = state.ts;

                                this.refresh();
                            } else {
                                this.adapter.log.debug(
                                    `[onStateChange] "${this.appDefinition.name}" ignoring customApps state change of objId "${id}" to ${state.val} - refreshes too fast (within ${
                                        this.adapter.config.ignoreNewValueForAppInTimeRange
                                    } seconds) - Last update: ${this.adapter.formatDate(this.objCache.ts, 'YYYY-MM-DD hh:mm:ss.sss')}`,
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
    }
}

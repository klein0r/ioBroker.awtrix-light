import { AwtrixLight } from '../../main';
import { HistoryApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export class History extends AbstractAppType.AbstractApp {
        private appDefinition: HistoryApp;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: HistoryApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
        }

        public override async init(): Promise<void> {
            let isValidSourceInstance = false;

            if (this.appDefinition.sourceInstance) {
                const sourceInstanceObj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.appDefinition.sourceInstance}`);

                if (sourceInstanceObj && sourceInstanceObj.common?.getHistory) {
                    const sourceInstanceAliveState = await this.adapter.getForeignStateAsync(`system.adapter.${this.appDefinition.sourceInstance}.alive`);

                    if (sourceInstanceAliveState && sourceInstanceAliveState.val) {
                        this.adapter.log.debug(`[initHistoryApp] Found valid source instance for history data: ${this.appDefinition.sourceInstance}`);

                        isValidSourceInstance = true;
                    } else {
                        this.adapter.log.warn(`[initHistoryApp] Unable to get history data of "${this.appDefinition.sourceInstance}": instance not running (stopped)`);
                    }
                } else {
                    this.adapter.log.warn(`[initHistoryApp] Unable to get history data of "${this.appDefinition.sourceInstance}": no valid source for getHistory()`);
                }
            }

            if (this.appDefinition.objId) {
                this.adapter.log.debug(`[initHistoryApp] getting history data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}" from ${this.appDefinition.sourceInstance}`);

                try {
                    const appVisibleState = await this.adapter.getStateAsync(`apps.${this.appDefinition.name}.visible`);
                    const appVisible = appVisibleState ? appVisibleState.val : true;

                    // Ack if changed while instance was stopped
                    if (appVisibleState && !appVisibleState?.ack) {
                        await this.adapter.setStateAsync(`apps.${this.appDefinition.name}.visible`, { val: appVisible, ack: true, c: 'initHistoryApp' });
                    }

                    if (!appVisible) {
                        this.adapter.log.debug(`[initHistoryApp] Going to remove app "${this.appDefinition.name}" (was hidden by state: apps.${this.appDefinition.name}.visible)`);

                        await this.apiClient!.removeAppAsync(this.appDefinition.name).catch((error) => {
                            this.adapter.log.warn(`[initHistoryApp] Unable to remove app "${this.appDefinition.name}" (hidden by state): ${error}`);
                        });
                    } else if (isValidSourceInstance) {
                        const sourceObj = await this.adapter.getForeignObjectAsync(this.appDefinition.objId);

                        if (sourceObj && Object.prototype.hasOwnProperty.call(sourceObj?.common?.custom ?? {}, this.appDefinition.sourceInstance)) {
                            const itemCount = this.appDefinition.icon ? 11 : 16; // Can display 11 values with icon or 16 values without icon

                            const historyData = await this.adapter.sendToAsync(this.appDefinition.sourceInstance, 'getHistory', {
                                id: this.appDefinition.objId,
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
                            const lineData = (historyData as any)?.result
                                .filter((state: ioBroker.State) => typeof state.val === 'number' && state.ack)
                                .map((state: ioBroker.State) => Math.round(state.val as number))
                                .slice(itemCount * -1);

                            this.adapter.log.debug(
                                `[initHistoryApp] Data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(lineData)}`,
                            );

                            if (lineData.length > 0) {
                                const moreOptions: AwtrixApi.App = {};

                                // Duration
                                if (this.appDefinition.duration > 0) {
                                    moreOptions.duration = this.appDefinition.duration;
                                }

                                // Repeat
                                if (this.appDefinition.repeat > 0) {
                                    moreOptions.repeat = this.appDefinition.repeat;
                                }

                                await this.apiClient!.appRequestAsync(this.appDefinition.name, {
                                    color: this.appDefinition.lineColor || '#FF0000',
                                    background: this.appDefinition.backgroundColor || '#000000',
                                    line: lineData,
                                    autoscale: true,
                                    icon: this.appDefinition.icon,
                                    lifetime: this.adapter.config.historyAppsRefreshInterval + 60, // Remove app if there is no update in configured interval (+ buffer)
                                    pos: this.appDefinition.position,
                                    ...moreOptions,
                                }).catch((error) => {
                                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}": ${error}`);
                                });
                            } else {
                                this.adapter.log.debug(`[initHistoryApp] Going to remove app "${this.appDefinition.name}" (no history data)`);

                                await this.apiClient!.removeAppAsync(this.appDefinition.name).catch((error) => {
                                    this.adapter.log.warn(`Unable to remove app "${this.appDefinition.name}" (no history data): ${error}`);
                                });
                            }
                        } else {
                            this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": logging is not configured for this object`);
                        }
                    } else {
                        this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": source invalid or unavailable`);
                    }
                } catch (error) {
                    this.adapter.log.error(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": ${error}`);
                }
            }

            super.init();
        }
    }
}

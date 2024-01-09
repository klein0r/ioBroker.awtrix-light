import { AwtrixLight } from '../../main';
import { HistoryApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export type HistoryOptions = {
        start: number;
        end: number;
        limit: number;
        aggregate?: 'none' | 'average' | 'min' | 'max' | 'count';
        returnNewestEntries: boolean;
        ignoreNull: number;
        removeBorderValues: boolean;
        ack: boolean;
    };

    export class History extends AbstractAppType.AbstractApp {
        private appDefinition: HistoryApp;
        private isValidSourceInstance: boolean;
        private isValidObjId: boolean;
        private refreshTimeout: void | NodeJS.Timeout | null;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: HistoryApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.isValidSourceInstance = false;
            this.isValidObjId = false;
            this.refreshTimeout = null;
        }

        public override async init(): Promise<boolean> {
            if (this.appDefinition.sourceInstance) {
                const sourceInstanceObj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.appDefinition.sourceInstance}`);

                if (sourceInstanceObj && sourceInstanceObj.common?.getHistory) {
                    const sourceInstanceAliveState = await this.adapter.getForeignStateAsync(`system.adapter.${this.appDefinition.sourceInstance}.alive`);

                    if (sourceInstanceAliveState && sourceInstanceAliveState.val) {
                        this.adapter.log.debug(`[initHistoryApp] Found valid source instance for history data: ${this.appDefinition.sourceInstance}`);

                        this.isValidSourceInstance = true;
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
                    if (this.isValidSourceInstance) {
                        const sourceObj = await this.adapter.getForeignObjectAsync(this.appDefinition.objId);

                        if (sourceObj && Object.prototype.hasOwnProperty.call(sourceObj?.common?.custom ?? {}, this.appDefinition.sourceInstance)) {
                            this.isValidObjId = true;
                        } else {
                            this.adapter.log.info(
                                `[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": logging is not configured for this object`,
                            );
                        }
                    } else {
                        this.adapter.log.info(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": source invalid or unavailable`);
                    }
                } catch (error) {
                    this.adapter.log.error(`[initHistoryApp] Unable to get data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}": ${error}`);
                }
            }

            return super.init();
        }

        public override async refresh(): Promise<boolean> {
            let refreshed = false;

            if ((await super.refresh()) && this.isValidSourceInstance && this.isValidObjId) {
                const itemCount = this.appDefinition.icon ? 11 : 16; // can display 11 values with icon or 16 values without icon

                const options: HistoryOptions = {
                    start: 1,
                    end: Date.now(),
                    limit: itemCount,
                    returnNewestEntries: true,
                    ignoreNull: 0,
                    removeBorderValues: true,
                    ack: true,
                };

                if (this.appDefinition.mode == 'aggregate') {
                    options.aggregate = this.appDefinition.aggregation;
                } else {
                    // mode = last
                    options.aggregate = 'none';
                }

                const historyData = await this.adapter.sendToAsync(this.appDefinition.sourceInstance, 'getHistory', {
                    id: this.appDefinition.objId,
                    options,
                });
                const graphData = (historyData as any)?.result
                    .filter((state: ioBroker.State) => typeof state.val === 'number' && state.ack)
                    .map((state: ioBroker.State) => Math.round(state.val as number))
                    .slice(itemCount * -1);

                this.adapter.log.debug(
                    `[refreshHistoryApp] Data for app "${this.appDefinition.name}" of "${this.appDefinition.objId}: ${JSON.stringify(historyData)} - filtered: ${JSON.stringify(graphData)}`,
                );

                if (graphData.length > 0) {
                    const moreOptions: AwtrixApi.App = {};

                    // Duration
                    if (this.appDefinition.duration > 0) {
                        moreOptions.duration = this.appDefinition.duration;
                    }

                    // Repeat
                    if (this.appDefinition.repeat > 0) {
                        moreOptions.repeat = this.appDefinition.repeat;
                    }

                    // Bar or line graph
                    if (this.appDefinition.display == 'bar') {
                        moreOptions.bar = graphData;
                    } else {
                        moreOptions.line = graphData;
                    }

                    await this.apiClient!.appRequestAsync(this.appDefinition.name, {
                        color: this.appDefinition.lineColor || '#FF0000',
                        background: this.appDefinition.backgroundColor || '#000000',
                        autoscale: true,
                        icon: this.appDefinition.icon,
                        lifetime: this.adapter.config.historyAppsRefreshInterval + 60, // Remove app if there is no update in configured interval (+ buffer)
                        pos: this.appDefinition.position,
                        ...moreOptions,
                    }).catch((error) => {
                        this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to create app "${this.appDefinition.name}": ${error}`);
                    });

                    refreshed = true;
                } else {
                    this.adapter.log.debug(`[refreshHistoryApp] Going to remove app "${this.appDefinition.name}" (no history data)`);

                    await this.apiClient!.removeAppAsync(this.appDefinition.name).catch((error) => {
                        this.adapter.log.warn(`[refreshHistoryApp] Unable to remove app "${this.appDefinition.name}" (no history data): ${error}`);
                    });
                }
            }

            this.adapter.log.debug(`re-creating history apps timeout (${this.adapter.config.historyAppsRefreshInterval ?? 300} seconds)`);
            this.refreshTimeout =
                this.refreshTimeout ||
                this.adapter.setTimeout(
                    () => {
                        this.refreshTimeout = null;
                        this.refresh();
                    },
                    this.adapter.config.historyAppsRefreshInterval * 1000 || 5 * 60 * 1000,
                );

            return refreshed;
        }

        public override async unloadAsync(): Promise<void> {
            if (this.refreshTimeout) {
                this.adapter.log.debug(`clearing history app timeout for "${this.getName()}"`);
                this.adapter.clearTimeout(this.refreshTimeout);
            }

            await super.unloadAsync();
        }
    }
}

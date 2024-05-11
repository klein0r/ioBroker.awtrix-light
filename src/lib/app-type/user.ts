import { AwtrixLight } from '../../main';
import { DefaultApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export abstract class UserApp extends AbstractAppType.AbstractApp {
        private definition: DefaultApp;

        protected ignoreNewValueForAppInTimeRange: number;
        protected isVisible: boolean;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: DefaultApp) {
            super(apiClient, adapter, definition.name);

            this.definition = definition;
            this.ignoreNewValueForAppInTimeRange = adapter.config.ignoreNewValueForAppInTimeRange;
            this.isVisible = false;
        }

        public async init(): Promise<boolean> {
            const appName = this.getName();
            const appVisibleState = await this.adapter.getForeignStateAsync(`${this.objPrefix}.apps.${appName}.visible`);
            this.isVisible = appVisibleState ? !!appVisibleState.val : true;

            // Ack if changed while instance was stopped
            if (appVisibleState && !appVisibleState?.ack) {
                await this.adapter.setStateAsync(`apps.${appName}.visible`, { val: this.isVisible, ack: true, c: 'init' });
            }

            return this.isVisible;
        }

        public async refresh(): Promise<boolean> {
            if (!this.isVisible && this.apiClient.isConnected()) {
                // Hide app automatically
                const appName = this.getName();
                this.apiClient.removeAppAsync(appName).catch((error) => {
                    this.adapter.log.warn(`[refreshApp] Unable to remove hidden app "${appName}": ${error}`);
                });
            }

            return this.isVisible && this.apiClient.isConnected();
        }

        public async createObjects(): Promise<void> {
            await super.createObjects();

            const appName = this.getName();

            await this.adapter.extendObjectAsync(`apps.${appName}.visible`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Visible',
                        de: 'Sichtbar',
                        ru: 'Видимый',
                        pt: 'Visível',
                        nl: 'Vertaling',
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
                    write: this.isMainInstance(),
                    def: true,
                },
                native: {},
            });

            if (!this.isMainInstance()) {
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.visible`);
            }
        }

        public async unloadAsync(): Promise<void> {
            if (this.adapter.config.removeAppsOnStop) {
                this.adapter.log.info(`[onUnload] Deleting app on awtrix light with name "${this.definition.name}"`);

                try {
                    await this.apiClient.removeAppAsync(this.definition.name).catch((error) => {
                        this.adapter.log.warn(`Unable to remove unknown app "${this.definition.name}": ${error}`);
                    });
                } catch (error) {
                    this.adapter.log.error(`[onUnload] Unable to delete app ${this.definition.name}: ${error}`);
                }
            }
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            // Handle all states for user apps
            if (id && state && !state.ack) {
                const appName = this.getName();
                const idOwnNamespace = this.getObjIdOwnNamespace(id);

                if (id === `${this.objPrefix}.apps.${appName}.visible`) {
                    if (state.val !== this.isVisible) {
                        this.adapter.log.debug(`[onStateChange] ${appName}: Visibility of app ${appName} changed to ${state.val}`);

                        this.isVisible = !!state.val;

                        await this.refresh();
                        await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix}` });
                    } else {
                        this.adapter.log.debug(`[onStateChange] ${appName}: Visibility of app "${appName}" IGNORED (not changed): ${state.val}`);

                        await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix} (unchanged)` });
                    }
                }
            }
        }
    }
}

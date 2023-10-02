import { AwtrixLight } from '../../main';
import { DefaultApp } from '../adapter-config';
import { AwtrixApi } from '../api';

export namespace AppType {
    export abstract class AbstractApp {
        private definition: DefaultApp;

        protected apiClient: AwtrixApi.Client;
        protected adapter: AwtrixLight;
        protected isVisible: boolean;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: DefaultApp) {
            this.apiClient = apiClient;
            this.adapter = adapter;
            this.definition = definition;
            this.isVisible = false;

            adapter.on('stateChange', this.onStateChange.bind(this));
            adapter.on('objectChange', this.onObjectChange.bind(this));
        }

        public getName(): string {
            return this.definition.name;
        }

        public async init(): Promise<boolean> {
            const appName = this.getName();
            const appVisibleState = await this.adapter.getStateAsync(`apps.${appName}.visible`);
            this.isVisible = appVisibleState ? !!appVisibleState.val : true;

            // Ack if changed while instance was stopped
            if (appVisibleState && !appVisibleState?.ack) {
                await this.adapter.setStateAsync(`apps.${appName}.visible`, { val: this.isVisible, ack: true, c: 'initCustomApp' });
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
            const appName = this.getName();

            await this.adapter.setObjectNotExistsAsync(`apps.${appName}.visible`, {
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
                        //uk: 'Вибрані',
                        'zh-cn': '不可抗辩',
                    },
                    type: 'boolean',
                    role: 'switch.enable',
                    read: true,
                    write: true,
                    def: true,
                },
                native: {},
            });
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

        private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            const idNoNamespace = this.adapter.removeNamespace(id);
            const appName = this.getName();

            // Handle default states for all apps
            if (id && state && !state.ack) {
                if (idNoNamespace == `apps.${appName}.visible`) {
                    if (state.val !== this.isVisible) {
                        this.adapter.log.debug(`[onStateChange] changed visibility of app ${appName} to ${state.val}`);

                        this.isVisible = !!state.val;
                        this.refresh();
                    } else {
                        this.adapter.log.debug(`[onStateChange] visibility of app ${appName} was already ${state.val} - ignoring`);
                    }

                    await this.adapter.setStateAsync(idNoNamespace, { val: state.val, ack: true, c: 'onStateChange' });
                }
            }

            await this.stateChanged(id, state);
        }

        /* eslint-disable @typescript-eslint/no-unused-vars */
        protected async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            // override
        }

        private async onObjectChange(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
            await this.objectChanged(id, obj);
        }

        /* eslint-disable @typescript-eslint/no-unused-vars */
        protected async objectChanged(id: string, obj: ioBroker.Object | null | undefined): Promise<void> {
            // override
        }
    }
}

import { AwtrixLight } from '../../main';
import { AwtrixApi } from '../api';

export namespace AppType {
    export abstract class AbstractApp {
        private name: string;

        protected apiClient: AwtrixApi.Client;
        protected adapter: AwtrixLight;

        protected objPrefix: string;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, name: string) {
            this.name = name;

            this.apiClient = apiClient;
            this.adapter = adapter;

            if (this.adapter.isMainInstance()) {
                this.objPrefix = this.adapter.namespace;
            } else {
                this.objPrefix = this.adapter.config.foreignSettingsInstance;
            }

            adapter.on('stateChange', this.onStateChange.bind(this));
            adapter.on('objectChange', this.onObjectChange.bind(this));
        }

        public abstract getDescription(): string;

        public getName(): string {
            return this.name;
        }

        public isMainInstance(): boolean {
            return this.adapter.isMainInstance();
        }

        protected getObjIdOwnNamespace(id: string): string {
            return this.adapter.removeNamespace(this.isMainInstance() ? id : id.replace(this.objPrefix, this.adapter.namespace));
        }

        private hasOwnActivateState(): boolean {
            return this.isMainInstance() || !this.adapter.config.foreignSettingsInstanceActivateApps;
        }

        public async createObjects(): Promise<void> {
            const appName = this.getName();

            this.adapter.log.debug(`[createObjects] Creating objects for app "${appName}" (${this.isMainInstance() ? 'main' : this.objPrefix})`);

            if (this.hasOwnActivateState()) {
                await this.adapter.extendObjectAsync(`apps.${appName}.activate`, {
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
                            uk: 'Активувати',
                            'zh-cn': '启用',
                        },
                        type: 'boolean',
                        role: 'button',
                        read: false,
                        write: true,
                    },
                    native: {},
                });
            } else {
                await this.adapter.delObjectAsync(`apps.${appName}.activate`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.activate`);
            }
        }

        private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            if (id) {
                this.adapter.log.debug(`[onStateChange] State change "${id}": ${JSON.stringify(state)}`);
            }

            // Handle default states for all apps
            if (id && state && !state.ack) {
                const appName = this.getName();

                // activate app
                if (id === `${this.hasOwnActivateState() ? this.adapter.namespace : this.objPrefix}.apps.${appName}.activate`) {
                    if (state.val) {
                        this.apiClient!.requestAsync('switch', 'POST', { name: appName }).catch((error) => {
                            this.adapter.log.warn(`[onStateChange] (switch) Unable to execute action: ${error}`);
                        });
                    } else {
                        this.adapter.log.warn(`[onStateChange] Received invalid value for state ${id}`);
                    }
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

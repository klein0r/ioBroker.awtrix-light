import { AwtrixLight } from '../../main';
import { ExpertApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export class Expert extends AbstractAppType.AbstractApp {
        private appDefinition: ExpertApp;
        private appStates: { [key: string]: ioBroker.StateValue };

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: ExpertApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.appStates = {};
        }

        public override async init(): Promise<boolean> {
            const appName = this.getName();

            const appObjects = await this.adapter.getObjectViewAsync('system', 'state', {
                startkey: `${this.adapter.namespace}.apps.${appName}.`,
                endkey: `${this.adapter.namespace}.apps.${appName}.\u9999`,
            });

            // Find all available settings objects with settingsKey
            for (const appObj of appObjects.rows) {
                if (appObj.value?.native?.attribute) {
                    const appState = await this.adapter.getStateAsync(appObj.id);
                    if (appState) {
                        this.appStates[appObj.value.native.attribute] = appState.val;
                    }
                }
            }

            this.adapter.log.debug(`[initExpertApp] current states of app "${appName}": ${JSON.stringify(this.appStates)}`);

            return super.init();
        }

        public override async refresh(): Promise<boolean> {
            let refreshed = false;

            if (await super.refresh()) {
                await this.apiClient!.appRequestAsync(this.appDefinition.name, {
                    text: typeof this.appStates.text === 'string' ? this.appStates.text : '',
                    icon: typeof this.appStates.icon === 'string' ? this.appStates.icon : '',
                    duration: typeof this.appStates.duration === 'number' ? this.appStates.duration : 0,
                }).catch((error) => {
                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                });

                refreshed = true;
            }

            return refreshed;
        }

        public async createObjects(prefix: string): Promise<void> {
            const appName = this.getName();

            await this.adapter.setObjectNotExistsAsync(`${prefix}.${appName}.text`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Text',
                        de: 'Text',
                        ru: 'Текст',
                        pt: 'Texto',
                        nl: 'Text',
                        fr: 'Texte',
                        it: 'Testo',
                        es: 'Texto',
                        pl: 'Tekst',
                        //uk: 'Головна',
                        'zh-cn': '案文',
                    },
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: true,
                    def: '',
                },
                native: {
                    attribute: 'text',
                },
            });

            await this.adapter.setObjectNotExistsAsync(`${prefix}.${appName}.icon`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Icon',
                        de: 'Symbol',
                        ru: 'Имя',
                        pt: 'Ícone',
                        nl: 'Icoon',
                        fr: 'Icône',
                        it: 'Icona',
                        es: 'Icono',
                        pl: 'Ikona',
                        //uk: 'значок',
                        'zh-cn': '图标'
                      },
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: true,
                    def: '',
                },
                native: {
                    attribute: 'icon',
                },
            });

            await this.adapter.setObjectNotExistsAsync(`${prefix}.${appName}.duration`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Icon',
                        de: 'Symbol',
                        ru: 'Имя',
                        pt: 'Ícone',
                        nl: 'Icoon',
                        fr: 'Icône',
                        it: 'Icona',
                        es: 'Icono',
                        pl: 'Ikona',
                        //uk: 'значок',
                        'zh-cn': '图标'
                      },
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: true,
                    def: 0,
                },
                native: {
                    attribute: 'duration',
                },
            });
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            const idNoNamespace = this.adapter.removeNamespace(id);
            const appName = this.getName();

            // Handle default states for all apps
            if (id && state && !state.ack) {
                if (idNoNamespace.startsWith(`apps.${appName}.`)) {
                    const obj = await this.adapter.getObjectAsync(idNoNamespace);

                    if (obj && obj?.native?.attribute) {
                        this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}": "${state.val}" (${obj?.native?.attribute})`);

                        this.appStates[obj.native.attribute as string] = state.val;

                        if (await this.refresh()) {
                            await this.adapter.setStateAsync(idNoNamespace, { val: state.val, ack: true });
                        }
                    }
                }
            }
        }
    }
}

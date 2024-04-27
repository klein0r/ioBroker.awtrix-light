import { AwtrixLight } from '../../main';
import { ExpertApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export class Expert extends AbstractAppType.AbstractApp {
        private appDefinition: ExpertApp;
        private appStates: { [key: string]: ioBroker.StateValue };
        private refreshTimeout: ioBroker.Timeout | undefined;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: ExpertApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.appStates = {};
            this.refreshTimeout = undefined;
        }

        public override async init(): Promise<boolean> {
            const appName = this.getName();

            const appObjects = await this.adapter.getObjectViewAsync('system', 'state', {
                startkey: `${this.objPrefix}.apps.${appName}.`,
                endkey: `${this.objPrefix}.apps.${appName}.\u9999`,
            });

            // Find all available settings objects with settingsKey
            for (const appObj of appObjects.rows) {
                if (appObj.value?.native?.attribute) {
                    const appState = await this.adapter.getForeignStateAsync(appObj.id);
                    if (appState) {
                        this.appStates[appObj.value.native.attribute] = appState.val;

                        // Copy values of main instance
                        if (!this.isMainInstance()) {
                            const idOwnNamespace = this.getObjIdOwnNamespace(appObj.id);
                            await this.adapter.setStateAsync(idOwnNamespace, { val: appState.val, ack: true, c: 'init' });
                        }
                    }
                }
            }

            this.adapter.log.debug(`[initExpertApp] current states of app "${appName}": ${JSON.stringify(this.appStates)}`);

            return super.init();
        }

        public override async refresh(): Promise<boolean> {
            let refreshed = false;

            if (await super.refresh()) {
                this.adapter.log.debug(`[refresh] Refreshing app with values "${this.appDefinition.name}": ${JSON.stringify(this.appStates)}`);

                await this.apiClient!.appRequestAsync(this.appDefinition.name, {
                    text: typeof this.appStates.text === 'string' ? this.appStates.text : '',
                    color: typeof this.appStates.color === 'string' ? this.appStates.color : '#FFFFFF',
                    background: typeof this.appStates.background === 'string' ? this.appStates.background : '#000000',
                    icon: typeof this.appStates.icon === 'string' ? this.appStates.icon : '',
                    duration: typeof this.appStates.duration === 'number' ? this.appStates.duration : 0,
                }).catch((error) => {
                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                });

                refreshed = true;
            }

            return refreshed;
        }

        public async createObjects(): Promise<void> {
            const appName = this.getName();

            await this.adapter.extendObjectAsync(`apps.${appName}.text`, {
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
                        uk: 'Головна',
                        'zh-cn': '案文',
                    },
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: this.isMainInstance(),
                    def: '',
                },
                native: {
                    attribute: 'text',
                },
            });

            await this.adapter.extendObjectAsync(`apps.${appName}.textColor`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Text color',
                        de: 'Textfarbe',
                        ru: 'Текстовый цвет',
                        pt: 'Cor do texto',
                        nl: 'Tekstkleur',
                        fr: 'Couleur du texte',
                        it: 'Colore del testo',
                        es: 'Color de texto',
                        pl: 'Kolor tekstu',
                        uk: 'Колір тексту',
                        'zh-cn': '文本颜色',
                    },
                    type: 'string',
                    role: 'level.color.rgb',
                    read: true,
                    write: this.isMainInstance(),
                    def: '#FFFFFF',
                },
                native: {
                    attribute: 'color',
                },
            });

            await this.adapter.extendObjectAsync(`apps.${appName}.backgroundColor`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Background color',
                        de: 'Hintergrundfarbe',
                        ru: 'Фоновый цвет',
                        pt: 'Cor de fundo',
                        nl: 'Achtergrondkleur',
                        fr: 'Couleur de fond',
                        it: 'Colore dello sfondo',
                        es: 'Color de fondo',
                        pl: 'Kolor tła',
                        uk: 'Колір фону',
                        'zh-cn': '背景颜色',
                    },
                    type: 'string',
                    role: 'level.color.rgb',
                    read: true,
                    write: this.isMainInstance(),
                    def: '#000000',
                },
                native: {
                    attribute: 'background',
                },
            });

            await this.adapter.extendObjectAsync(`apps.${appName}.icon`, {
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
                        uk: 'значок',
                        'zh-cn': '图标',
                    },
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: this.isMainInstance(),
                    def: '',
                },
                native: {
                    attribute: 'icon',
                },
            });

            await this.adapter.extendObjectAsync(`apps.${appName}.duration`, {
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
                        uk: 'значок',
                        'zh-cn': '图标',
                    },
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: this.isMainInstance(),
                    def: 0,
                },
                native: {
                    attribute: 'duration',
                },
            });

            if (!this.isMainInstance()) {
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.text`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.textColor`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.backgroundColor`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.icon`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.duration`);
            }

            return super.createObjects();
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            // Handle default states for all apps
            if (id && state && !state.ack) {
                const appName = this.getName();
                const idOwnNamespace = this.getObjIdOwnNamespace(id);

                if (id.startsWith(`${this.objPrefix}.apps.${appName}.`)) {
                    const obj = await this.adapter.getForeignObjectAsync(id);

                    if (obj && obj?.native?.attribute) {
                        const attr = obj.native.attribute as string;

                        if (this.appStates[attr] !== state.val) {
                            this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}": "${state.val}" (${obj?.native?.attribute})`);

                            this.appStates[attr] = state.val;

                            if (!this.refreshTimeout) {
                                this.refreshTimeout = this.adapter.setTimeout(async () => {
                                    this.refreshTimeout = undefined;

                                    await this.refresh();
                                }, 100);
                            }

                            await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: 'onStateChange' });
                        } else {
                            this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}" IGNORED (not changed): "${state.val}" (${obj?.native?.attribute})`);

                            await this.adapter.setStateAsync(idOwnNamespace, { val: state.val, ack: true, c: 'onStateChange (unchanged)' });
                        }
                    }
                }
            }
        }
    }
}

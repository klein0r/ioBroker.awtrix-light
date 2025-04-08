import { AwtrixLight } from '../../../main';
import { ExpertApp } from '../../adapter-config';
import { AwtrixApi } from '../../api';
import { AppType as UserAppType } from '../user';

export namespace AppType {
    export class Expert extends UserAppType.UserApp {
        private appDefinition: ExpertApp;
        private appStates: { [key: string]: ioBroker.StateValue };
        private refreshTimeout: ioBroker.Timeout | undefined;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: ExpertApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
            this.appStates = {};
            this.refreshTimeout = undefined;
        }

        public override getDescription(): string {
            return 'expert';
        }

        public override getIconForObjectTree(): string {
            return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBGcmVlIDYuNy4yIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlL2ZyZWUgQ29weXJpZ2h0IDIwMjUgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTk2IDEyOGExMjggMTI4IDAgMSAxIDI1NiAwQTEyOCAxMjggMCAxIDEgOTYgMTI4ek0wIDQ4Mi4zQzAgMzgzLjggNzkuOCAzMDQgMTc4LjMgMzA0bDkxLjQgMEMzNjguMiAzMDQgNDQ4IDM4My44IDQ0OCA0ODIuM2MwIDE2LjQtMTMuMyAyOS43LTI5LjcgMjkuN0wyOS43IDUxMkMxMy4zIDUxMiAwIDQ5OC43IDAgNDgyLjN6TTUwNCAzMTJsMC02NC02NCAwYy0xMy4zIDAtMjQtMTAuNy0yNC0yNHMxMC43LTI0IDI0LTI0bDY0IDAgMC02NGMwLTEzLjMgMTAuNy0yNCAyNC0yNHMyNCAxMC43IDI0IDI0bDAgNjQgNjQgMGMxMy4zIDAgMjQgMTAuNyAyNCAyNHMtMTAuNyAyNC0yNCAyNGwtNjQgMCAwIDY0YzAgMTMuMy0xMC43IDI0LTI0IDI0cy0yNC0xMC43LTI0LTI0eiIvPjwvc3ZnPg==';
        }

        public override async init(): Promise<boolean> {
            const appName = this.getName();

            const appObjects = await this.adapter.getObjectViewAsync('system', 'state', {
                startkey: `${this.objPrefix}.apps.${appName}.`,
                endkey: `${this.objPrefix}.apps.${appName}.\u9999`,
            });

            // Find all available settings objects with settingsKey
            for (const appObj of appObjects.rows) {
                if (appObj.value.type === 'state' && appObj.value?.native?.attribute) {
                    const appState = await this.adapter.getForeignStateAsync(appObj.id);
                    if (appState) {
                        this.appStates[appObj.value.native.attribute] = appState.val;

                        // Copy values of main instance
                        if (!this.isMainInstance()) {
                            const idOwnNamespace = this.getObjIdOwnNamespace(appObj.id);
                            await this.adapter.setState(idOwnNamespace, { val: appState.val, ack: true, c: 'init' });
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

                const app: AwtrixApi.App = {
                    text: typeof this.appStates.text === 'string' ? this.appStates.text : '',
                    textCase: 2, // show as sent
                    color: typeof this.appStates.color === 'string' ? this.appStates.color : '#FFFFFF',
                    background: typeof this.appStates.background === 'string' ? this.appStates.background : '#000000',
                    icon: typeof this.appStates.icon === 'string' ? this.appStates.icon : '',
                    duration: typeof this.appStates.duration === 'number' ? this.appStates.duration : 0,
                    scrollSpeed: typeof this.appStates.scrollSpeed === 'number' ? this.appStates.scrollSpeed : 100,
                    pos: this.appDefinition.position,
                };

                if (this.appStates.progress && typeof this.appStates.progress === 'number') {
                    if (this.appStates.progress >= 0 && this.appStates.progress <= 100) {
                        app.progress = this.appStates.progress;

                        // colors
                        app.progressC = typeof this.appStates.progressC === 'string' ? this.appStates.progressC : '#00FF00';
                        app.progressBC = typeof this.appStates.progressBC === 'string' ? this.appStates.progressBC : '#FFFFFF';
                    }
                }

                await this.apiClient!.appRequestAsync(this.appDefinition.name, app).catch((error) => {
                    this.adapter.log.warn(`(custom?name=${this.appDefinition.name}) Unable to update custom app "${this.appDefinition.name}": ${error}`);
                });

                refreshed = true;
            }

            return refreshed;
        }

        public async createObjects(): Promise<void> {
            await super.createObjects();

            const appName = this.getName();

            await this.adapter.extendObject(`apps.${appName}.text`, {
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

            await this.adapter.extendObject(`apps.${appName}.textColor`, {
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

            await this.adapter.extendObject(`apps.${appName}.backgroundColor`, {
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

            await this.adapter.extendObject(`apps.${appName}.icon`, {
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

            await this.adapter.extendObject(`apps.${appName}.duration`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Duration',
                        de: 'Dauer',
                        ru: 'Продолжительность',
                        pt: 'Duração',
                        nl: 'Duur',
                        fr: 'Durée',
                        it: 'Durata',
                        es: 'Duración',
                        pl: 'Czas trwania',
                        uk: 'Тривалість',
                        'zh-cn': '会期',
                    },
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: this.isMainInstance(),
                    def: 0,
                    unit: 'sec',
                },
                native: {
                    attribute: 'duration',
                },
            });

            await this.adapter.extendObject(`apps.${appName}.scrollSpeed`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Scroll speed',
                        de: 'Scrollgeschwindigkeit',
                        ru: 'Скорость свитка',
                        pt: 'Velocidade de rolagem',
                        nl: 'Schuifsnelheid',
                        fr: 'Vitesse de défilement',
                        it: 'Velocità di scorrimento',
                        es: 'Velocidad de desplazamiento',
                        pl: 'Przewiń prędkość',
                        uk: 'Швидкість прокрутки',
                        'zh-cn': '滚动速度',
                    },
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: this.isMainInstance(),
                    def: 100,
                    unit: '%',
                    min: 0,
                    max: 100,
                },
                native: {
                    attribute: 'scrollSpeed',
                },
            });

            await this.adapter.extendObject(`apps.${appName}.progress`, {
                type: 'folder',
                common: {
                    name: {
                        en: 'Progress bar',
                        de: 'Fortschrittsleiste',
                        ru: 'Прогресс',
                        pt: 'Barra de progresso',
                        nl: 'Voortgangsbalk',
                        fr: 'Barre de progression',
                        it: 'Barra di avanzamento',
                        es: 'Progresos',
                        pl: 'Pasek postępu',
                        uk: 'Прогрес бар',
                        'zh-cn': '进度栏',
                    },
                },
            });

            await this.adapter.extendObject(`apps.${appName}.progress.percent`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Progress',
                        de: 'Fortschritt',
                        ru: 'Прогресс',
                        pt: 'Progressos',
                        nl: 'Voortgang',
                        fr: 'Progrès accomplis',
                        it: 'Progressi',
                        es: 'Progresos',
                        pl: 'Postępy',
                        uk: 'Прогрес',
                        'zh-cn': '进展',
                    },
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: this.isMainInstance(),
                    def: 0,
                    unit: '%',
                    min: 0,
                    max: 100,
                },
                native: {
                    attribute: 'progress',
                },
            });

            await this.adapter.extendObject(`apps.${appName}.progress.color`, {
                type: 'state',
                common: {
                    name: {
                        en: 'Color',
                        de: 'Farbe',
                        ru: 'Цвет',
                        pt: 'Cor',
                        nl: 'Kleur',
                        fr: 'Couleur',
                        it: 'Colore',
                        es: 'Color',
                        pl: 'Kolor',
                        uk: 'Колір',
                        'zh-cn': '颜色',
                    },
                    type: 'string',
                    role: 'level.color.rgb',
                    read: true,
                    write: this.isMainInstance(),
                    def: '#00FF00',
                },
                native: {
                    attribute: 'progressC',
                },
            });

            await this.adapter.extendObject(`apps.${appName}.progress.backgroundColor`, {
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
                    def: '#FFFFFF',
                },
                native: {
                    attribute: 'progressBC',
                },
            });

            if (!this.isMainInstance()) {
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.text`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.textColor`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.backgroundColor`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.icon`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.duration`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.scrollSpeed`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.percent`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.color`);
                await this.adapter.subscribeForeignStatesAsync(`${this.objPrefix}.apps.${appName}.progress.backgroundColor`);
            }
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            await super.stateChanged(id, state);

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

                            await this.adapter.setState(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix}` });
                        } else {
                            this.adapter.log.debug(`[onStateChange] New value for expert app "${appName}" IGNORED (not changed): "${state.val}" (${obj?.native?.attribute})`);

                            await this.adapter.setState(idOwnNamespace, { val: state.val, ack: true, c: `onStateChange ${this.objPrefix} (unchanged)` });
                        }
                    }
                }
            }
        }
    }
}

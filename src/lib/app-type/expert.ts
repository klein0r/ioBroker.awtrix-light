import { AwtrixLight } from '../../main';
import { ExpertApp } from '../adapter-config';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export class Expert extends AbstractAppType.AbstractApp {
        private appDefinition: ExpertApp;

        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, definition: ExpertApp) {
            super(apiClient, adapter, definition);

            this.appDefinition = definition;
        }

        public override async init(): Promise<boolean> {

            return super.init();
        }

        private override async refresh(): Promise<boolean> {
            let refreshed = false;

            if (await super.refresh()) {
                
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
                },
                native: {
                    name: appName,
                },
            });
        }

        protected override async stateChanged(id: string, state: ioBroker.State | null | undefined): Promise<void> {
            const idNoNamespace = this.adapter.removeNamespace(id);
            const appName = this.getName();

            // Handle default states for all apps
            if (id && state && !state.ack) {
                if (idNoNamespace == `apps.${appName}.text`) {
                    if (state.val) {
                        this.adapter.log.debug(`activating app ${appName}`);

                        
                    } else {
                        this.adapter.log.warn(`Received invalid value for state ${idNoNamespace}`);
                    }
                }
            }
        }
    }
}

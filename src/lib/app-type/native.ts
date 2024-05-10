import { AwtrixLight } from '../../main';
import { AwtrixApi } from '../api';
import { AppType as AbstractAppType } from './abstract';

export namespace AppType {
    export class Native extends AbstractAppType.AbstractApp {
        public constructor(apiClient: AwtrixApi.Client, adapter: AwtrixLight, name: string) {
            super(apiClient, adapter, name);
        }

        public override getDescription(): string {
            return 'native';
        }
    }
}

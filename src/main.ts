/*
 * Created with @iobroker/create-adapter v2.5.0
 */

import type * as utils from '@iobroker/adapter-core';
import { AwtrixLight } from './awtrix-light';

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new AwtrixLight(options);
} else {
    // otherwise start the instance directly
    (() => new AwtrixLight())();
}

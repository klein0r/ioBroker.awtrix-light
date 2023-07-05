![Logo](../../admin/awtrix-light.png)

# ioBroker.awtrix-light

## Requirements

- nodejs 14.5 (or later)
- js-controller 4.0.15 (or later)
- Admin Adapter 6.6.0 (or later)
- _Awtrix Light_ device with firmware _0.70_ (or later) - e.g. [Ulanzi TC001](https://haus-auto.com/p/ali/UlanziTC001) (Affiliate-Link)

## Getting started

1. Flash the firmware on your device and add it to your WiFi network - see [documentation](https://blueforcer.github.io/awtrix-light/#/quickstart)
2. Install the awtrix-light adapter in ioBroker (and add a new instance)
3. Open the instance configuration and enter the IP address of the device in your local network

## FAQ

**Can I use the adapter to disable the native apps (like battery state and sensor data)?**

No, this feature has been removed in the awtrix light firmware. Please use the on screen menu to hide these apps.

**Is it possible to display boolean values with other text (not true/false)?**

Just create an alias in `alias.0` of type `string` and convert your `boolean` value into any other text with a read function (like `val ? 'open' : 'closed'`). *This is an ioBroker feature and not related to this adapter.*

**How can I update to the latest firmware version?**

Just use the [onscreen menu](https://blueforcer.github.io/awtrix-light/#/onscreen) and navigate to `update`. No need to use the web flasher again.

**The device is getting hot while charging.**

The hardware design is not the best. Please use a power supply which deliveres max. 1A.

**Is it possible to remove the battery from the device?**

Yes, but you have to open the case with a heat gun (since the front glued to the case) and [modify the PCB with a step down converter](https://github.com/Blueforcer/awtrix-light/issues/67#issuecomment-1595418765).

## Blockly and JavaScript

`sendTo` / message box can be used to

- send one time notifications (with text, sound, duration, ...)
- create a timer
- play a custom sound

### Notifications

Send a "one time" notification to your device:

```javascript
sendTo('awtrix-light', 'notification', { text: 'haus-automatisierung.com', repeat: 1, duration: 5, stack: true, wakeup: true }, (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

The message object supports all available options of the firmware. See [documentation](https://blueforcer.github.io/awtrix-light/#/api?id=json-properties) for details.

*You can also use a Blockly block to send a notification (doesn't provide all available options).*

### Timer

Create a new timer (in 1 hour, 10 minutes and 5 seconds):

```javascript
sendTo('awtrix-light', 'timer', { sound: 'example', seconds: 5, minutes: 10, hours: 1 }, (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

The message object supports all available options of the firmware. See [documentation](https://blueforcer.github.io/awtrix-light/#/api?id=timer) for details.

*You can also use a Blockly block to create a timer.*

### Sounds

To play a (previously created) sound file:

```javascript
sendTo('awtrix-light', 'sound', { sound: 'example' }, (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

The message object supports all available options of the firmware. See [documentation](https://blueforcer.github.io/awtrix-light/#/api?id=play-a-sound) for details.

*You can also use a Blockly block to play a sound.*

## Custom apps

**App names must be lowercase (a-z) and unique. No numbers, no capital letters, no special characters, no whitespaces.**

The following names are used by internal apps and cannot be used: `time`, `eyes`, `date`, `temp`, `hum`, `bat`.

- `%s` is a placeholder for the state value
- `%u` is a placeholder for the unit of the state object (e.g. `°C`)

It is possible to define a custom text with those placeholders (e.g. `Outside: %s %u`).

**Custom apps just display acknowledged values! Control states with `ack: false` are ignored (to prevent duplicate requests and to ensure that values are valid / confirmed)!**

The selected state should have the data type `string` or `number`. Other tyes (like `boolean`) are also supported but raise a warning. It is recommended to use an alias state with a convert function to replace a boolean value with text (e.g. `val ? 'on' : 'off'` or `val ? 'open' : 'closed'`). See ioBroker documentation for details. *This feature is not related to this adapter.*

The following combinations will lead to a warning in the log:

- A custom app with a selected object id of a state, but `%s` is missing in the text
- A custom app with a selected object id of a state without a unit `common.unit`, but `%u` is used in the text
- A custom app without a selected object, but `%s` has been used in the text

## History apps

**App names must be lowercase (a-z) and unique. No numbers, no capital letters, no special characters, no whitespaces.**

The following names are used by internal apps and cannot be used: `time`, `eyes`, `date`, `temp`, `hum`, `bat`.

**History apps just display acknowledged history values! Control states with `ack: false` are ignored!**

## App states

- You can use the state `activate` of each app to bring that app to front
- This state has the role `button` and allows just the value `true` (everything other value will raise a warning)

## Hide custom or history apps

Each custom and history app has a state `apps.<name>.visible`. If this state is set to `false`, the app will be removed from the device and no further updates are pushed. This is useful, if a certain app should only be displayed during day time or in a given time range.

## Hide native apps

If you want to disable/hide a native app (like battery, temperature or humidity): Use the on screen menu on the device! See [documentation](https://blueforcer.github.io/awtrix-light/#/onscreen) for details.

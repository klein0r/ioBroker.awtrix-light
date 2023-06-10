![Logo](../../admin/awtrix-light.png)

# ioBroker.awtrix-light

## Requirements

- nodejs 14.5 (or later)
- js-controller 4.0.15 (or later)
- Admin Adapter 6.0.0 (or later)
- _Awtrix Light_ device with firmware _0.68_ (or later) - e.g. [Ulanzi TC001](https://haus-auto.com/p/ali/UlanziTC001) (Affiliate-Link)

## Getting started

1. Flash the firmware on your device and add it to your WiFi network - see [documentation](https://blueforcer.github.io/awtrix-light/#/quickstart)
2. Install the awtrix-light adapter in ioBroker (and add a new instance)
3. Open the instance configuration and enter the IP address of the device in your local network

## Blockly and JavaScript

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

- `%s` is a placeholder for the state value
- `%u` is a placeholder for the unit of the state object (e.g. `°C`)

**Custom apps just display acknowledged values! Control states are ignored (to prevent duplicate requests and to ensure that values are valid / confirmed)!**

## History apps

**App names must be lowercase (a-z) and unique. No numbers, no capital letters, no special characters, no whitespaces.**

**History apps just display acknowledged history values! Control states are ignored!**

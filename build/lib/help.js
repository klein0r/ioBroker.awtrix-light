"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var help_exports = {};
__export(help_exports, {
  COMMANDS: () => COMMANDS,
  HELP: () => HELP
});
module.exports = __toCommonJS(help_exports);
const COMMANDS = [
  { command: "help", write: false },
  { command: "notification", write: true },
  { command: "sound", write: true },
  { command: "rtttl", write: true },
  { command: "sendNotification", write: true },
  { command: "getBackgroundEffects", write: false }
];
const HELP = `ioBroker.awtrix-light: controls an Awtrix 3 pixel clock (e.g. Ulanzi TC001, 32 x 8 pixels) over HTTP, one instance
per device. The clock shows apps (the values of states) in turn. An agent can show a one-time notification with
text, icon and sound, play a melody, and switch the display, its brightness, the mood light and the three indicator
LEDs by states.

Commands (sendTo awtrix-light.0); answer {error: null, data} (data = the answer of the device, e.g. "OK") or
{error}, e.g. "API is not connected (device offline ?)" while the device is not reachable:
- notification {text, ...options}: shows the text once, then the apps go on. Every option is passed to the firmware
  (/api/notify, see https://blueforcer.github.io/awtrix3/#/api?id=json-properties), the main ones: text, icon (icon
  ID or name of an icon file on the device), color (text color "#RRGGBB"), duration (seconds), repeat (how often
  the text scrolls), hold (true: stays until dismissed with the middle button or the state notification.dismiss),
  stack (false: replaces the current notification at once; default true: queued), wakeup (true: switches the
  display on for it), sound (name of a melody file in MELODIES, without .txt), rtttl (a melody as RTTTL text),
  rainbow, effect (a name of getBackgroundEffects), progress (0-100). Options with null are left out, repeat and
  duration <= 0 too.
- sound {sound}: plays the melody file MELODIES/<sound>.txt of the device (name without .txt).
- rtttl "<RTTTL text>": plays a melody given as RTTTL, e.g. "Beep: d=32,o=7,b=120: a,P,c#". The message is the
  string itself, not an object.
- sendNotification: the notification-manager passes on ioBroker notifications, their messages are shown as a
  notification: {error, sent}.
- getBackgroundEffects {}: the names of the effects [{value, label}], made for the settings.
A message of the wrong type answers {error: "Incomplete message"}, one without message {error: "Invalid message"}.

States (awtrix-light.0.*), written with ack false:
- notification.dismiss (true): removes a notification that is held.
- display.power (true / false), settings.brightness (0-255), settings.brightnessAuto, settings.volume (0-30).
- display.moodlight.active, brightness, color ("#RRGGBB"): the whole matrix as a light.
- indicator.1.* to indicator.3.*: active, color ("#RRGGBB"), blink or fade (interval in ms): the indicator LEDs.
- apps.next, apps.prev (true); apps.<name>.activate (true): shows that app now; apps.<name>.visible (false hides it).
- device.reboot, device.update (true), device.sleep (seconds): only on the user's request.
- read-only: info.connection, sensor.temp, sensor.humidity, sensor.lux, device.battery, display.content.

How to talk to the user:
- Each device is an instance (awtrix-light.0, awtrix-light.1 ...). If there are several and the user names none,
  ask which one; do not guess.
- Show notifications and play sounds only on the user's request; sounds at night (about 22:00 to 07:00) and a high
  volume only when the user asks for it explicitly. Use hold only when the text has to stay.
- Keep texts short: longer texts scroll.
- device.reboot, device.update, device.sleep and the settings change the device: only on the user's request.`;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COMMANDS,
  HELP
});
//# sourceMappingURL=help.js.map

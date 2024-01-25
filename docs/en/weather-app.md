![Logo](../../admin/awtrix-light.png)

# ioBroker.awtrix-light

## Weather App (Expert App)

This script displays the correct icons for the current weather conditions in an expert app. To achieve this, the icons of [ioBroker.openweathermap](https://github.com/ioBroker/ioBroker.openweathermap) are mapped to icons stored on the device.

*Thanks to Andy200877 (ioBroker forums) for the idea.*

### Icons

Load the following icons on your device by using the web interface of the device:

- `11201` (01d clear sky) - Clear sky day
- `52163` (01n clear sky) - Clear sky night
- `22315` (02d few clouds) - Few clouds day
- `26088` (02n few clouds) - Few clouds night
- `22378` (03d scattered clouds) - Scattered clouds day
- `21907` (03n scattered clouds) - Scattered clouds night
- `13852` (04d broken clouds) - Broken clouds day
- `52159` (04n broken clouds) - Broken clouds night
- `43706` (09d shower rain) - Shower rain day
- `43739` (09n shower rain) - Shower rain night
- `22257` (10d rain) - Rain day
- `   72` (10n rain) - Rain night
- `43733` (11d thunderstorm) - Thunderstorm day
- `43748` (11n thunderstorm) - Thunderstorm night
- `43732` (13d snow) - Snow day
- `26090` (13n snow) - Snow night
- `43708` (50d mist) - Mist day
- `43741` (50n mist) - Mist night

### New expert app

Create a new expert app with the name `weather`.

### Script

```javascript
// v0.1
const appName = 'weather';
const objIdIcon = 'openweathermap.0.forecast.current.icon';
const objIdText = 'openweathermap.0.forecast.current.state';

const iconMapping = {
    '01d': '11201', // clear sky day
    '01n': '52163', // clear sky night
    '02d': '22315', // few clouds day
    '02n': '26088', // few clouds night
    '03d': '22378', // scattered clouds day
    '03n': '21907', // scattered clouds night
    '04d': '13852', // broken clouds day
    '04n': '52159', // broken clouds night
    '09d': '43706', // shower rain day
    '09n': '43739', // shower rain night
    '10d': '22257', // rain day
    '10n': '72',    // rain night
    '11d': '43733', // thunderstorm day
    '11n': '43748', // thunderstorm night
    '13d': '43732', // snow day
    '13n': '26090', // snow night
    '50d': '43708', // mist day
    '50n': '43741', // mist night
};

async function refreshExpertApp() {
    try {
        const iconState = await getStateAsync(objIdIcon);
        if (iconState && iconState.val) {
            const icon = /([0-9]{2}[d|n]{1})/.exec(iconState.val)[0];
            if (iconMapping[icon]) {
                await setStateAsync(`awtrix-light.0.apps.${appName}.icon`, { val: iconMapping[icon] });
            }
        }

        const textState = await getStateAsync(objIdText);
        if (textState && textState.val) {
            await setStateAsync(`awtrix-light.0.apps.${appName}.text`, { val: textState.val });
        }
    } catch (err) {
        console.error(err);
    }
}

on({ id: [objIdIcon, objIdText], change: 'ne' }, refreshExpertApp);

// Init on startup
refreshExpertApp();
```

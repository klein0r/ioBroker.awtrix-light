![Logo](../../admin/awtrix-light.png)

# ioBroker.awtrix-light

## Wetter-App (Experten-App)

Dieses Script zeigt in einer Experten-App das richtige Icon zur aktuellen Wetterlage an. Dafür findet ein Mapping der Icons von [ioBroker.openweathermap](https://github.com/ioBroker/ioBroker.openweathermap/tree/master) zu Icons auf dem Gerät statt.

*Danke an Andy200877 aus dem ioBroker-Forum für die Idee.*

### Icons

Lade die folgenden Icons über die Weboberfläche auf das Gerät:

- `11201` (01d clear sky) - klarer Himmel Tag
- `52163` (01n clear sky) - klarer Himmel Nacht
- `22315` (02d few clouds) - ein paar Wolken Tag (11-25% Wolken)
- `26088` (02n few clouds) - ein paar Wolken Nacht (11-25% Wolken)
- `22378` (03d scattered clouds) - aufgelockerte Bewölkung Tag (25-50% Wolken)
- `21907` (03n scattered clouds) - aufgelockerte Bewölkung Nacht (25-50% Wolken)
- `60742` (04d broken clouds) - bewölkt Tag (51-100%)
- `52159` (04n broken clouds) - bewölkt Nacht (51-100%)
- `43706` (09d shower rain) - Regenschauer Tag
- `43739` (09n shower rain) - Regenschauer Nacht
- `22257` (10d rain) - Regen Tag
- `   72` (10n rain) - Regen Nacht
- `43733` (11d thunderstorm) - Gewitter Tag
- `43748` (11n thunderstorm) - Gewitter Nacht
- `43732` (13d snow) - Schnee Tag
- `26090` (13n snow) - Schnee Nacht
- `43708` (50d mist) - Nebel Tag
- `43741` (50n mist) - Nebel Nacht

### Neue Experten-App

Erstellt eine neue Experten-App mit dem Namen `weather`.

### Script

```javascript
// v0.3
const displayTemp = true;

const appName = 'weather';
const objIdIcon = 'openweathermap.0.forecast.current.icon';
const objIdText = 'openweathermap.0.forecast.current.state';
const objIdTemp = 'openweathermap.0.forecast.current.temperature';

const iconMapping = {
    '01d': '11201', // clear sky day
    '01n': '52163', // clear sky night
    '02d': '22315', // few clouds day
    '02n': '26088', // few clouds night
    '03d': '22378', // scattered clouds day
    '03n': '21907', // scattered clouds night
    '04d': '60742', // broken clouds day
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
        if (iconState && iconState.ack && iconState.val) {
            const icon = /([0-9]{2}[d|n]{1})/.exec(iconState.val)[0];
            if (iconMapping[icon]) {
                await setStateAsync(`awtrix-light.0.apps.${appName}.icon`, { val: iconMapping[icon] });
            }
        }

        let temp = 0;
        const tempState = await getStateAsync(objIdTemp);
        if (tempState && tempState.ack && tempState.val) {
            temp = tempState.val;
        }

        if (temp > 30) {
            await setStateAsync(`awtrix-light.0.apps.${appName}.textColor`, { val: '#bd2020' });
        } else if (temp < 0) {
            await setStateAsync(`awtrix-light.0.apps.${appName}.textColor`, { val: '#236fd9' });
        } else {
            await setStateAsync(`awtrix-light.0.apps.${appName}.textColor`, { val: '#ffffff' });
        }

        const textState = await getStateAsync(objIdText);
        if (textState && textState.ack && textState.val) {
            if (displayTemp) {
                await setStateAsync(`awtrix-light.0.apps.${appName}.text`, { val: `${textState.val} - ${formatValue(temp, 2)} °C` });
            } else {
                await setStateAsync(`awtrix-light.0.apps.${appName}.text`, { val: textState.val });
            }
        }
    } catch (err) {
        console.error(err);
    }
}

on({ id: [objIdIcon, objIdText, objIdTemp], change: 'ne' }, refreshExpertApp);

// Init on startup
refreshExpertApp();
```

![Logo](../../admin/awtrix-light.png)

# ioBroker.awtrix-light

## Anforderungen

- nodejs 20 (oder neuer)
- js-controller 6.0.0 (oder neuer)
- Admin Adapter 7.4.10 (oder neuer)
- _Awtrix 3_ Gerät mit Firmware-Version _0.98_ (oder neuer) - z.B. Ulanzi TC001

Hier kaufen: [Aliexpress.com](https://haus-auto.com/p/ali/UlanziTC001) oder hier: [ulanzi.de](https://haus-auto.com/p/ula/UlanziTC001) (Affiliate-Links)

## Erste Schritte

1. Flashe die Firmware auf das Gerät und füge es zu deinem lokalen Netzwerk per WLAN hinzu - siehe [Dokumentation](https://blueforcer.github.io/awtrix3/#/quickstart)
2. Installiere den awtrix-light Adapter im ioBroker (und erstelle eine neue Instanz)
3. Öffne die Instanz-Konfiguration und hinterlege die IP-Adresse des Gerätes im lokalen Netzwerk

## FAQ (häufig gestellte Fragen)

**Kann ich den Adapter verwenden, um die Standard-Apps zu deaktivieren (wie den Batteriestand oder die Sensordaten)?**

Nein, dieses Feature wurde in der awtrix-light Firmware mittlerweile entfernt. Nutze das Menu auf dem Gerät selbst um diese Apps dauerhaft zu verstecken.

**Kann man Logikwerte (true/false) mit anderen Texten ersetzen?**

Erstelle dafür einfach einen Alias in `alias.0` vom Typ `string` (Zeichenkette) und konvertiere den Logikwert mit einer Lesefunktion in einen beliebigen anderen Wert (beispielsweise `val ? 'offen' : 'geschlossen'`). *Das ist ein Standard-Feature vom ioBroker und hat nichts direkt mit diesem Adapter zu tun.*

**Wie kann ich zur aktuellsten Firmware-Version wechseln?**

Nutze einfach das [Menu auf dem Gerät](https://blueforcer.github.io/awtrix3/#/onscreen) um zum Punkt `update` zu navigieren. Den Rest erledigt die Uhr dann selbst. Es ist nicht nötig, den Web-Flasher erneut zu verwenden (außer, ein Firware-Update erfordert dies explizit).

**Das Gerät wird heiß während es geladen wird.**

Das Hardware-Design ist leider nicht optimal. Es wird empfohlen, ein möglichst schwaches Netzteil zu verwenden, welches maximal 1A liefern kann.

**Kann man den Akku aus dem Gerät entfernen?**

Ja, es gibt diese Möglichkeit. Allerdings muss das Gerät dazu mit einem Heißluftföhn geöffnet werden, da die Frontscheibe verklebt ist. Außerdem ist es nötig einen [Step-Down-Converter zu verlöten](https://github.com/Blueforcer/awtrix3/issues/67#issuecomment-1595418765), damit alles funktioniert.

**Kann man die Apps auf dem Gerät anders sortieren?**

Im Standard werden die Apps in die gleichen Reihenfolge angezeigt, wie sie auch in den Instanz-Einstellungen angelegt wurden. Bewege einfach die Apps nach oben oder unten um die Position zu verändern. Apps mit historischen Daten / Graphen sind dabei hinter den anderen benutzerdefinierten Apps positioniert.

Sollen eigene Positionen festgelegt werden, können die benutzerdefinierten Positionen in den Experten-Optionen aktiviert werden. Danach ist es möglich, für jede App eine numerische Position zu vergeben.

**Kann ein anderes Zahlenformat hinterlegt werden?**

Alle Zustände vom Typ Zahl (common.type `number`) werden so formatiert, wie es im ioBroker konfiguriert ist. Das Standard-Format des Systems kann mit einer Experten-Einstellung überschrieben werden (seit Adapter-Version 0.7.1). Zahlen können in den folgenden Formaten dargestellt werden:

- System-Standard
- `xx.xxx,xx`
- `xx,xxx.xx` (US-Format)
- `xxxxx,xx`
- `xxxxx.xx` (US-Format)

**Kann man den Zugriff auf die Weboberfläche der awtrix-light beschränken?**

Ja, seit Firware-Version 0.82 kann der Zugriff mit einem Benutzernamen und Passwort geschützt werden. Seit Adapter-Version 0.8.0 können diese Benutzerdaten ebenfalls in den Instanz-Einstellungen hinterlegt werden.

**Wie funktioniert die halten-Option bei Benachrichtigungen?**

Wenn eine Benachrichtigung mit der Option `hold: true` gesendet wird, bleibt der Text auf dem Display so lange stehen, bis die Benachrichtigung bestätigt wird. Das kann entweder über den mittleren Taster auf dem Gerät passieren, oder indem der Zustand `notification.dismiss` auf `true` gesetzt wird.

**Einige Zustandsänderungen werden nich sofort dargestellt.**

Falls ein Zustand sehr oft geändert wird (z.B. jede Sekunde), werden einige Änderungen ignoriert und nicht übertragen, damit die Last auf dem Gerät gering gehalten wird. Dafür hat jede App eine eigene "Block-Zeit", welche global in den Instanz-Einstellungen konfiguriert werden kann. Die Standard-Zeit ist 3 Sekunden. Es ist nicht empfohlen, ein Wert kleiner als 3 zu setzen.

## Identische Apps auf mehreren Geräten

Falls mehrere awtrix-light Geräte mit den gleichen Apps angesteuert werden sollen, **muss eine eigene Instanz für jedes Gerät angelegt werden.** Allerdings kann in den Instanzeinstellungen der weiteren Geräte dann festgelegt werden, dass die Apps aus einer anderen Instanz übernommen werden sollen.

Beispiel

1. Konfiguriere alle gewünschten Apps in der Instanz `awtrix-light.0`
2. Lege eine weitere Instanz für das zweite Gerät an (`awtrix-light.1`)
3. Wähle `awtrix-light.0` in den Instanz-Einstellungen von `awtrix-light.1` um die gleichen Apps auf dem zweiten Gerät darzustellen

Seit Version 0.15.0 (und neuer) wird die Sichtbarkeit von benutzerdefinierten Apps und alle Inhalte der Experten-Apps auch auf andere Geräte übertragen, welche die App-Einstellungen kopieren. Im Beispiel oben werden z.B. die Apps der Instanz `awtrix-light.1` ebenfalls versteckt, sobald die Sichtbarkeit der App in der Hauptinstanz `awtrix-light.0` geändert wird. Das gleiche gilt für alle Inhalte der Experten-Apps.

## Blockly und JavaScript

`sendTo` / messagebox kann genutzt werden um

- eine einmalige Notification / Benachrichtigung darzustellen (mit Text, Ton, Symbol, ...)
- einen Ton abzuspielen

### Benachrichtigungen

Sende eine einmalige Benachrichtigung an das Gerät:

```javascript
sendTo('awtrix-light.0', 'notification', { text: 'haus-automatisierung.com', repeat: 1, stack: true, wakeup: true, hold: false }, (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

Das Nachrichten-Objekt unterstützt dabei alle Optionen, welche in der Firmware verfügbar sind. Siehe [Dokumentation](https://blueforcer.github.io/awtrix3/#/api?id=json-properties) für Details.

*Außerdem kann ein Blockly-Block verwendet werden um die Benachrichtigung zu erstellen (dort werden nicht alle verfügbaren Optionen angeboten).*

### Töne

**Die Sound-Dateien müssen im RTTTL-Format im Ordner MELODIES abgelegt werden. Die Dateiendung für diese Sounds ist .txt. Beim Abspielen der Sounds darf die Dateiendung nicht mit übergeben werden!**

Um eine (vorher angelegte) Ton-Datei `beispiel.txt` abzuspielen:

```javascript
sendTo('awtrix-light.0', 'sound', { sound: 'beispiel' }, (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

Das Nachrichten-Objekt unterstützt dabei alle Optionen, welche in der Firmware verfügbar sind. Siehe [Dokumentation](https://blueforcer.github.io/awtrix3/#/api?id=sound-playback) für Details.

*Es kann ein Blockly-Block verwendet werden, um diesen Aufruf noch einfacher zu verwenden.*

Um einen eigenen Klingelton abzuspielen:

```javascript
sendTo('awtrix-light.0', 'rtttl', 'Beep: d=32,o=7,b=120: a,P,c#', (res) => {
    if (res && res.error) {
        console.error(res.error);
    }
});
```

## Apps

**App-Namen dürfen nur Kleinbuchstaben (a-z) enthalten und müssen eindeutig sein. Keine Zahlen, keine Sonderzeichen, keine Leerzeichen.**

Die folgenden App-Namen sind von den internen apps reserviert und können nicht verwendet werden: `Time`, `Date`, `Temperature`, `Humidity`, `Battery`.

- Mit dem `activate`-Zustand jeder App kann diese in den Vordergrund geholt werden
- Diese Zustände haben die Rolle `button` und erlauben nur den boolschen Wert `true` (andere Werte führen zu einer Warnung im Log)

Jede selbst angelegte App hat einen Zustand mit der ID `apps.<name>.visible`. Wenn dieser Zustand auf `false` (falsch) gesetzt wird, wird die App vom Gerät entfernt und nicht mehr dargestellt. Dies ist nützlich, um bestimmte Apps z.B. nur tagsüber oder in bestimmten Zeiträumen darzustellen.

### Benutzerdefinierte Apps

- `%s` ist ein Platzhalter für den Zustands-Wert
- `%u` ist ein Platzhalter für die Einheit des Zustandes (z.B. `°C`)

Diese Platzhalter können in den Texten benutzerdefinierter Apps verwendet werden (z.B. `Außentemperatur: %s %u`).

**Benutzerdefinierte Apps stelle nur bestätigte Werte dar! Steuere-Werte mit `ack: false` werden ignoriert (um doppelte Anfragen an das Gerät zu vermeiden und um sicherzustellen, dass die dargestellten Werte gültig sind)!**

Der ausgewählte Zustand sollte vom Datentyp Zeichenkette `string` oder Zahl `number` sein. Andere Typen (wie `boolean`) werden auch unterstützt, aber generieren Warnungen. Es wird empfohlen, einen Alias mit einer Konvertierungsfunktion zu verwenden um Logikwerte mit Text zu ersetzen (z.B. `val ? 'an' : 'aus'` oder `val ? 'offen' : 'geschlossen'`). Siehe ioBroker-Dokumentation für Details. *Dieses Standard-Feature hat nichts mit dem Adapter zu tun.*

Die folgenden Kombinationen führen zu einer Warnung im Log:

- Eine benutzerdefinierte App mit einer gewählten Objekt-ID enthält nicht den Platzhalter `%s` im Text
- Eine benutzerdefinierte App wird mit einer gewählten Objekt-ID ohne Einheit in `common.unit` angelegt, aber `%u` ist im Text enthalten
- Es wird keine Objekt-ID ausgewählt, aber `%s` im Text verwendet

### Historische Apps / Graphen

TODO

**In den Graphen werden nur bestätigte Werte dargestellt. Steuere-Werte mit `ack: false` werden gefiltert und ignoriert!**

### Experten Apps

Experten-Apps sind seit Adapter-Version 0.10.0 verfügbar. Diese Apps erlauben es, alle Werte manuell über Zustände zu setzen und diese mit eigenen Logiken zu steuern. Um eine neue Experten-App zu erstellen:

- Öffne das Tab Expertenoptionen in den Instanz-Einstellungen
- Erstelle eine neue Experten-App mit einem frei wählbaren Namen (z.B. `test`)
- Speichere die Instanz-Einstellungen

Danach werden alle steuerbaren Zustände der App `test` unter `awtrix-light.0.apps.test` erstellt. Um die jeweiligen Werte einer App zu verändern, kann einfach der Wert der Zustände `icon`, `text`, usw. mit eigenen Scripts (z.B. JavaScript oder Blockly) gesetzt werden.

Beispiel: [Wetter-App](weather-app.md)

#### Basisobjekte

*Benötigt Adapter-Version 2.0.0 (und neuer)*

Das Basisobjekt ist eine grundlegende Definition für eine Awtrix-App, um alle existierenden Optionen setzen zu können. *Das Basisobjekt wird mit allen anderen Attributen der Experten-App erweitert.*

Beispiel: Du möchtest den Regenbogen-Effekt auf der Experten-App nutzen, aber es existiert kein vordefiniter Datenpunkt, um diese Funktion direkt zu nutzen. In diesem Fall kann das Attribut im Basis-Objekt definiert werden (als JSON): `{ "rainbow": true }`.

Siehe [Dokumentation](https://blueforcer.github.io/awtrix3/#/api?id=custom-apps-and-notifications) für alle verfügbaren Attribute.

## Native Apps verstecken

Um die Standard-Apps auf dem Gerät zu verstecken (wie die Temperatur oder die Luftfeuchtigkeit): Nutze das Menu auf dem Gerät selbst! Siehe [Dokumentation](https://blueforcer.github.io/awtrix3/#/onscreen) für Details.

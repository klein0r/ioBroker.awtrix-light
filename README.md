![Logo](admin/awtrix-light.png)

# ioBroker.awtrix-light

[![NPM version](https://img.shields.io/npm/v/iobroker.awtrix-light?style=flat-square)](https://www.npmjs.com/package/iobroker.awtrix-light)
[![Downloads](https://img.shields.io/npm/dm/iobroker.awtrix-light?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/iobroker.awtrix-light)
![node-lts](https://img.shields.io/node/v-lts/iobroker.awtrix-light?style=flat-square)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/iobroker.awtrix-light?label=npm%20dependencies&style=flat-square)

![GitHub](https://img.shields.io/github/license/klein0r/iobroker.awtrix-light?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/klein0r/iobroker.awtrix-light/test-and-release.yml?branch=master&logo=github&style=flat-square)

## Versions

![Beta](https://img.shields.io/npm/v/iobroker.awtrix-light.svg?color=red&label=beta)
![Stable](http://iobroker.live/badges/awtrix-light-stable.svg)
![Installed](http://iobroker.live/badges/awtrix-light-installed.svg)

Integrate your [Awtrix Light](https://github.com/Blueforcer/awtrix-light) device (e.g. Ulanzi TC001) via HTTP

Buy here: [Aliexpress.com](https://haus-auto.com/p/ali/UlanziTC001) or here: [ulanzi.de](https://haus-auto.com/p/ula/UlanziTC001) (Affiliate-Links)

## Sponsored by

[![ioBroker Master Kurs](https://haus-automatisierung.com/images/ads/ioBroker-Kurs.png)](https://haus-automatisierung.com/iobroker-kurs/?refid=iobroker-awtrix-light)

## Documentation

[🇺🇸 Documentation](./docs/en/README.md)

[🇩🇪 Dokumentation](./docs/de/README.md)

## Changelog
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**

NodeJS 16.x is required

* (klein0r) Fixed hidden apps
* (klein0r) Fixed color conversions of settings

### 0.9.0 (2023-10-01)

Updated recommended firmware version to 0.88

* (klein0r) Added expert apps
* (klein0r) Use the last value of fast refreshing states
* (klein0r) Added settings for calendar colors
* (klein0r) Allow to use apps without text (just background effect)
* (AlCalzone) Added rtttl api endpoint support (via sendTo)
* (klein0r) Native apps have been renamed

### 0.8.0 (2023-09-04)

Updated recommended firmware version to 0.83

* (klein0r) Allow to set custom app positions (expert options)
* (klein0r) Unsubscribe from all states if device is not reachable
* (klein0r) Added options basic auth
* (klein0r) Get background effects via API
* (klein0r) Fixed 0 decimals setting
* (klein0r) Changed log level of some messages
* (klein0r) Added states for transitions

### 0.7.1 (2023-08-09)

* (klein0r) Added option for number format

### 0.7.0 (2023-08-03)

Updated recommended firmware version to 0.72

* (klein0r) Added MovingLine effect
* (klein0r) Added settings for time style and transition effect
* (klein0r) Setting repeat to 1 in blockly notifications

### 0.6.2 (2023-07-30)

* (klein0r) Fixed handling of state cache when object has been changed

## License
MIT License

Copyright (c) 2023 Matthias Kleine <info@haus-automatisierung.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

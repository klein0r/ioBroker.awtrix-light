![Logo](admin/awtrix-light.png)

# ioBroker.awtrix-light

[![NPM version](https://img.shields.io/npm/v/iobroker.awtrix-light?style=flat-square)](https://www.npmjs.com/package/iobroker.awtrix-light)
[![Downloads](https://img.shields.io/npm/dm/iobroker.awtrix-light?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/iobroker.awtrix-light)
![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/iobroker.awtrix-light?label=npm%20vulnerabilities&style=flat-square)
![node-lts](https://img.shields.io/node/v-lts/iobroker.awtrix-light?style=flat-square)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/iobroker.awtrix-light?label=npm%20dependencies&style=flat-square)

![GitHub](https://img.shields.io/github/license/klein0r/iobroker.awtrix-light?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/klein0r/iobroker.awtrix-light?logo=github&style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/klein0r/iobroker.awtrix-light/test-and-release.yml?branch=master&logo=github&style=flat-square)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/klein0r/iobroker.awtrix-light?label=repo%20vulnerabilities&logo=github&style=flat-square)

## Versions

![Beta](https://img.shields.io/npm/v/iobroker.awtrix-light.svg?color=red&label=beta)
![Stable](http://iobroker.live/badges/awtrix-light-stable.svg)
![Installed](http://iobroker.live/badges/awtrix-light-installed.svg)

Integrate your [Awtrix Light](https://github.com/Blueforcer/awtrix-light) device (e.g. Ulanzi TC001) via HTTP

Buy here: [Aliexpress.com](https://haus-auto.com/p/ali/UlanziTC001) or here: [ulanzi.com](https://haus-auto.com/p/ula/UlanziTC001) (Affiliate-Links)

## Sponsored by

[![ioBroker Master Kurs](https://haus-automatisierung.com/images/ads/ioBroker-Kurs.png)](https://haus-automatisierung.com/iobroker-kurs/?refid=iobroker-awtrix-light)

## Installation

Please use the "adapter list" in ioBroker to install a stable version of this adapter. You can also use the CLI to install this adapter:

```
iobroker add awtrix-light
```

## Documentation

[🇺🇸 Documentation](./docs/en/README.md)

[🇩🇪 Dokumentation](./docs/de/README.md)

## Changelog
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**

* (klein0r) Added expert option for HTTP timeout

### 0.0.15 (2023-06-13)

Updated recommended firmware version to 0.69

* (klein0r) Added option to hide own apps via state
* (klein0r) Dropped framerate setting (no longer supported)

### 0.0.14 (2023-06-11)

* (klein0r) Added validator for IP address
* (klein0r) usedRam was renamed to freeRam

### 0.0.13 (2023-06-10)

* (klein0r) Refresh all states when device was offline / not reachable
* (klein0r) Automatically remove history apps (if not updated)
* (klein0r) Improved checks for history data

### 0.0.12 (2023-06-08)

* (klein0r) Added number of decimals to app configuration (for numeric values)
* (klein0r) Added line color of history apps to each table row
* (klein0r) Removed visibility states for native apps (deprecated by firmware)
* (klein0r) Improved logging for history apps
* (klein0r) Added wifi signal strength and used RAM as states

### 0.0.11 (2023-06-07)

* (klein0r) Display history data in apps as charts
* (klein0r) Format number values and limit number of decimals
* (klein0r) Limit app refresh time when state changes (configurable)

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

# Older changes
## 0.6.0 (2023-07-26)

Updated recommended firmware version to 0.71

* (klein0r) Added option for background effects
* (klein0r) Setting default of repeat to 0
* (klein0r) Dropped timer support (removed in firmware 0.71)
* (klein0r) Removed native app "eyes" (removed in firmware 0.71)

## 0.5.1 (2023-07-19)

* (klein0r) Fixed color conversion for svg
* (klein0r) Added support for state type "mixed"
* (klein0r) Improved log messages

## 0.5.0 (2023-07-18)

* (klein0r) Added options to override icon, text color and backgroup color for thresholds
* (klein0r) Added option to download screen content to state (as SVG graphic)
* (klein0r) Draw welcome icon on connection

## 0.4.0 (2023-07-12)

* (klein0r) Allow to import settings from another instance

## 0.3.4 (2023-07-11)

* (klein0r) Use default scroll speed if 0
* (klein0r) Instance selection for history apps

## 0.3.3 (2023-07-07)

* (klein0r) Use default duration if 0

## 0.3.2 (2023-07-06)

* (klein0r) Delete apps on instance stop (configurable)
* (klein0r) Added scrolling speed to settings
* (klein0r) Added block buttons to settings

## 0.3.1 (2023-07-06)

* (klein0r) Some app options were ignored for static text apps

## 0.3.0 (2023-07-05)

Admin adapter in version 6.6.0 is required

* (klein0r) Updated instance configuration (new admin component)
* (klein0r) Added several options for custom apps
* (klein0r) Individual background color for each app

## 0.2.0 (2023-07-03)

* (klein0r) Added default values to blockly blocks
* (klein0r) Remove custom apps when text is empty

## 0.1.2 (2023-06-28)

* (klein0r) Limit the number of history items
* (klein0r) Warn if a connected state has the wrong data type

## 0.1.1 (2023-06-22)

* (klein0r) Improved error handling when device is not reachable

## 0.1.0 (2023-06-16)

* (klein0r) Added rainbow and color to blockly notifications

## 0.0.16 (2023-06-14)

Updated recommended firmware version to 0.70

* (klein0r) Added expert option for HTTP timeout
* (klein0r) Added color settings for native apps

## 0.0.15 (2023-06-13)

Updated recommended firmware version to 0.69

* (klein0r) Added option to hide own apps via state
* (klein0r) Dropped framerate setting (no longer supported)

## 0.0.14 (2023-06-11)

* (klein0r) Added validator for IP address
* (klein0r) usedRam was renamed to freeRam

## 0.0.13 (2023-06-10)

* (klein0r) Refresh all states when device was offline / not reachable
* (klein0r) Automatically remove history apps (if not updated)
* (klein0r) Improved checks for history data

## 0.0.12 (2023-06-08)

* (klein0r) Added number of decimals to app configuration (for numeric values)
* (klein0r) Added line color of history apps to each table row
* (klein0r) Removed visibility states for native apps (deprecated by firmware)
* (klein0r) Improved logging for history apps
* (klein0r) Added wifi signal strength and used RAM as states

## 0.0.11 (2023-06-07)

* (klein0r) Display history data in apps as charts
* (klein0r) Format number values and limit number of decimals
* (klein0r) Limit app refresh time when state changes (configurable)

## 0.0.10 (2023-06-06)

* (klein0r) Automatically delete unknown or old apps
* (klein0r) Added option to play sound via message / blockly

## 0.0.9 (2023-06-06)

Updated recommended firmware version to 0.68

* (klein0r) Added battery, uptime and display states
* (klein0r) Added more settings options
* (klein0r) Color conversion for all rgb settings

## 0.0.8 (2023-06-05)

* (klein0r) Added custom apps via instance configuration

## 0.0.7 (2023-06-04)

* (klein0r) Added timer feature to blockly
* (klein0r) Added color conversion to hex in settings

## 0.0.6 (2023-06-03)

Updated recommended firmware version to 0.67

* (klein0r) Added some settings as states
* (klein0r) Added stack and wakeup option to blockly
* (klein0r) Battery app was hidden when invisible

## 0.0.5 (2023-05-24)

* (klein0r) Added notification support via sendTo / blockly
* (klein0r) Improved error handling

## 0.0.4 (2023-05-19)

* (klein0r) Added indicator support
* (klein0r) Added moodlight support
* (klein0r) Added device update and reboot options

## 0.0.3 (2023-05-16)

* (klein0r) Allow to switch apps via state
* (klein0r) Added more states

## 0.0.2 (2023-05-16)

* (klein0r) Initial release
